import { createHash } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthAuditAction,
  AuthAuditOutcome,
  Prisma,
  ReviewAction,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';

import { AuthContextService } from '../auth/auth-context.service';
import { AuthRateLimitService } from '../auth/auth-rate-limit.service';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { BackgroundJobsService } from '../background-jobs/background-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchIndexService } from '../search/search-index.service';
import { filterReviewHistoryEvents, presentReviewHistoryEvent } from '../shared/review-history';
import { S3StorageService } from '../uploads/s3-storage.service';
import { summarizeUploadProcessingState } from '../uploads/upload-processing-state';
import { UploadProcessingService } from '../uploads/upload-processing.service';
import { UploadsPolicyService } from '../uploads/uploads-policy.service';
import { AuthAuditQueryDto } from './dto/auth-audit-query.dto';
import { AuthSessionQueryDto } from './dto/auth-session-query.dto';
import { ReviewAnalyticsQueryDto } from './dto/review-analytics-query.dto';
import { ReviewDecisionDto, ReviewDecisionIssueDto } from './dto/review-decision.dto';
import { ReviewHistoryQueryDto } from './dto/review-history-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly authRateLimitService: AuthRateLimitService,
    private readonly backgroundJobs: BackgroundJobsService,
    private readonly searchIndex: SearchIndexService,
    private readonly uploadProcessingService: UploadProcessingService,
    private readonly uploadsPolicy: UploadsPolicyService,
    private readonly storageService: S3StorageService,
  ) {}

  async listAuthAuditEvents(request: AuthenticatedRequest, query: AuthAuditQueryDto) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.AuthAuditEventWhereInput = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.outcome) {
      where.outcome = query.outcome;
    }

    if (query.email) {
      where.email = {
        contains: query.email.trim().toLowerCase(),
        mode: 'insensitive',
      };
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    const [total, events] = await Promise.all([
      this.prisma.authAuditEvent.count({ where }),
      this.prisma.authAuditEvent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          outcome: true,
          email: true,
          ipHash: true,
          userAgentHash: true,
          metadataJson: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items: events.map((event) => ({
        id: event.id,
        action: event.action,
        outcome: event.outcome,
        email: event.email,
        ipHash: event.ipHash,
        userAgentHash: event.userAgentHash,
        metadata: event.metadataJson,
        createdAt: event.createdAt,
        user: event.user,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    };
  }

  async getAuthAuditSummary(request: AuthenticatedRequest) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalEvents, recentEvents24h, recentEvents7d, byOutcome7d, byAction7d] =
      await Promise.all([
        this.prisma.authAuditEvent.count(),
        this.prisma.authAuditEvent.count({
          where: {
            createdAt: {
              gte: last24Hours,
            },
          },
        }),
        this.prisma.authAuditEvent.count({
          where: {
            createdAt: {
              gte: last7Days,
            },
          },
        }),
        this.prisma.authAuditEvent.groupBy({
          by: ['outcome'],
          where: {
            createdAt: {
              gte: last7Days,
            },
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.authAuditEvent.groupBy({
          by: ['action'],
          where: {
            createdAt: {
              gte: last7Days,
            },
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    const outcomeCounts = this.initializeEnumCounts(AuthAuditOutcome);
    const actionCounts = this.initializeEnumCounts(AuthAuditAction);

    byOutcome7d.forEach((entry) => {
      outcomeCounts[entry.outcome] = entry._count._all;
    });

    byAction7d.forEach((entry) => {
      actionCounts[entry.action] = entry._count._all;
    });

    return {
      totals: {
        allTime: totalEvents,
        last24h: recentEvents24h,
        last7d: recentEvents7d,
      },
      outcomesLast7d: outcomeCounts,
      actionsLast7d: actionCounts,
    };
  }

  async listAuthSessions(request: AuthenticatedRequest, query: AuthSessionQueryDto) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const status = query.status ?? 'active';
    const now = new Date();
    const where: Prisma.RefreshSessionWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.email) {
      where.user = {
        email: {
          contains: query.email.trim().toLowerCase(),
          mode: 'insensitive',
        },
      };
    }

    if (status === 'active') {
      where.revokedAt = null;
      where.expiresAt = {
        gt: now,
      };
    } else if (status === 'revoked') {
      where.revokedAt = {
        not: null,
      };
    } else if (status === 'expired') {
      where.revokedAt = null;
      where.expiresAt = {
        lte: now,
      };
    }

    const [total, sessions] = await Promise.all([
      this.prisma.refreshSession.count({ where }),
      this.prisma.refreshSession.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          expiresAt: true,
          revokedAt: true,
          replacedBySessionId: true,
          createdByIpHash: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items: sessions.map((session) => ({
        id: session.id,
        status: this.getRefreshSessionStatus(session, now),
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        replacedBySessionId: session.replacedBySessionId,
        createdByIpHash: session.createdByIpHash,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        user: session.user,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    };
  }

  async revokeAuthSession(request: AuthenticatedRequest, sessionId: string) {
    const actor = await this.authContext.requireUserFromRequest(request, [
      UserRole.admin,
      UserRole.reviewer,
    ]);
    const session = await this.prisma.refreshSession.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Refresh session not found');
    }

    const revokedAt = session.revokedAt ?? new Date();

    if (!session.revokedAt) {
      await this.prisma.refreshSession.update({
        where: {
          id: session.id,
        },
        data: {
          revokedAt,
        },
      });
    }

    await this.recordAuthAuditEvent({
      request,
      action: 'auth_session_revoke',
      outcome: 'success',
      userId: session.user.id,
      email: session.user.email,
      metadataJson: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        sessionId: session.id,
        alreadyRevoked: Boolean(session.revokedAt),
        targetUserRole: session.user.role,
      },
    });

    return {
      sessionId: session.id,
      status: this.getRefreshSessionStatus(
        {
          ...session,
          revokedAt,
        },
        new Date(),
      ),
      revokedAt,
      alreadyRevoked: Boolean(session.revokedAt),
      revokedBy: {
        id: actor.id,
        email: actor.email,
        role: actor.role,
      },
      user: session.user,
    };
  }

  async revokeUserAuthSessions(request: AuthenticatedRequest, userId: string) {
    const actor = await this.authContext.requireUserFromRequest(request, [
      UserRole.admin,
      UserRole.reviewer,
    ]);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const revokedAt = new Date();
    const result = await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: revokedAt,
        },
      },
      data: {
        revokedAt,
      },
    });

    await this.recordAuthAuditEvent({
      request,
      action: 'auth_user_sessions_revoke',
      outcome: 'success',
      userId: user.id,
      email: user.email,
      metadataJson: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        revokedSessionCount: result.count,
        targetUserRole: user.role,
      },
    });

    return {
      user,
      revokedSessionCount: result.count,
      revokedAt,
      revokedBy: {
        id: actor.id,
        email: actor.email,
        role: actor.role,
      },
    };
  }

  async getUserLoginLockout(request: AuthenticatedRequest, userId: string) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const lockout = await this.authRateLimitService.getLockout('login-email', user.email);

    return {
      user,
      loginLockout: {
        locked: lockout.locked,
        retryAfterSeconds: lockout.retryAfterSeconds,
      },
    };
  }

  async clearUserLoginLockout(request: AuthenticatedRequest, userId: string) {
    const actor = await this.authContext.requireUserFromRequest(request, [
      UserRole.admin,
      UserRole.reviewer,
    ]);
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const before = await this.authRateLimitService.getLockout('login-email', user.email);
    await this.authRateLimitService.clearScopeState('login-email', user.email);
    const after = await this.authRateLimitService.getLockout('login-email', user.email);

    await this.recordAuthAuditEvent({
      request,
      action: 'login_lockout_clear',
      outcome: 'success',
      userId: user.id,
      email: user.email,
      metadataJson: {
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        beforeLocked: before.locked,
        beforeRetryAfterSeconds: before.retryAfterSeconds,
        afterLocked: after.locked,
        afterRetryAfterSeconds: after.retryAfterSeconds,
        targetUserRole: user.role,
      },
    });

    return {
      user,
      clearedBy: {
        id: actor.id,
        email: actor.email,
        role: actor.role,
      },
      before: {
        locked: before.locked,
        retryAfterSeconds: before.retryAfterSeconds,
      },
      after: {
        locked: after.locked,
        retryAfterSeconds: after.retryAfterSeconds,
      },
      clearedAt: new Date(),
    };
  }

  async listReviewQueue(request: AuthenticatedRequest, status?: string) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const where: Prisma.SubmissionWhereInput = status
      ? { status: status as SubmissionStatus }
      : { status: { in: ['needs_review', 'processing_failed', 'changes_requested'] } };

    const submissions = await this.prisma.submission.findMany({
      where,
      orderBy: [{ submittedAt: 'asc' }, { updatedAt: 'asc' }],
      select: {
        id: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
            nameAm: true,
            publisher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        declaredLicense: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        uploads: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.SubmissionFindManyArgs);

    return submissions.map((submission) => ({
      submissionId: submission.id,
      familyId: submission.family.id,
      slug: submission.family.slug,
      name: {
        en: submission.family.nameEn,
        am: submission.family.nameAm,
      },
      status: submission.status,
      publisher: submission.family.publisher,
      submittedBy: submission.owner,
      declaredLicense: submission.declaredLicense,
      fileCount: submission.uploads.length,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    }));
  }

  async getReviewSummary(request: AuthenticatedRequest) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [needsReview, processingFailed, changesRequested, approved7d, rejected7d] =
      await Promise.all([
        this.prisma.submission.count({ where: { status: 'needs_review' } }),
        this.prisma.submission.count({ where: { status: 'processing_failed' } }),
        this.prisma.submission.count({ where: { status: 'changes_requested' } }),
        this.prisma.submission.count({
          where: {
            status: 'approved',
            reviewedAt: {
              gte: sevenDaysAgo,
            },
          },
        }),
        this.prisma.submission.count({
          where: {
            status: 'rejected',
            reviewedAt: {
              gte: sevenDaysAgo,
            },
          },
        }),
      ]);

    return {
      counts: {
        needsReview,
        processingFailed,
        changesRequested,
        approved7d,
        rejected7d,
      },
    };
  }

  async getReviewAnalytics(request: AuthenticatedRequest, query: ReviewAnalyticsQueryDto) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid analytics date range');
    }

    if (from > to) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }

    const [
      needsReview,
      processingFailed,
      changesRequested,
      eventCounts,
      reviewedSubmissions,
      activityEvents,
      decisionEvents,
    ] =
      await Promise.all([
        this.prisma.submission.count({ where: { status: 'needs_review' } }),
        this.prisma.submission.count({ where: { status: 'processing_failed' } }),
        this.prisma.submission.count({ where: { status: 'changes_requested' } }),
        this.prisma.reviewEvent.groupBy({
          by: ['action'],
          where: {
            createdAt: {
              gte: from,
              lte: to,
            },
            action: {
              in: ['submitted', 'approved', 'rejected', 'request_changes', 'processing_failed', 'reprocessed'],
            },
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.submission.findMany({
          where: {
            reviewedAt: {
              gte: from,
              lte: to,
            },
            submittedAt: {
              not: null,
            },
            status: {
              in: ['approved', 'rejected', 'changes_requested'],
            },
          },
          select: {
            status: true,
            submittedAt: true,
            reviewedAt: true,
            reviewedByUserId: true,
            reviewedBy: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.reviewEvent.findMany({
          where: {
            createdAt: {
              gte: from,
              lte: to,
            },
            action: {
              in: ['submitted', 'approved', 'rejected', 'request_changes', 'processing_failed', 'reprocessed'],
            },
          },
          select: {
            id: true,
            action: true,
            notes: true,
            metadataJson: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        }),
        this.prisma.reviewEvent.findMany({
          where: {
            createdAt: {
              gte: from,
              lte: to,
            },
            action: {
              in: ['approved', 'rejected', 'request_changes'],
            },
            actorUserId: {
              not: null,
            },
          },
          select: {
            action: true,
            createdAt: true,
            actorUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        }),
      ]);

    const actionCounts = this.initializeEnumCounts(ReviewAction);

    eventCounts.forEach((entry) => {
      actionCounts[entry.action] = entry._count._all;
    });

    const turnaroundHours = reviewedSubmissions
      .map((submission) => {
        if (!submission.submittedAt || !submission.reviewedAt) {
          return null;
        }

        return {
          status: submission.status,
          hours:
            (submission.reviewedAt.getTime() - submission.submittedAt.getTime()) / (60 * 60 * 1000),
        };
      })
      .filter((submission): submission is { status: SubmissionStatus; hours: number } => Boolean(submission));

    const reviewerStats = new Map<
      string,
      {
        reviewer: {
          id: string;
          displayName: string;
          email: string;
          role: UserRole;
        };
        decisionCounts: {
          approved: number;
          rejected: number;
          requestChanges: number;
        };
        reviewedSubmissionCount: number;
        latestDecisionAt: Date | null;
        turnaroundHours: number[];
      }
    >();

    const issueCounts = new Map<string, number>();
    const dailyActivity = new Map<string, ReturnType<AdminService['createEmptyReviewActionCountBucket']>>();

    activityEvents.forEach((event) => {
      const presented = presentReviewHistoryEvent({
        id: event.id,
        action: event.action,
        notes: event.notes,
        metadataJson: event.metadataJson,
        createdAt: event.createdAt,
        actor: null,
      });
      const dayKey = this.formatAnalyticsDay(event.createdAt, query.timezone);
      const bucket = dailyActivity.get(dayKey) ?? this.createEmptyReviewActionCountBucket();
      bucket[event.action] = (bucket[event.action] ?? 0) + 1;
      dailyActivity.set(dayKey, bucket);

      const issueCodes =
        presented.issues.length > 0
          ? presented.issues.map((issue) => issue.issueCode).filter((value): value is string => Boolean(value))
          : presented.issueCode
            ? [presented.issueCode]
            : [];

      issueCodes.forEach((issueCode) => {
        issueCounts.set(issueCode, (issueCounts.get(issueCode) ?? 0) + 1);
      });
    });

    decisionEvents.forEach((event) => {
      if (!event.actorUser) {
        return;
      }

      const entry = reviewerStats.get(event.actorUser.id) ?? {
        reviewer: {
          id: event.actorUser.id,
          displayName: event.actorUser.displayName,
          email: event.actorUser.email,
          role: event.actorUser.role,
        },
        decisionCounts: {
          approved: 0,
          rejected: 0,
          requestChanges: 0,
        },
        reviewedSubmissionCount: 0,
        latestDecisionAt: null,
        turnaroundHours: [],
      };

      if (event.action === 'approved') {
        entry.decisionCounts.approved += 1;
      } else if (event.action === 'rejected') {
        entry.decisionCounts.rejected += 1;
      } else if (event.action === 'request_changes') {
        entry.decisionCounts.requestChanges += 1;
      }

      if (!entry.latestDecisionAt || entry.latestDecisionAt < event.createdAt) {
        entry.latestDecisionAt = event.createdAt;
      }

      reviewerStats.set(event.actorUser.id, entry);
    });

    reviewedSubmissions.forEach((submission) => {
      if (!submission.reviewedByUserId || !submission.reviewedBy || !submission.submittedAt || !submission.reviewedAt) {
        return;
      }

      const entry = reviewerStats.get(submission.reviewedByUserId) ?? {
        reviewer: {
          id: submission.reviewedBy.id,
          displayName: submission.reviewedBy.displayName,
          email: submission.reviewedBy.email,
          role: submission.reviewedBy.role,
        },
        decisionCounts: {
          approved: 0,
          rejected: 0,
          requestChanges: 0,
        },
        reviewedSubmissionCount: 0,
        latestDecisionAt: submission.reviewedAt,
        turnaroundHours: [],
      };

      entry.reviewedSubmissionCount += 1;
      entry.turnaroundHours.push(
        (submission.reviewedAt.getTime() - submission.submittedAt.getTime()) / (60 * 60 * 1000),
      );

      if (!entry.latestDecisionAt || entry.latestDecisionAt < submission.reviewedAt) {
        entry.latestDecisionAt = submission.reviewedAt;
      }

      reviewerStats.set(submission.reviewedByUserId, entry);
    });

    return {
      filters: {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: query.timezone ?? 'UTC',
      },
      queue: {
        needsReview,
        processingFailed,
        changesRequested,
      },
      totals: {
        submitted: actionCounts.submitted,
        approved: actionCounts.approved,
        rejected: actionCounts.rejected,
        requestChanges: actionCounts.request_changes,
        processingFailed: actionCounts.processing_failed,
        reprocessed: actionCounts.reprocessed,
      },
      turnaround: {
        reviewedSubmissionCount: turnaroundHours.length,
        averageHours:
          turnaroundHours.length > 0
            ? Number(
                (
                  turnaroundHours.reduce((sum, item) => sum + item.hours, 0) / turnaroundHours.length
                ).toFixed(2),
              )
            : null,
        averageHoursByDecision: ['approved', 'rejected', 'changes_requested'].reduce<
          Record<string, number | null>
        >((accumulator, status) => {
          const matching = turnaroundHours.filter((item) => item.status === status);
          accumulator[status] =
            matching.length > 0
              ? Number((matching.reduce((sum, item) => sum + item.hours, 0) / matching.length).toFixed(2))
              : null;
          return accumulator;
        }, {}),
      },
      topIssueCodes: [...issueCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 10)
        .map(([issueCode, count]) => ({
          issueCode,
          count,
        })),
      reviewerBreakdown: [...reviewerStats.values()]
        .sort((left, right) => {
          const rightTotal =
            right.decisionCounts.approved + right.decisionCounts.rejected + right.decisionCounts.requestChanges;
          const leftTotal =
            left.decisionCounts.approved + left.decisionCounts.rejected + left.decisionCounts.requestChanges;

          if (rightTotal !== leftTotal) {
            return rightTotal - leftTotal;
          }

          return left.reviewer.email.localeCompare(right.reviewer.email);
        })
        .map((entry) => ({
          reviewer: entry.reviewer,
          decisionCounts: entry.decisionCounts,
          reviewedSubmissionCount: entry.reviewedSubmissionCount,
          averageTurnaroundHours:
            entry.turnaroundHours.length > 0
              ? Number(
                  (
                    entry.turnaroundHours.reduce((sum, value) => sum + value, 0) /
                    entry.turnaroundHours.length
                  ).toFixed(2),
                )
              : null,
          latestDecisionAt: entry.latestDecisionAt,
        })),
      dailyActivity: [...dailyActivity.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, counts]) => ({
          date,
          counts,
        })),
    };
  }

  async getReviewDetail(request: AuthenticatedRequest, submissionId: string) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
            legalFullName: true,
            countryCode: true,
            organizationName: true,
            phoneNumber: true,
          },
        },
        family: {
          select: {
            id: true,
            slug: true,
            status: true,
            nameEn: true,
            nameAm: true,
            descriptionEn: true,
            descriptionAm: true,
            script: true,
            primaryLanguage: true,
            supportsEthiopic: true,
            supportsLatin: true,
            publishedAt: true,
            publisher: {
              select: {
                id: true,
                name: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        declaredLicense: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        uploads: {
          orderBy: {
            uploadedAt: 'asc',
          },
          select: {
            id: true,
            originalFilename: true,
            storageKey: true,
            mimeType: true,
            fileSizeBytes: true,
            sha256: true,
            metadataJson: true,
            processingWarningsJson: true,
            processingError: true,
            processingStatus: true,
            uploadedAt: true,
            processedAt: true,
            uploader: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        reviewEvents: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            action: true,
            notes: true,
            metadataJson: true,
            createdAt: true,
            actorUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const processingStatus = summarizeUploadProcessingState(
      submission.uploads.map((upload) => upload.processingStatus),
    );
    const processingWarnings = submission.uploads.flatMap(
      (upload) => (upload.processingWarningsJson as unknown[] | null) ?? [],
    );
    const blockingIssues = submission.uploads
      .filter((upload) => Boolean(upload.processingError))
      .map((upload) => ({
        uploadId: upload.id,
        message: upload.processingError,
      }));

    return {
      family: {
        id: submission.family.id,
        slug: submission.family.slug,
        status: submission.status,
        name: {
          en: submission.family.nameEn,
          am: submission.family.nameAm,
        },
        description: {
          en: submission.family.descriptionEn,
          am: submission.family.descriptionAm,
        },
        publisher: submission.family.publisher,
        category: submission.family.category,
        script: submission.family.script,
        primaryLanguage: submission.family.primaryLanguage,
        supportsEthiopic: submission.family.supportsEthiopic,
        supportsLatin: submission.family.supportsLatin,
        publishedAt: submission.family.publishedAt,
      },
      submissionId: submission.id,
      submission: {
        submittedBy: submission.owner,
        submittedAt: submission.submittedAt,
        declaredLicense: submission.declaredLicense,
        ownershipEvidence: {
          type: submission.ownershipEvidenceType,
          value: submission.ownershipEvidenceValue,
        },
        contributorAssent: {
          termsVersion: submission.termsVersion,
          acceptedAt: submission.termsAcceptedAt,
          acceptanceName: submission.termsAcceptanceName,
        },
      },
      styles: (
        await this.prisma.fontStyle.findMany({
          where: {
            familyId: submission.familyId,
          },
          orderBy: [{ isDefault: 'desc' }, { weightClass: 'asc' }, { name: 'asc' }],
          select: {
          id: true,
          name: true,
          slug: true,
          weightClass: true,
          weightLabel: true,
          isItalic: true,
          isDefault: true,
          format: true,
            fileSizeBytes: true,
            sha256: true,
            status: true,
          },
        })
      ).map((style) => ({
        ...style,
        fileSizeBytes: Number(style.fileSizeBytes ?? 0n),
      })),
      processing: {
        status: processingStatus,
        warnings: processingWarnings,
        blockingIssues,
      },
      uploads: submission.uploads.map((upload) => ({
        id: upload.id,
        originalFilename: upload.originalFilename,
        storageKey: upload.storageKey,
        mimeType: upload.mimeType,
        fileSizeBytes: Number(upload.fileSizeBytes ?? 0n),
        sha256: upload.sha256,
        metadata: upload.metadataJson,
        warnings: upload.processingWarningsJson ?? [],
        processingError: upload.processingError,
        processingStatus: upload.processingStatus,
        uploadedAt: upload.uploadedAt,
        processedAt: upload.processedAt,
        uploader: upload.uploader,
      })),
      reviewHistory: submission.reviewEvents.map((event) =>
        presentReviewHistoryEvent({
          id: event.id,
          action: event.action,
          notes: event.notes,
          metadataJson: event.metadataJson,
          createdAt: event.createdAt,
          actor: event.actorUser
            ? {
                id: event.actorUser.id,
                displayName: event.actorUser.displayName,
                email: event.actorUser.email,
                role: event.actorUser.role,
              }
            : null,
        }),
      ),
      permissions: {
        canApprove: submission.status === 'needs_review',
        canReject: submission.status === 'needs_review',
        canRequestChanges: submission.status === 'needs_review',
        canReprocess: ['uploaded', 'processing', 'processing_failed', 'ready_for_submission'].includes(
          submission.status,
        ),
      },
    };
  }

  async getReviewHistory(
    request: AuthenticatedRequest,
    submissionId: string,
    query: ReviewHistoryQueryDto,
  ) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      select: {
        id: true,
        familyId: true,
        reviewEvents: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            action: true,
            notes: true,
            metadataJson: true,
            createdAt: true,
            actorUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const events = submission.reviewEvents.map((event) =>
      presentReviewHistoryEvent({
        id: event.id,
        action: event.action,
        notes: event.notes,
        metadataJson: event.metadataJson,
        createdAt: event.createdAt,
        actor: event.actorUser
          ? {
              id: event.actorUser.id,
              displayName: event.actorUser.displayName,
              email: event.actorUser.email,
              role: event.actorUser.role,
            }
          : null,
      }),
    );
    const filtered = filterReviewHistoryEvents(events, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    const summary = {
      total: filtered.length,
      byAction: filtered.reduce<Record<string, number>>((acc, event) => {
        acc[event.action] = (acc[event.action] ?? 0) + 1;
        return acc;
      }, {}),
      byKind: filtered.reduce<Record<string, number>>((acc, event) => {
        acc[event.kind] = (acc[event.kind] ?? 0) + 1;
        return acc;
      }, {}),
    };

    return {
      submissionId: submission.id,
      familyId: submission.familyId,
      filters: {
        action: query.action ?? null,
        kind: query.kind ?? null,
        issueCode: query.issueCode ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
      },
      items,
      summary,
      pagination: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(Math.ceil(filtered.length / pageSize), 1),
      },
    };
  }

  async approveSubmission(
    request: AuthenticatedRequest,
    submissionId: string,
    payload: ReviewDecisionDto,
  ) {
    const actor = await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);
    return this.applyReviewDecision(actor.id, submissionId, 'approved', payload);
  }

  async rejectSubmission(
    request: AuthenticatedRequest,
    submissionId: string,
    payload: ReviewDecisionDto,
  ) {
    const actor = await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);
    return this.applyReviewDecision(actor.id, submissionId, 'rejected', payload);
  }

  async requestChanges(
    request: AuthenticatedRequest,
    submissionId: string,
    payload: ReviewDecisionDto,
  ) {
    const actor = await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    if (!payload.notes?.trim()) {
      throw new BadRequestException('notes are required when requesting changes');
    }

    return this.applyReviewDecision(actor.id, submissionId, 'request_changes', payload);
  }

  async reprocessSubmission(
    request: AuthenticatedRequest,
    submissionId: string,
    notes?: string,
  ) {
    const actor = await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
          },
        },
        uploads: {
          orderBy: {
            uploadedAt: 'asc',
          },
          select: {
            id: true,
            storageKey: true,
            uploader: {
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (!['uploaded', 'processing', 'processing_failed', 'ready_for_submission'].includes(submission.status)) {
      throw new BadRequestException('Submission is not in a reprocessable state');
    }

    const uploadAvailability = await Promise.all(
      submission.uploads.map(async (upload) => ({
        uploadId: upload.id,
        hasRawObject: await this.storageService.rawObjectExists(upload.storageKey),
        uploadedByStaff:
          upload.uploader.role === UserRole.admin || upload.uploader.role === UserRole.reviewer,
      })),
    );
    const reprocessableUploads = uploadAvailability.filter((upload) => upload.hasRawObject);

    if (reprocessableUploads.length === 0) {
      throw new BadRequestException(
        'No reprocessable uploads were found. Replacement upload files are required.',
      );
    }

    const now = new Date();
    const successSubmissionStatus = reprocessableUploads.some((upload) => upload.uploadedByStaff)
      ? 'needs_review'
      : 'ready_for_submission';

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: 'processing',
          lastActionAt: now,
        },
      }),
      this.prisma.reviewEvent.create({
        data: {
          submissionId: submission.id,
          familyId: submission.familyId,
          actorUserId: actor.id,
          action: ReviewAction.reprocessed,
          notes: notes?.trim() || 'Submission reprocessing triggered by staff',
          metadataJson: {
            uploadIds: reprocessableUploads.map((upload) => upload.uploadId),
            skippedUploadIds: uploadAvailability
              .filter((upload) => !upload.hasRawObject)
              .map((upload) => upload.uploadId),
          },
        },
      }),
    ]);

    const results = [];

    for (const upload of reprocessableUploads) {
      results.push(
        await this.uploadProcessingService.processUpload({
          uploadId: upload.uploadId,
          successSubmissionStatus,
          actorUserId: actor.id,
          failureNotesPrefix: 'Staff-triggered font reprocessing failed',
        }),
      );
    }

    const finalSubmission = await this.prisma.submission.findUniqueOrThrow({
      where: {
        id: submission.id,
      },
      select: {
        status: true,
      },
    });

    return {
      submission: {
        id: submission.id,
        status: finalSubmission.status,
        family: submission.family,
      },
      reprocessedUploadCount: reprocessableUploads.length,
      skippedUploadCount: uploadAvailability.length - reprocessableUploads.length,
      uploads: results.map((result) => ({
        id: result.upload.id,
        processingStatus: result.upload.processingStatus,
        styleId: result.upload.styleId,
        processingError: result.upload.processingError ?? null,
      })),
    };
  }

  async directUploadToSubmission(
    request: AuthenticatedRequest,
    submissionId: string,
    file:
      | {
          originalname: string;
          mimetype: string;
          buffer: Buffer;
          size: number;
        }
      | undefined,
    notes?: string,
  ) {
    const actor = await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);

    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        family: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (['approved', 'rejected', 'archived'].includes(submission.status)) {
      throw new BadRequestException('Direct upload is not allowed for the current submission status');
    }

    this.uploadsPolicy.validateDirectUpload({
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    });
    this.uploadsPolicy.assertSubmissionUploadCapacity(
      await this.prisma.upload.count({
        where: {
          submissionId: submission.id,
        },
      }),
    );

    const { uploadId, storageKey } = this.storageService.createRawUploadKey(submission.id, file.originalname);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const now = new Date();

    await this.storageService.putRawObject(storageKey, file.buffer, file.mimetype);

    await this.prisma.$transaction([
      this.prisma.upload.create({
        data: {
          id: uploadId,
          uploaderId: actor.id,
          submissionId: submission.id,
          familyId: submission.familyId,
          originalFilename: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          fileSizeBytes: BigInt(file.size),
          sha256,
          processingStatus: 'queued',
        },
      }),
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: 'processing',
          lastActionAt: now,
        },
      }),
      this.prisma.reviewEvent.create({
        data: {
          submissionId: submission.id,
          familyId: submission.familyId,
          actorUserId: actor.id,
          action: ReviewAction.metadata_updated,
          notes: notes?.trim() || 'Admin uploaded a file directly from local storage',
          metadataJson: {
            uploadId,
            originalFilename: file.originalname,
          },
        },
      }),
    ]);

    const processed = await this.uploadProcessingService.processUpload({
      uploadId,
      successSubmissionStatus: 'needs_review',
      actorUserId: actor.id,
      failureNotesPrefix: 'Admin direct upload failed inspection',
    });

    if (processed.upload.processingStatus === 'failed') {
      throw new BadRequestException(
        `Uploaded file could not be parsed as a font: ${processed.upload.processingError}`,
      );
    }

    return {
      submission: {
        id: submission.id,
        status: processed.submission.status,
        family: submission.family,
      },
      upload: {
        id: processed.upload.id,
        originalFilename: file.originalname,
        storageKey,
        mimeType: processed.upload.mimeType,
        fileSizeBytes: processed.upload.fileSizeBytes,
        sha256: processed.upload.sha256,
        metadata: processed.upload.metadata,
        warnings: processed.upload.warnings,
        styleId: processed.upload.styleId,
      },
    };
  }

  async reindexApprovedFamilies(request: AuthenticatedRequest) {
    await this.authContext.requireUserFromRequest(request, [UserRole.admin, UserRole.reviewer]);
    return this.searchIndex.syncAllApprovedFamilies();
  }

  private async applyReviewDecision(
    actorUserId: string,
    submissionId: string,
    action: 'approved' | 'rejected' | 'request_changes',
    payload: ReviewDecisionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        family: true,
        uploads: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'needs_review') {
      throw new BadRequestException('Submission must be in needs_review before a review decision can be applied');
    }

    if (action !== 'approved' && !payload.notes?.trim()) {
      throw new BadRequestException('notes are required for this decision');
    }

    const normalizedIssues = await this.normalizeReviewDecisionIssues(submission, payload);
    const decisionMetadata =
      normalizedIssues.length > 0
        ? {
            targetUploadId: normalizedIssues[0].targetUploadId,
            targetStyleId: normalizedIssues[0].targetStyleId,
            issueCode: normalizedIssues[0].issueCode,
            issues: normalizedIssues,
          }
        : undefined;

    const now = new Date();
    const nextSubmissionStatus =
      action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'changes_requested';

    const familyUpdate =
      action === 'approved'
        ? {
            status: 'approved' as const,
            licenseId: submission.declaredLicenseId,
            publishedAt: now,
          }
        : {
            status: 'draft' as const,
            publishedAt: null,
          };

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          status: nextSubmissionStatus,
          reviewedAt: now,
          reviewedByUserId: actorUserId,
          lastActionAt: now,
        },
      }),
      this.prisma.fontFamily.update({
        where: {
          id: submission.familyId,
        },
        data: familyUpdate,
      }),
      this.prisma.fontStyle.updateMany({
        where: {
          familyId: submission.familyId,
        },
        data:
          action === 'approved'
            ? {
                status: 'approved',
                publishedAt: now,
              }
            : {
                status: 'draft',
                publishedAt: null,
              },
      }),
      this.prisma.reviewEvent.create({
        data: {
          submissionId: submission.id,
          familyId: submission.familyId,
          actorUserId,
          action,
          notes: payload.notes?.trim() || null,
          metadataJson: decisionMetadata,
        },
      }),
    ]);

    if (action === 'approved') {
      await Promise.all([
        this.backgroundJobs.enqueueSearchSync(submission.familyId, 'upsert'),
        this.backgroundJobs.enqueueFamilyPackageWarmup(submission.familyId),
      ]);
    } else {
      await this.backgroundJobs.enqueueSearchSync(submission.familyId, 'remove');
    }

    return {
      submissionId: submission.id,
      familyId: submission.familyId,
      status: nextSubmissionStatus,
      publishedAt: action === 'approved' ? now : null,
      reviewDecision: {
        action,
        notes: payload.notes?.trim() || null,
        metadata: decisionMetadata ?? null,
      },
    };
  }

  private initializeEnumCounts<TEnum extends Record<string, string>>(
    enumObject: TEnum,
  ): Record<TEnum[keyof TEnum], number> {
    return Object.values(enumObject).reduce(
      (accumulator, value) => ({
        ...accumulator,
        [value]: 0,
      }),
      {} as Record<TEnum[keyof TEnum], number>,
    );
  }

  private getRefreshSessionStatus(
    session: {
      expiresAt: Date;
      revokedAt: Date | null;
    },
    now: Date,
  ): 'active' | 'revoked' | 'expired' {
    if (session.revokedAt) {
      return 'revoked';
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      return 'expired';
    }

    return 'active';
  }

  private async recordAuthAuditEvent(args: {
    action: AuthAuditAction;
    outcome: AuthAuditOutcome;
    request?: AuthenticatedRequest;
    userId?: string | null;
    email?: string | null;
    metadataJson?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.authAuditEvent.create({
        data: {
          userId: args.userId ?? null,
          email: args.email?.trim().toLowerCase() ?? null,
          action: args.action,
          outcome: args.outcome,
          ipHash: this.hashValue(args.request ? this.getRequestIdentifier(args.request) : null),
          userAgentHash: this.hashValue(this.getUserAgent(args.request)),
          metadataJson: (args.metadataJson ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      return;
    }
  }

  private getRequestIdentifier(request: AuthenticatedRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0]?.trim() ?? request.ip ?? 'unknown';
    }

    if (Array.isArray(forwardedFor) && forwardedFor[0]?.trim()) {
      return forwardedFor[0].split(',')[0]?.trim() ?? request.ip ?? 'unknown';
    }

    return request.ip ?? 'unknown';
  }

  private getUserAgent(request: AuthenticatedRequest | undefined): string | null {
    if (!request) {
      return null;
    }

    const rawUserAgent = request.headers['user-agent'];

    if (typeof rawUserAgent === 'string') {
      return rawUserAgent;
    }

    if (Array.isArray(rawUserAgent)) {
      return rawUserAgent[0] ?? null;
    }

    return null;
  }

  private hashValue(value: string | null | undefined): string | null {
    if (!value?.trim()) {
      return null;
    }

    return createHash('sha256').update(value).digest('hex');
  }

  private async normalizeReviewDecisionIssues(
    submission: {
      familyId: string;
      uploads: Array<{ id: string }>;
    },
    payload: ReviewDecisionDto,
  ): Promise<Array<{
    targetUploadId: string | null;
    targetStyleId: string | null;
    issueCode: string | null;
    note: string | null;
  }>> {
    const rawIssues: ReviewDecisionIssueDto[] =
      payload.issues && payload.issues.length > 0
        ? payload.issues
        : payload.targetUploadId || payload.targetStyleId || payload.issueCode
          ? [
              {
                targetUploadId: payload.targetUploadId,
                targetStyleId: payload.targetStyleId,
                issueCode: payload.issueCode,
              },
            ]
          : [];

    const normalizedIssues = rawIssues
      .map((issue) => ({
        targetUploadId: issue.targetUploadId?.trim() || null,
        targetStyleId: issue.targetStyleId?.trim() || null,
        issueCode: issue.issueCode?.trim() || null,
        note: issue.note?.trim() || null,
      }))
      .filter(
        (issue) =>
          issue.targetUploadId || issue.targetStyleId || issue.issueCode || issue.note,
      );

    for (const issue of normalizedIssues) {
      if (
        issue.targetUploadId &&
        !submission.uploads.some((upload) => upload.id === issue.targetUploadId)
      ) {
        throw new BadRequestException('targetUploadId does not belong to this submission');
      }

      if (issue.targetStyleId) {
        const matchingStyle = await this.prisma.fontStyle.findFirst({
          where: {
            id: issue.targetStyleId,
            familyId: submission.familyId,
          },
          select: {
            id: true,
          },
        });

        if (!matchingStyle) {
          throw new BadRequestException('targetStyleId does not belong to this submission family');
        }
      }
    }

    return normalizedIssues;
  }

  private formatAnalyticsDay(date: Date, timezone?: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(date);
  }

  private createEmptyReviewActionCountBucket() {
    return {
      submitted: 0,
      metadata_updated: 0,
      archived: 0,
      approved: 0,
      rejected: 0,
      request_changes: 0,
      processing_failed: 0,
      reprocessed: 0,
    };
  }
}
