import { safetyAlertSchema, type SafetyAlert } from '@saraya/contracts';
import { z } from 'zod';

import safetyAlertData from '../../../../../database/seeds/safety-alerts.json';

export const seedSafetyAlerts: SafetyAlert[] = z.array(safetyAlertSchema).parse(safetyAlertData);
