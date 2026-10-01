import type { CheckIn, CreateCheckIn, UpdateCheckIn } from '@saraya/contracts';

import { hasDatabaseConfiguration } from '../../platform/database/pool';
import { PostgresCheckInRepository } from './check-in.postgres-repository';

export interface CheckInRepository {
  findAll(userId: string): Promise<CheckIn[]>;
  findById(userId: string, id: string): Promise<CheckIn | null>;
  findRecent(userId: string, destinationId: string, since: string): Promise<CheckIn | null>;
  create(userId: string, id: string, input: CreateCheckIn): Promise<CheckIn>;
  update(userId: string, id: string, input: UpdateCheckIn): Promise<CheckIn | null>;
  delete(userId: string, id: string): Promise<boolean>;
}

export class InMemoryCheckInRepository implements CheckInRepository {
  private readonly entries = new Map<string, CheckIn>();

  async findAll(userId: string) {
    return [...this.entries.values()]
      .filter((entry) => entry.userId === userId)
      .sort((left, right) => right.visitedAt.localeCompare(left.visitedAt))
      .map((entry) => structuredClone(entry));
  }

  async findById(userId: string, id: string) {
    const entry = this.entries.get(id);
    return entry?.userId === userId ? structuredClone(entry) : null;
  }

  async findRecent(userId: string, destinationId: string, since: string) {
    const entry = [...this.entries.values()].find(
      (candidate) => candidate.userId === userId &&
        candidate.destinationId === destinationId && candidate.createdAt >= since,
    );
    return entry ? structuredClone(entry) : null;
  }

  async create(userId: string, id: string, input: CreateCheckIn) {
    const now = new Date().toISOString();
    const entry: CheckIn = { id, userId, ...input, visitedAt: input.visitedAt ?? now, createdAt: now, updatedAt: now };
    this.entries.set(id, entry);
    return structuredClone(entry);
  }

  async update(userId: string, id: string, input: UpdateCheckIn) {
    const existing = await this.findById(userId, id);
    if (!existing) return null;
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.entries.set(id, updated);
    return structuredClone(updated);
  }

  async delete(userId: string, id: string) {
    const existing = await this.findById(userId, id);
    return existing ? this.entries.delete(id) : false;
  }
}

const memoryRepository = new InMemoryCheckInRepository();

export function createCheckInRepository(): CheckInRepository {
  if (process.env.NODE_ENV !== 'test' && hasDatabaseConfiguration()) {
    return new PostgresCheckInRepository();
  }
  return memoryRepository;
}
