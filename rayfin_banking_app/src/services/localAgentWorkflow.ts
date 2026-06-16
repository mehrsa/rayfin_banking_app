import type {
  AgentApiResponse,
  AgentTraceStep,
  AIWidget,
  AIWidgetQueryKey,
  SimulationType,
} from '@/types/aiModule';
import type {
  AccountSummary,
  BankingAnalytics,
  BankingSnapshot,
  CategorySpend,
} from '@/types/banking';

type RouteName =
  | 'fabric_agent'
  | 'account_agent'
  | 'support_agent'
  | 'visualization_agent';

interface RouteContext {
  profile: BankingSnapshot['profile'];
  accounts: BankingSnapshot['accounts'];
  categories: BankingSnapshot['categories'];
  transactions: BankingSnapshot['transactions'];
  analytics: BankingAnalytics;
}

interface WidgetIntent {
  title: string;
  description: string;
  widget_type: 'chart' | 'simulation';
  data_mode: 'static' | 'dynamic';
  chart_type?: 'bar' | 'line' | 'pie' | 'area';
  query_key?: AIWidgetQueryKey;
  x_axis?: string;
  y_axis?: string;
  colors?: string[];
  simulation_type?: SimulationType;
  defaults?: Record<string, number | string>;
}

function makeTrace(
  agent: AgentTraceStep['agent'],
  title: string,
  detail: string
): AgentTraceStep {
  return { agent, title, detail, status: 'fallback' };
}

function clampCurrency(value: unknown): number {
  const normalized = String(value ?? '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .trim();
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? Math.floor(numeric * 100) / 100 : 0;
}

function heuristicRoute(
  prompt: string,
  editingWidget: AIWidget | null | undefined,
  createWidgetHint: boolean
): RouteName {
  const lowered = prompt.toLowerCase();

  if (editingWidget || createWidgetHint) {
    return 'visualization_agent';
  }

  if (
    [
      'chart',
      'graph',
      'widget',
      'visual',
      'simulator',
      'planner',
      'calculator',
      'projection',
      'what-if',
      'ai module',
    ].some((token) => lowered.includes(token))
  ) {
    return 'visualization_agent';
  }

  if (['help', 'support', 'how do', 'what can you do'].some((token) => lowered.includes(token))) {
    return 'support_agent';
  }

  if (
    ['create account', 'open account', 'transfer', 'move money', 'deposit', 'withdraw', 'payment'].some(
      (token) => lowered.includes(token)
    )
  ) {
    return 'account_agent';
  }

  return 'fabric_agent';
}

function queryDynamicData(queryKey: AIWidgetQueryKey, analytics: BankingAnalytics) {
  if (queryKey === 'monthly_cash_flow') {
    return analytics.monthlyCashFlow.map((point) => ({
      month: point.monthLabel,
      income: point.income,
      expenses: point.expenses,
      net: point.net,
    }));
  }

  if (queryKey === 'merchant_spend') {
    return analytics.topMerchants.map((merchant) => ({
      name: merchant.merchantName,
      value: merchant.amount,
      transactions: merchant.transactionCount,
    }));
  }

  if (queryKey === 'account_balances') {
    return analytics.accountSummaries.map((account) => ({
      name: account.name,
      balance: account.currentBalance,
      change: account.netChange,
    }));
  }

  return analytics.categorySpend.map((item: CategorySpend) => ({
    name: item.name,
    spent: item.spent,
    budget: item.budget,
    remaining: item.remaining,
    exceeded: item.exceededAmount,
  }));
}

function defaultWidgetColors(queryKey: AIWidgetQueryKey): string[] {
  if (queryKey === 'monthly_cash_flow') {
    return ['#10b981', '#ef4444', '#2563eb'];
  }

  if (queryKey === 'merchant_spend') {
    return ['#8b5cf6', '#2563eb', '#f97316', '#10b981', '#f43f5e'];
  }

  if (queryKey === 'account_balances') {
    return ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b'];
  }

  return ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
}

function buildWidgetFromIntent(
  intent: WidgetIntent,
  analytics: BankingAnalytics,
  existingWidget?: AIWidget | null
): AIWidget {
  const widgetType = intent.widget_type;
  const queryKey = intent.query_key ?? 'budget_health';
  const widget: AIWidget = {
    id: existingWidget?.id ?? crypto.randomUUID(),
    title: intent.title,
    description: intent.description,
    widget_type: widgetType,
    data_mode: intent.data_mode,
    query_key:
      widgetType === 'chart' && intent.data_mode === 'dynamic' ? queryKey : undefined,
    last_refreshed: new Date().toISOString(),
    config: {
      chartType: widgetType === 'simulation' ? 'simulation' : intent.chart_type ?? 'bar',
      xAxis: intent.x_axis ?? 'name',
      yAxis: intent.y_axis ?? 'value',
      colors: intent.colors ?? defaultWidgetColors(queryKey),
      customProps: {},
    },
  };

  if (widgetType === 'simulation') {
    return {
      ...widget,
      simulation_config: {
        simulation_type: intent.simulation_type ?? 'budget_planner',
        defaults: intent.defaults ?? {},
      },
    };
  }

  return {
    ...widget,
    config: {
      ...widget.config,
      customProps: {
        ...(widget.config.customProps ?? {}),
        data: queryDynamicData(queryKey, analytics),
      },
    },
  };
}

function findAccounts(prompt: string, analytics: BankingAnalytics): AccountSummary[] {
  const lowered = prompt.toLowerCase();
  return analytics.accountSummaries.filter((account) => lowered.includes(account.name.toLowerCase()));
}

function inferSimulationType(prompt: string): SimulationType {
  const lowered = prompt.toLowerCase();
  if (lowered.includes('emergency')) {
    return 'emergency_fund';
  }
  if (lowered.includes('savings') || lowered.includes('project')) {
    return 'savings_projector';
  }
  return 'budget_planner';
}

function inferWidgetIntent(
  prompt: string,
  analytics: BankingAnalytics,
  editingWidget: AIWidget | null | undefined
): WidgetIntent {
  const lowered = prompt.toLowerCase();

  if (
    editingWidget?.widget_type === 'simulation' ||
    lowered.includes('simulator') ||
    lowered.includes('planner') ||
    lowered.includes('what-if') ||
    lowered.includes('project')
  ) {
    const simulationType = inferSimulationType(prompt);
    return {
      title: editingWidget?.title ?? 'Budget planner',
      description:
        editingWidget?.description ??
        'Interactive planner for scenario testing and goal tracking.',
      widget_type: 'simulation',
      data_mode: 'static',
      simulation_type: simulationType,
      defaults:
        simulationType === 'emergency_fund'
          ? { monthly_expenses: Math.round(analytics.monthlyExpenses), savings_balance: Math.round(analytics.totalBalance) }
          : simulationType === 'savings_projector'
            ? { monthly_contribution: 500, target_amount: 10000 }
            : { monthly_budget: Math.round(analytics.monthlyExpenses), target_savings_rate: 20 },
    };
  }

  if (lowered.includes('merchant')) {
    return {
      title: editingWidget?.title ?? 'Top merchant spend',
      description: 'Current spend concentration by merchant.',
      widget_type: 'chart',
      data_mode: 'dynamic',
      chart_type: 'pie',
      query_key: 'merchant_spend',
      x_axis: 'name',
      y_axis: 'value',
    };
  }

  if (lowered.includes('balance')) {
    return {
      title: editingWidget?.title ?? 'Account balances',
      description: 'Current balances across your accounts.',
      widget_type: 'chart',
      data_mode: 'dynamic',
      chart_type: 'bar',
      query_key: 'account_balances',
      x_axis: 'name',
      y_axis: 'balance',
    };
  }

  if (lowered.includes('cash flow')) {
    return {
      title: editingWidget?.title ?? 'Monthly cash flow',
      description: 'Income, expenses, and net cash flow by month.',
      widget_type: 'chart',
      data_mode: 'dynamic',
      chart_type: 'line',
      query_key: 'monthly_cash_flow',
      x_axis: 'month',
      y_axis: 'net',
    };
  }

  return {
    title: editingWidget?.title ?? 'Budget health tracker',
    description: 'Dynamic view of spend against current monthly budgets.',
    widget_type: 'chart',
    data_mode: 'dynamic',
    chart_type: 'bar',
    query_key: 'budget_health',
    x_axis: 'name',
    y_axis: 'spent',
  };
}

function findCategoryName(prompt: string, context: RouteContext): string | null {
  const lowered = prompt.toLowerCase();
  const match = context.categories.find((category) => lowered.includes(category.name.toLowerCase()));
  return match?.name ?? null;
}

function runFabricAgent(prompt: string, context: RouteContext) {
  const lowered = prompt.toLowerCase();
  const analytics = context.analytics;

  if (lowered.includes('grocery')) {
    const grocery = analytics.categorySpend.find((item) => item.name.toLowerCase().includes('grocer'));
    if (grocery) {
      return {
        reply: `You have spent $${Math.round(grocery.spent).toLocaleString()} on ${grocery.name.toLowerCase()} this month against a $${Math.round(grocery.budget).toLocaleString()} budget.`,
        open_section: 'analytics' as const,
      };
    }
  }

  if (lowered.includes('balance')) {
    const lines = analytics.accountSummaries
      .map((account) => `${account.name}: $${Math.round(account.currentBalance).toLocaleString()}`)
      .join('\n');
    return {
      reply: lines || 'No account balances are available yet.',
      open_section: 'overview' as const,
    };
  }

  return {
    reply: `This month you brought in $${Math.round(analytics.monthlyIncome).toLocaleString()}, spent $${Math.round(analytics.monthlyExpenses).toLocaleString()}, and are tracking a ${analytics.savingsRate.toFixed(1)}% savings rate.`,
    open_section: 'analytics' as const,
  };
}

function runAccountAgent(prompt: string, context: RouteContext) {
  const lowered = prompt.toLowerCase();
  const amountMatch = /\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/.exec(prompt);
  const amount = clampCurrency(amountMatch?.[1]);
  const matchedAccounts = findAccounts(prompt, context.analytics);

  if (/(create|open).*(account)/i.test(lowered)) {
    const institutionMatch = /(?:at|with)\s+([A-Za-z0-9 .&'-]{3,60})/i.exec(prompt);
    const accountType = lowered.includes('savings')
      ? 'savings'
      : lowered.includes('investment') || lowered.includes('brokerage')
        ? 'investment'
        : 'checking';

    return {
      reply: 'I prepared a new account for the Move Money workspace.',
      open_section: 'move-money' as const,
      action: {
        type: 'create_account' as const,
        payload: {
          name: `${accountType.charAt(0).toUpperCase()}${accountType.slice(1)} Account`,
          accountType,
          institution: institutionMatch?.[1]?.trim() ?? 'Contoso Credit Union',
          openingBalance: amount,
        },
      },
    };
  }

  if ((lowered.includes('transfer') || lowered.includes('move money')) && matchedAccounts.length >= 2 && amount > 0) {
    const fromAccount = matchedAccounts[0];
    const toAccount = matchedAccounts[1];

    return {
      reply: `I prepared a $${amount.toLocaleString()} transfer from ${fromAccount.name} to ${toAccount.name}.`,
      open_section: 'move-money' as const,
      action: {
        type: 'create_transaction' as const,
        payload: {
          transactionType: 'transfer',
          amount,
          description: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          counterpartyName: toAccount.name,
        },
      },
    };
  }

  if (lowered.includes('deposit') && matchedAccounts.length >= 1 && amount > 0) {
    const destination = matchedAccounts[0];
    return {
      reply: `I prepared a $${amount.toLocaleString()} deposit into ${destination.name}.`,
      open_section: 'move-money' as const,
      action: {
        type: 'create_transaction' as const,
        payload: {
          transactionType: 'deposit',
          amount,
          description: `Deposit into ${destination.name}`,
          toAccountId: destination.id,
        },
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
    const category = context.categories.find((item) =>
      lowered.includes(item.name.toLowerCase())
    );

    return {
      reply: `I prepared a $${amount.toLocaleString()} payment from ${source.name}.`,
      open_section: 'move-money' as const,
      action: {
        type: 'create_transaction' as const,
        payload: {
          transactionType: lowered.includes('withdraw') ? 'withdrawal' : 'payment',
          amount,
          description: prompt.trim(),
          fromAccountId: source.id,
          categoryId: category?.id ?? undefined,
          merchantName: merchantMatch?.[1]?.trim() ?? undefined,
        },
      },
    };
  }

  return {
    reply:
      'I can help open an account or prepare a money movement once you specify the account names and amount.',
    open_section: 'move-money' as const,
    action: null,
  };
}

function runSupportAgent(context: RouteContext) {
  return {
    reply:
      context.transactions.length === 0
        ? 'Ask about balances, spending, transfers, or charts and I will use your current banking data to help.'
        : 'I can answer banking questions, prepare account actions, and build AI Module widgets from your current data.',
    open_section: 'ai-module' as const,
  };
}

function runVisualizationAgent(
  prompt: string,
  analytics: BankingAnalytics,
  editingWidget: AIWidget | null | undefined
) {
  const intent = inferWidgetIntent(prompt, analytics, editingWidget);
  const widget = buildWidgetFromIntent(intent, analytics, editingWidget);
  return {
    reply:
      widget.widget_type === 'simulation'
        ? 'Prepared a simulator in the AI Module.'
        : `Prepared a ${widget.data_mode} ${widget.config.chartType} chart in the AI Module.`,
    open_section: 'ai-module' as const,
    widget,
  };
}

export async function runLocalAgentWorkflow(input: {
  userId: string;
  sessionId: string;
  prompt: string;
  snapshot: BankingSnapshot;
  analytics: BankingAnalytics;
  editingWidget?: AIWidget | null;
  editingWidgetId?: string | null;
  createWidgetHint?: boolean;
}): Promise<AgentApiResponse> {
  void input.userId;
  void input.editingWidgetId;

  const context: RouteContext = {
    profile: input.snapshot.profile,
    accounts: input.snapshot.accounts,
    categories: input.snapshot.categories,
    transactions: input.snapshot.transactions,
    analytics: input.analytics,
  };

  const route = heuristicRoute(
    input.prompt,
    input.editingWidget,
    Boolean(input.createWidgetHint)
  );

  const trace = [
    makeTrace('coordinator', 'Coordinator routed the request', `Routed to ${route}.`),
  ];

  if (route === 'visualization_agent') {
    const result = runVisualizationAgent(input.prompt, input.analytics, input.editingWidget);
    trace.push(
      makeTrace(
        'visualization_agent',
        'Visualization specialist completed the request',
        'Prepared an AI Module widget or simulator from the latest banking context.'
      )
    );

    return {
      response: result.reply,
      session_id: input.sessionId,
      trace,
      widget: result.widget,
      widget_created: !input.editingWidget,
      widget_updated: Boolean(input.editingWidget),
      widget_mode: result.widget.data_mode,
      widget_type: result.widget.widget_type,
      simulation_type: result.widget.simulation_config?.simulation_type,
      open_section: result.open_section,
      actions: [],
    };
  }

  if (route === 'support_agent') {
    const result = runSupportAgent(context);
    trace.push(
      makeTrace(
        'support_agent',
        'Support specialist answered the request',
        'Explained the app behavior and available actions.'
      )
    );

    return {
      response: result.reply,
      session_id: input.sessionId,
      trace,
      open_section: result.open_section,
      actions: [],
    };
  }

  if (route === 'account_agent') {
    const result = runAccountAgent(input.prompt, context);
    trace.push(
      makeTrace(
        'account_agent',
        'Account specialist handled the request',
        'Prepared a banking action or direct answer.'
      )
    );

    return {
      response: result.reply,
      session_id: input.sessionId,
      trace,
      open_section: result.open_section,
      actions: result.action ? [result.action] : [],
    };
  }

  const result = runFabricAgent(input.prompt, context);
  trace.push(
    makeTrace(
      'fabric_agent',
      'Data specialist answered from the banking context',
      `Answered using balances, ${findCategoryName(input.prompt, context) ?? 'budget data'}, and recent activity.`
    )
  );

  return {
    response: result.reply,
    session_id: input.sessionId,
    trace,
    open_section: result.open_section,
    actions: [],
  };
}
