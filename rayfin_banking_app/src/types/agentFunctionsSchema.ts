import type { AgentApiResponse, AIWidget } from './aiModule';
import type { BankingAnalytics, BankingSnapshot } from './banking';

export type AppFunctionsSchema = {
  chatWithBankingAgents: {
    input: {
      userId: string;
      sessionId: string;
      prompt: string;
      snapshot: BankingSnapshot;
      analytics: BankingAnalytics;
      editingWidget?: AIWidget | null;
      editingWidgetId?: string | null;
      createWidgetHint?: boolean;
    };
    output: AgentApiResponse;
  };
};
