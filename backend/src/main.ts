import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';

import { createApp } from './bootstrap';
import type { AppEnvironment } from './shared/config/app-env';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const configService = app.get<ConfigService<AppEnvironment, true>>(ConfigService);
  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
