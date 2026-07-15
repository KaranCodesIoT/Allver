export interface ActionLog {
  user: string;
  role: string;
  query: string;
  action: string | null;
  confidence: number;
  responseTimeMs: number;
  success: boolean;
  timestamp: string;
}

export class AIAnalytics {
  private static logs: ActionLog[] = [];

  /**
   * Logs an AI action execution interaction
   */
  static logAction(
    user: string,
    role: string,
    query: string,
    action: string | null,
    confidence: number,
    responseTimeMs: number,
    success: boolean
  ): void {
    const logEntry: ActionLog = {
      user,
      role,
      query,
      action,
      confidence,
      responseTimeMs,
      success,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    this.logs.push(logEntry);
    console.log('[AIAnalytics] Logged interaction:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Retrieves all logs (recent first)
   */
  static getLogs(): ActionLog[] {
    return [...this.logs].reverse();
  }

  /**
   * Computes aggregated usage statistics
   */
  static getStats() {
    const totalCount = this.logs.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        averageResponseTimeMs: 0,
        successRate: 100,
        mostUsedAction: 'None',
        failedIntentsCount: 0,
      };
    }

    const successfulLogs = this.logs.filter((l) => l.success);
    const failedIntents = this.logs.filter((l) => !l.action || l.confidence < 0.7);

    const sumResponseTime = this.logs.reduce((sum, l) => sum + l.responseTimeMs, 0);
    const avgResponseTime = Math.round(sumResponseTime / totalCount);

    const actionCounts: Record<string, number> = {};
    this.logs.forEach((l) => {
      if (l.action) {
        actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
      }
    });

    let mostUsedAction = 'None';
    let maxCount = 0;
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedAction = action;
      }
    });

    return {
      totalCount,
      averageResponseTimeMs: avgResponseTime,
      successRate: Math.round((successfulLogs.length / totalCount) * 100),
      mostUsedAction,
      failedIntentsCount: failedIntents.length,
    };
  }

  /**
   * Resets/purges log data
   */
  static clearLogs(): void {
    this.logs = [];
  }
}
