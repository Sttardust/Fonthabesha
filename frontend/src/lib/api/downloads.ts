import { apiClient } from './client';
import type { DownloadUrlResponse } from '@/lib/types';

const PREFIX = '/api/v1/downloads';

export const downloadsApi = {
  /**
   * Request a signed S3 download URL for a font family.
   * The URL is valid for 15 minutes.
   * Requires authentication.
   */
  getDownloadUrl: (familyId: string): Promise<DownloadUrlResponse> =>
    apiClient.post<DownloadUrlResponse>(`${PREFIX}/families/${familyId}`),

  /**
   * Trigger the download in the browser.
   * Fetches the signed URL then initiates an anchor-click download.
   */
  download: async (familyId: string, filename?: string): Promise<void> => {
    const { url } = await downloadsApi.getDownloadUrl(familyId);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? `font-${familyId}.zip`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
