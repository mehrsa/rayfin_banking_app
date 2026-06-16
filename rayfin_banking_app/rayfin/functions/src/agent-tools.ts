import { randomUUID } from 'node:crypto';

import type {
  AgentName,
  AgentTraceStep,
  AIWidget,
  AIWidgetQueryKey,
  BankingAnalytics,
  CategorySpend,
  RouteContext,
  WidgetIntent,
} from './banking-agent-types.js';

export function makeTrace(
  agent: AgentName,
  title: string,
  detail: string,
  status: AgentTraceStep['status'] = 'completed'
): AgentTraceStep {
  return {
    agent,
    title,
    detail,
    status,
  };
}

export function heuristicRoute(
  prompt: string,
  editingWidget: AIWidget | null | undefined,
  createWidgetHint: boolean
): 'fabric_agent' | 'account_agent' | 'support_agent' | 'visualization_agent' {
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

function queryData(queryKey: AIWidgetQueryKey, analytics: BankingAnalytics) {
  if (queryKey === 'monthly_cash_flow') {
    return (analytics.monthlyCashFlow ?? []).map((point) => ({
      month: point.monthLabel,
      income: point.income,
      expenses: point.expenses,
      net: point.net,
    }));
  }

  if (queryKey === 'merchant_spend') {
    return (analytics.topMerchants ?? []).map((merchant) => ({
      name: merchant.merchantName,
      value: merchant.amount,
      transactions: merchant.transactionCount,
    }));
  }

  if (queryKey === 'account_balances') {
    return (analytics.accountSummaries ?? []).map((account) => ({
      name: account.name,
      balance: account.currentBalance,
      change: account.netChange ?? 0,
    }));
  }

  return (analytics.categorySpend ?? []).map((item: CategorySpend) => ({
    name: item.name,
    spent: item.spent,
    budget: item.budget,
    remaining: item.remaining,
    exceeded: item.exceededAmount,
  }));
}

export function hydrateWidget(widget: AIWidget, analytics: BankingAnalytics): AIWidget {
  if (widget.data_mode !== 'dynamic' || !widget.query_key) {
    return widget;
  }

  return {
    ...widget,
    config: {
      ...widget.config,
      customProps: {
        ...(widget.config.customProps ?? {}),
        data: queryData(widget.query_key, analytics),
      },
    },
  };
}

export function refreshWidget(widget: AIWidget, analytics: BankingAnalytics): AIWidget {
  return {
    ...hydrateWidget(widget, analytics),
    last_refreshed: new Date().toISOString(),
  };
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

export function buildWidgetFromIntent(
  intent: WidgetIntent,
  analytics: BankingAnalytics,
  existingWidget?: AIWidget | null
): AIWidget {
  const widgetType = intent.widget_type ?? 'chart';
  const queryKey = intent.query_key ?? 'budget_health';

  const widget: AIWidget = {
    id: existingWidget?.id ?? randomUUID(),
    title: intent.title || 'AI widget',
    description: intent.description || '',
    widget_type: widgetType,
    data_mode: intent.data_mode ?? 'dynamic',
    query_key: widgetType === 'chart' && (intent.data_mode ?? 'dynamic') === 'dynamic' ? queryKey : undefined,
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

  return hydrateWidget(widget, analytics);
}

export function summarizeContext(context: RouteContext) {
  const analytics = context.analytics ?? {};

  return {
    profile: context.profile,
    accounts: (analytics.accountSummaries ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      balance: account.currentBalance,
      type: account.accountType,
    })),
    budget_health: analytics.budgetHealth ?? {},
    category_spend: (analytics.categorySpend ?? []).slice(0, 8),
    top_merchants: (analytics.topMerchants ?? []).slice(0, 5),
    recent_transactions: (analytics.recentTransactions ?? []).slice(0, 8),
    monthly_cash_flow: analytics.monthlyCashFlow ?? [],
  };
}

export function clampCurrency(value: unknown): number {
  const normalized = String(value ?? '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .trim();
  const numeric = Number.parseFloat(normalized);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.floor(numeric * 100) / 100;
}
