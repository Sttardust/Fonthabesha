import type { IncomingHttpHeaders } from 'node:http';

export type AuthenticatedRequest = {
  headers: IncomingHttpHeaders;
  ip?: string;
};
