import path from 'node:path';

import { config } from 'dotenv';

const rootEnvPath =
  path.basename(process.cwd()).toLocaleLowerCase() === 'api'
    ? path.resolve(process.cwd(), '../../.env')
    : path.resolve(process.cwd(), '.env');

if (process.env.NODE_ENV !== 'test') {
  config({ path: rootEnvPath, quiet: true });
}
