# API modules

Modules are organized by business capability:

- Member 1: `auth`, `users`, `destinations`, `cultural-guides`, `itineraries`
- Member 2: `bucket-list`, `check-ins`, `achievements`, `statistics`
- Member 3: `festivals`, `safety-alerts`, `notifications`, `subscriptions`

A module must not import provider-specific SDK code from another module. Use a narrow interface implemented under `src/integrations` or exposed by the owning module.

