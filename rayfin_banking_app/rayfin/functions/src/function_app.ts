import { UserDataFunctions } from '@microsoft/fabric-user-data-functions';

import { runMultiAgentWorkflow } from './multi-agent-banking.js';
import type {
  AgentApiResponse,
  ChatWithBankingAgentsInput,
  RouteContext,
} from './banking-agent-types.js';

const udf = new UserDataFunctions();

udf.func(
  'chatWithBankingAgents',
  async (payload: ChatWithBankingAgentsInput): Promise<AgentApiResponse> => {
    const context: RouteContext = {
      profile: payload.snapshot?.profile ?? null,
      accounts: payload.snapshot?.accounts ?? [],
      categories: payload.snapshot?.categories ?? [],
      transactions: payload.snapshot?.transactions ?? [],
      analytics: payload.analytics ?? {},
    };

    return runMultiAgentWorkflow(
      payload.prompt ?? '',
      context,
      payload.sessionId ?? '',
      payload.userId ?? '',
      payload.editingWidget ?? null,
      Boolean(payload.createWidgetHint)
    );
  },
  []
);
