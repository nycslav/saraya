import { app } from './app';
import { createJobRunnerOptions, registerJobs } from './jobs';
import { InMemoryJobRunner } from './platform/jobs';

const parsedPort = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? '3000', 10);
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

const runnerOptions = createJobRunnerOptions(registerJobs());
if (runnerOptions) {
  const runner = new InMemoryJobRunner(runnerOptions.jobs, runnerOptions.scheduler);
  void runner.start();
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Saraya API listening on http://localhost:${port}`);
});
