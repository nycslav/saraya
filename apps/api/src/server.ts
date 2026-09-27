import { app } from './app';
import { createJobRunnerOptions, registerJobs } from './jobs';
import { InMemoryJobRunner } from './platform/jobs';

const parsedPort = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? '3000', 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

const runnerOptions = createJobRunnerOptions(registerJobs());
let runner: InMemoryJobRunner | undefined;
if (runnerOptions) {
  runner = new InMemoryJobRunner(runnerOptions.jobs, runnerOptions.scheduler);
  void runner.start().catch((error: unknown) => {
    console.error('[scheduler] Failed to start background jobs.', error);
  });
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Saraya API listening on http://localhost:${port}`);
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] Received ${signal}; shutting down.`);

  try {
    await runner?.stop();
  } catch (error) {
    console.error('[scheduler] Failed to stop background jobs.', error);
    process.exitCode = 1;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  } catch (error) {
    console.error('[server] Failed to close the HTTP server.', error);
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
