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
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actor: ReviewActor;
};

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

  return [...directTarget, ...reprocessTargets];
}

function buildSummary(
  action: string,
  notes: string | null,
  issueCode: string | null,
  targets: ReviewTarget[],
): string {
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

  const parts = [action.replaceAll('_', ' '), issueCode, targetSummary, notes]
    .filter((value): value is string => Boolean(value))
    .map((value, index) => (index === 0 ? value : `- ${value}`));

  return parts.join(' ');
}

export function presentReviewHistoryEvent(input: ReviewEventInput): ReviewEventPresentation {
  const metadata = asRecord(input.metadataJson);
  const issueCode = asString(metadata?.issueCode);
  const targets = buildTargets(metadata);

  return {
    id: input.id,
    action: input.action,
    kind: mapReviewKind(input.action),
    notes: input.notes,
    issueCode,
    targets,
    summary: buildSummary(input.action, input.notes, issueCode, targets),
    metadata,
    createdAt: input.createdAt,
    actor: input.actor,
  };
}
