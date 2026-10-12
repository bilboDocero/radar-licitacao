import { sql, desc, gte } from 'drizzle-orm';
import { aiUsageRecords, type Database } from '@radar/database';
import type { AIUsageRecord } from '@radar/contracts';
import { environment } from '@radar/config';

export class AIUsageTracker {
  constructor(private readonly db: Database) {}

  async canExecute(): Promise<boolean> {
    const env = environment();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailyTotal] = await this.db
      .select({ totalCost: sql<string>`coalesce(sum(cost_usd), 0)` })
      .from(aiUsageRecords)
      .where(gte(aiUsageRecords.createdAt, today));

    const dailySpend = Number(dailyTotal?.totalCost || 0);
    if (dailySpend >= env.AI_DAILY_BUDGET_USD) {
      return false;
    }

    const [monthlyTotal] = await this.db
      .select({ totalCost: sql<string>`coalesce(sum(cost_usd), 0)` })
      .from(aiUsageRecords)
      .where(gte(aiUsageRecords.createdAt, firstDayOfMonth));

    const monthlySpend = Number(monthlyTotal?.totalCost || 0);
    if (monthlySpend >= env.AI_MONTHLY_BUDGET_USD) {
      return false;
    }

    return true;
  }

  async recordUsage(record: Omit<AIUsageRecord, 'id' | 'createdAt'>): Promise<void> {
    await this.db.insert(aiUsageRecords).values({
      provider: record.provider,
      model: record.model,
      taskType: record.taskType,
      procurementId: record.procurementId || null,
      procurementVersion: record.procurementVersion ?? null,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      latencyMs: record.latencyMs,
      costUsd: record.costUsd,
      status: record.status,
      errorMessage: record.errorMessage || null,
    });
  }

  async getRecentUsage(limit = 50) {
    return this.db
      .select()
      .from(aiUsageRecords)
      .orderBy(desc(aiUsageRecords.createdAt))
      .limit(limit);
  }

  async getUsageSummary() {
    const [totals] = await this.db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        successfulCalls: sql<number>`count(*) filter (where status = 'success')::int`,
        failedCalls: sql<number>`count(*) filter (where status = 'error')::int`,
        totalTokens: sql<number>`coalesce(sum(total_tokens), 0)::int`,
        totalCostUsd: sql<string>`coalesce(sum(cost_usd), 0)::text`,
        avgLatencyMs: sql<number>`coalesce(avg(latency_ms), 0)::int`,
      })
      .from(aiUsageRecords);

    return totals || {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalTokens: 0,
      totalCostUsd: '0',
      avgLatencyMs: 0,
    };
  }
}
