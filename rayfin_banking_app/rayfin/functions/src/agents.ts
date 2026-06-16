import { buildWidgetFromIntent, clampCurrency, heuristicRoute, summarizeContext } from './agent-tools.js';
import { llmClient } from './llm.js';
import type {
  AIWidget,
  AccountAgentReply,
  AgentReply,
  BankingAnalytics,
  RouteContext,
  RouteDecision,
  VisualizationAgentReply,
} from './banking-agent-types.js';

function findAccounts(prompt: string, context: RouteContext) {
  const lowered = prompt.toLowerCase();
  return (context.analytics.accountSummaries ?? []).filter((account) => lowered.includes(account.name.toLowerCase()));
}

function findCategory(prompt: string, context: RouteContext) {
  const lowered = prompt.toLowerCase();
  return context.categories.find((category) => lowered.includes(category.name.toLowerCase()));
}

function inferAccountType(prompt: string): 'checking' | 'savings' | 'investment' {
  const lowered = prompt.toLowerCase();

  if (lowered.includes('savings')) {
    return 'savings';
  }

  if (lowered.includes('investment') || lowered.includes('brokerage')) {
    return 'investment';
  }

  return 'checking';
}

function parseAccountAction(prompt: string, context: RouteContext): AccountAgentReply['action'] {
  const lowered = prompt.toLowerCase();
  const amountMatch = /\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/.exec(prompt);
  const amount = clampCurrency(amountMatch?.[1]);
  const matchedAccounts = findAccounts(prompt, context);
  const matchedCategory = findCategory(prompt, context);

  if (/(create|open).*(account)/i.test(lowered)) {
    const institutionMatch = /(?:at|with)\s+([A-Za-z0-9 .&'-]{3,60})/i.exec(prompt);
    const accountType = inferAccountType(prompt);

    return {
      type: 'create_account',
      payload: {
        name: `${accountType.charAt(0).toUpperCase()}${accountType.slice(1)} Account`,
        accountType,
        institution: institutionMatch?.[1]?.trim() ?? 'Contoso Credit Union',
        openingBalance: amount,
      },
    };
  }

  if ((lowered.includes('transfer') || lowered.includes('move money')) && matchedAccounts.length >= 2 && amount > 0) {
    const fromAccount = matchedAccounts[0];
    const toAccount = matchedAccounts[1];

    return {
      type: 'create_transaction',
      payload: {
        transactionType: 'transfer',
        amount,
        description: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        counterpartyName: toAccount.name,
      },
    };
  }

  if (lowered.includes('deposit') && matchedAccounts.length >= 1 && amount > 0) {
    const destination = matchedAccounts[0];

    return {
      type: 'create_transaction',
      payload: {
        transactionType: 'deposit',
        amount,
        description: `Deposit into ${destination.name}`,
        toAccountId: destination.id,
      },
    };
  }

  if (
    ['withdraw', 'payment', 'pay', 'spent', 'purchase'].some((token) => lowered.includes(token)) &&
    matchedAccounts.length >= 1 &&
    amount > 0
  ) {
    const source = matchedAccounts[0];
    const merchantMatch = /(?:at|for)\s+([A-Za-z0-9 .&'-]{2,60})/i.exec(prompt);

    return {
      type: 'create_transaction',
      payload: {
        transactionType: lowered.includes('withdraw') ? 'withdrawal' : 'payment',
        amount,
        description: prompt.trim(),
        fromAccountId: source.id,
        categoryId: matchedCategory?.id ?? null,
        merchantName: merchantMatch?.[1]?.trim() ?? null,
      },
    };
  }

  return null;
}

export async function routeRequest(
  prompt: string,
  context: RouteContext,
  editingWidget: AIWidget | null | undefined,
  createWidgetHint: boolean
): Promise<RouteDecision> {
  const fallback: RouteDecision = {
    route: heuristicRoute(prompt, editingWidget, createWidgetHint),
    reason: 'Keyword-based fallback route.',
  };

  return llmClient.generateJson<RouteDecision>(
    `
You are the coordinator in a banking multi-agent system.
Return JSON with:
- route: one of "fabric_agent", "account_agent", "support_agent", "visualization_agent"
- reason: one sentence

Route rules:
- READ-ONLY questions about balances, spending, transactions, budgets, merchants, or trends -> fabric_agent
- WRITE operations like creating accounts or moving money -> account_agent
- Requests about capabilities or guidance -> support_agent
- Requests to create, edit, refresh, or explain AI Module charts/widgets/simulators -> visualization_agent
`.trim(),
    {
      prompt,
      editing_widget: editingWidget ?? null,
      create_widget_hint: createWidgetHint,
      context_summary: summarizeContext(context),
    },
    fallback
  );
}

export async function runFabricAgent(prompt: string, context: RouteContext): Promise<AgentReply> {
  const analytics: BankingAnalytics = context.analytics ?? {};
  const fallback: AgentReply = {
    reply: `This month you brought in $${Math.round(analytics.monthlyIncome ?? 0).toLocaleString()}, spent $${Math.round(
      analytics.monthlyExpenses ?? 0
    ).toLocaleString()}, and are tracking a ${(analytics.savingsRate ?? 0).toFixed(1)}% savings rate.`,
    open_section: 'analytics',
  };

  return llmClient.generateJson<AgentReply>(
    `
You are the Fabric data specialist in a banking multi-agent system.
Use only the provided banking context. Do not invent records.
Return JSON with:
- reply: concise Markdown-ready answer for the user
- open_section: one of overview, activity, analytics
`.trim(),
    {
      prompt,
      context_summary: summarizeContext(context),
    },
    fallback
  );
}

export async function runAccountAgent(prompt: string, context: RouteContext): Promise<AccountAgentReply> {
  const fallbackAction = parseAccountAction(prompt, context);
  const fallback: AccountAgentReply = fallbackAction
    ? {
        reply:
          fallbackAction.type === 'create_account'
            ? 'I prepared a new account for the Move Money workspace.'
            : 'I prepared the money movement for the Move Money workspace.',
        open_section: 'move-money',
        action: fallbackAction,
      }
    : {
        reply:
          'I can help open an account or prepare a money movement once you specify the account names and amount.',
        open_section: 'move-money',
        action: null,
      };

  return llmClient.generateJson<AccountAgentReply>(
    `
You are the account-management specialist in a banking multi-agent system.
Use the provided accounts and categories to prepare frontend actions.
Return JSON with:
- reply: concise user-facing answer
- open_section: always "move-money" unless you are only answering a balance question
- action: null OR an object with:
  - type: "create_account" or "create_transaction"
  - payload: the exact payload for the frontend

For transfers or payments, use create_transaction payload keys:
transactionType, amount, description, categoryId, fromAccountId, toAccountId, merchantName, counterpartyName

For account creation, use create_account payload keys:
name, accountType, institution, openingBalance
`.trim(),
    {
      prompt,
      context_summary: summarizeContext(context),
    },
    fallback
  );
}

export async function runSupportAgent(prompt: string, context: RouteContext): Promise<AgentReply> {
  const fallback: AgentReply = {
    reply:
      'This app uses a TypeScript UDF coordinator for the LLM-backed workflow, while chat history and AI widgets remain stored directly in the app data layer.',
    open_section: 'ai-module',
  };

  return llmClient.generateJson<AgentReply>(
    `
You are the support specialist in a banking multi-agent system.
Return JSON with:
- reply: concise helpful answer
- open_section: one of overview, analytics, ai-module
`.trim(),
    {
      prompt,
      context_summary: summarizeContext(context),
    },
    fallback
  );
}

export async function runVisualizationAgent(
  prompt: string,
  context: RouteContext,
  editingWidget: AIWidget | null | undefined
): Promise<VisualizationAgentReply> {
  const fallbackIntent: VisualizationAgentReply['widget_intent'] = {
    title: 'Budget health tracker',
    description: 'Dynamic view of spend against current monthly budgets.',
    widget_type: 'chart',
    data_mode: 'dynamic',
    chart_type: 'bar',
    query_key: 'budget_health',
    x_axis: 'name',
    y_axis: 'spent',
  };
  const fallback: VisualizationAgentReply = {
    reply: 'Created a new AI Module visualization from the latest banking context.',
    open_section: 'ai-module',
    widget_intent: fallbackIntent,
  };

  const result = await llmClient.generateJson<VisualizationAgentReply>(
    `
You are the visualization specialist in a banking multi-agent system.
Return JSON with:
- reply: concise answer
- open_section: always "ai-module"
- widget_intent: object with fields:
  title, description, widget_type ("chart" or "simulation"), data_mode ("dynamic" or "static"),
  chart_type ("bar", "line", "pie", "area"), query_key ("monthly_cash_flow", "budget_health", "merchant_spend", "account_balances"),
  x_axis, y_axis, simulation_type ("budget_planner", "savings_projector", "emergency_fund"), defaults

Rules:
- Editing an existing widget should preserve its purpose unless the user clearly changes it.
- Use dynamic charts for current banking data.
- Use simulations for what-if, planner, projector, emergency fund, or savings calculator requests.
`.trim(),
    {
      prompt,
      editing_widget: editingWidget ?? null,
      context_summary: summarizeContext(context),
    },
    fallback
  );

  return {
    ...result,
    widget: buildWidgetFromIntent(result.widget_intent ?? fallbackIntent, context.analytics, editingWidget),
  };
}
