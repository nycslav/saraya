# Background jobs

Weather polling and festival or safety reminder jobs begin here. Keep job entry
points thin and call feature services for business behavior.

## Execution model

Jobs are self-contained functions with cron schedules. A `JobScheduler`
abstraction decouples job registration from the underlying coordination backend:

- `NoopJobScheduler` — runs jobs in-process via a lightweight cron runner; no
  external coordination required (default in development and tests).
- `RedisJobScheduler` — registers job schedules in Redis so an external worker
  process can execute jobs. Redis is an optional infrastructure dependency; when
  unavailable, the noop scheduler keeps jobs running in-process.

`SCHEDULER_BACKEND` (`noop` | `redis`) selects the implementation at startup.
`SCHEDULER_ENABLED=false` (or `NODE_ENV !== production`) skips scheduler
registration entirely.

Jobs are never bundled into the mobile application and never handle user
secrets. They invoke existing feature services directly:

- `send-reminders` — `FestivalReminderService.dispatchDueReminders`
- `poll-weather` — warms weather cache via the `WeatherProvider` + `WeatherCache`

## Cron conventions

| Job | Schedule | Purpose |
|-----|----------|---------|
| send-reminders | `*/5 * * * *` | Dispatch due festival reminders every 5 minutes |
| poll-weather | `0 * * * *` | Warm weather cache hourly for major destinations |

Use UTC for all schedules.
