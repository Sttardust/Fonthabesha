type ReviewActor = {
  id: string;
  displayName: string;
  role: string;
  email?: string;
} | null;

type ReviewEventInput = {
  id: string;
  action: string;
  notes: string | null;
  metadataJson: unknown;
  createdAt: Date;
  actor: ReviewActor;
};

type ReviewTarget = {
  uploadId: string | null;
  styleId: string | null;
};

type ReviewEventPresentation = {
  id: string;
  action: string;
  kind: 'feedback' | 'decision' | 'system' | 'submission';
  notes: string | null;
  issueCode: string | null;
  targets: ReviewTarget[];
  issues: Array<{
    issueCode: string | null;
    note: string | null;
    targetUploadId: string | null;
    targetStyleId: string | null;
  }>;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actor: ReviewActor;
};

type ReviewHistoryKind = ReviewEventPresentation['kind'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function mapReviewKind(action: string): ReviewEventPresentation['kind'] {
  if (['request_changes', 'processing_failed'].includes(action)) {
    return 'feedback';
  }

  if (['approved', 'rejected'].includes(action)) {
    return 'decision';
  }

  if (['submitted'].includes(action)) {
    return 'submission';
  }

  return 'system';
}

function buildTargets(metadata: Record<string, unknown> | null): ReviewTarget[] {
  if (!metadata) {
    return [];
  }

  const issueTargets = (Array.isArray(metadata.issues) ? metadata.issues : [])
    .map((rawIssue) => asRecord(rawIssue))
    .filter((issue): issue is Record<string, unknown> => Boolean(issue))
    .map((issue) => ({
      uploadId: asString(issue.targetUploadId),
      styleId: asString(issue.targetStyleId),
    }))
    .filter((target) => target.uploadId || target.styleId);

  const directTarget =
    asString(metadata.targetUploadId) || asString(metadata.targetStyleId)
      ? [
          {
            uploadId: asString(metadata.targetUploadId),
            styleId: asString(metadata.targetStyleId),
          },
        ]
      : [];

  const reprocessTargets = asStringArray(metadata.uploadIds).map((uploadId) => ({
    uploadId,
    styleId: null,
  }));

  return issueTargets.length > 0 ? [...issueTargets, ...reprocessTargets] : [...directTarget, ...reprocessTargets];
}

function buildIssues(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return [];
  }

  const rawIssues = Array.isArray(metadata.issues) ? metadata.issues : [];
  const parsedIssues = rawIssues
    .map((rawIssue) => asRecord(rawIssue))
    .filter((issue): issue is Record<string, unknown> => Boolean(issue))
    .map((issue) => ({
      issueCode: asString(issue.issueCode),
      note: asString(issue.note),
      targetUploadId: asString(issue.targetUploadId),
      targetStyleId: asString(issue.targetStyleId),
    }))
    .filter(
      (issue) =>
        issue.issueCode || issue.note || issue.targetUploadId || issue.targetStyleId,
    );

  if (parsedIssues.length > 0) {
    return parsedIssues;
  }

  const fallbackIssue =
    asString(metadata.issueCode) ||
    asString(metadata.targetUploadId) ||
    asString(metadata.targetStyleId)
      ? [
          {
            issueCode: asString(metadata.issueCode),
            note: null,
            targetUploadId: asString(metadata.targetUploadId),
            targetStyleId: asString(metadata.targetStyleId),
          },
        ]
      : [];

  return fallbackIssue;
}

function buildSummary(
  action: string,
  notes: string | null,
  issues: Array<{
    issueCode: string | null;
    note: string | null;
    targetUploadId: string | null;
    targetStyleId: string | null;
  }>,
  targets: ReviewTarget[],
): string {
  const issueSummary = issues
    .map((issue) => {
      const targetParts = [issue.targetUploadId ? `upload ${issue.targetUploadId}` : null, issue.targetStyleId ? `style ${issue.targetStyleId}` : null]
        .filter((value): value is string => Boolean(value))
        .join(' / ');
      return [issue.issueCode, targetParts, issue.note]
        .filter((value): value is string => Boolean(value))
        .join(' ');
    })
    .filter(Boolean)
    .join('; ');
  const targetSummary =
    targets.length === 0
      ? null
      : targets
          .map((target) => {
            if (target.uploadId && target.styleId) {
              return `upload ${target.uploadId} / style ${target.styleId}`;
            }

            if (target.uploadId) {
              return `upload ${target.uploadId}`;
            }

            if (target.styleId) {
              return `style ${target.styleId}`;
            }

            return null;
          })
          .filter((value): value is string => Boolean(value))
          .join(', ');

  const parts = [action.replaceAll('_', ' '), issueSummary, targetSummary, notes]
    .filter((value): value is string => Boolean(value))
    .map((value, index) => (index === 0 ? value : `- ${value}`));

  return parts.join(' ');
}

export function presentReviewHistoryEvent(input: ReviewEventInput): ReviewEventPresentation {
  const metadata = asRecord(input.metadataJson);
  const issues = buildIssues(metadata);
  const issueCode = issues[0]?.issueCode ?? asString(metadata?.issueCode);
  const targets = buildTargets(metadata);

  return {
    id: input.id,
    action: input.action,
    kind: mapReviewKind(input.action),
    notes: input.notes,
    issueCode,
    targets,
    issues,
    summary: buildSummary(input.action, input.notes, issues, targets),
    metadata,
    createdAt: input.createdAt,
    actor: input.actor,
  };
}

export function filterReviewHistoryEvents(
  events: ReviewEventPresentation[],
  query: {
    action?: string;
    kind?: ReviewHistoryKind;
    issueCode?: string;
    from?: string;
    to?: string;
  },
): ReviewEventPresentation[] {
  const fromTime = query.from ? new Date(query.from).getTime() : null;
  const toTime = query.to ? new Date(query.to).getTime() : null;
  const normalizedIssueCode = query.issueCode?.trim().toLowerCase() ?? null;

  return events.filter((event) => {
    if (query.action && event.action !== query.action) {
      return false;
    }

    if (query.kind && event.kind !== query.kind) {
      return false;
    }

    if (
      normalizedIssueCode &&
      !event.issues.some((issue) => issue.issueCode?.toLowerCase() === normalizedIssueCode) &&
      event.issueCode?.toLowerCase() !== normalizedIssueCode
    ) {
      return false;
    }

    const createdAtTime = event.createdAt.getTime();

    if (fromTime !== null && createdAtTime < fromTime) {
      return false;
    }

    if (toTime !== null && createdAtTime > toTime) {
      return false;
    }

    return true;
  });
}
