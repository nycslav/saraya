import path from 'node:path';

import { config } from 'dotenv';

const rootEnvPath =
  path.basename(process.cwd()).toLocaleLowerCase() === 'api'
    ? path.resolve(process.cwd(), '../../.env')
    : path.resolve(process.cwd(), '.env');

config({ path: rootEnvPath, quiet: true });
