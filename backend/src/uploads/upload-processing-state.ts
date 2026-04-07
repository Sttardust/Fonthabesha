export type UploadProcessingState = 'queued' | 'processing' | 'completed' | 'failed';

export function summarizeUploadProcessingState(
  statuses: readonly UploadProcessingState[],
): UploadProcessingState {
  if (statuses.some((status) => status === 'failed')) {
    return 'failed';
  }

  if (statuses.length > 0 && statuses.every((status) => status === 'completed')) {
    return 'completed';
  }

  if (statuses.some((status) => status === 'processing' || status === 'completed')) {
    return 'processing';
  }

  return 'queued';
}
