import { getRayfinClient } from '@/services/rayfinClient';
import { buildBankingAnalytics } from '@/services/bankingAnalytics';
import { loadBankingSnapshot } from '@/services/bankingData';
import type { BankingAnalytics } from '@/types/banking';
import type {
  AgentApiResponse,
  AIChartDatum,
  AIWidget,
  AIWidgetMode,
  AIWidgetQueryKey,
  AIWidgetType,
  SimulationType,
} from '@/types/aiModule';
import type { AppSchema } from '../../rayfin/data/schema';

type StoredWidgetRecord = AppSchema['AIWidgetRecord'];

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function queryDynamicData(
  queryKey: AIWidgetQueryKey,
  analytics: BankingAnalytics
): AIChartDatum[] {
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

  return analytics.categorySpend.map((item) => ({
    name: item.name,
    spent: item.spent,
    budget: item.budget,
    remaining: item.remaining,
    exceeded: item.exceededAmount,
  }));
}

function parseJsonArray<T>(value: string | undefined): T[] | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T[];
  } catch {
    return undefined;
  }
}

function parseJsonObject(value: string | undefined): Record<string, number | string> | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as Record<string, number | string>;
  } catch {
    return undefined;
  }
}

async function loadBankingContext(): Promise<{ analytics: BankingAnalytics }> {
  const snapshot = await loadBankingSnapshot();
  return {
    analytics: buildBankingAnalytics(snapshot),
  };
}

function toWidget(record: StoredWidgetRecord, analytics: BankingAnalytics): AIWidget {
  const widget: AIWidget = {
    id: record.id,
    title: record.title,
    description: record.description,
    widget_type: record.widget_type as AIWidgetType,
    data_mode: record.data_mode as AIWidgetMode,
    query_key: record.query_key as AIWidgetQueryKey | undefined,
    last_refreshed: record.last_refreshed ? toIsoDate(record.last_refreshed) : null,
    config: {
      chartType:
        record.widget_type === 'simulation'
          ? 'simulation'
          : (record.chart_type as AIWidget['config']['chartType']),
      xAxis: record.x_axis,
      yAxis: record.y_axis,
      colors: parseJsonArray<string>(record.colors_json),
      customProps: {
        data: parseJsonArray<AIChartDatum>(record.custom_data_json),
      },
    },
    simulation_config: record.simulation_type
      ? {
          simulation_type: record.simulation_type as SimulationType,
          defaults: parseJsonObject(record.simulation_defaults_json) ?? {},
        }
      : undefined,
  };

  if (widget.data_mode === 'dynamic' && widget.query_key) {
    widget.config.customProps = {
      ...widget.config.customProps,
      data: queryDynamicData(widget.query_key, analytics),
    };
  }

  return widget;
}

async function persistWidget(userId: string, widget: AIWidget): Promise<void> {
  const client = getRayfinClient();
  const existing = await client.data.AIWidgetRecord.findById(widget.id);
  const payload = {
    title: widget.title,
    description: widget.description,
    widget_type: widget.widget_type,
    data_mode: widget.data_mode,
    chart_type: widget.widget_type === 'simulation' ? 'simulation' : widget.config.chartType,
    query_key: widget.query_key,
    x_axis: widget.config.xAxis,
    y_axis: widget.config.yAxis,
    colors_json: widget.config.colors ? JSON.stringify(widget.config.colors) : undefined,
    custom_data_json: widget.config.customProps?.data
      ? JSON.stringify(widget.config.customProps.data)
      : undefined,
    simulation_type: widget.simulation_config?.simulation_type,
    simulation_defaults_json: widget.simulation_config
      ? JSON.stringify(widget.simulation_config.defaults)
      : undefined,
    last_refreshed: widget.last_refreshed ? new Date(widget.last_refreshed) : undefined,
  };

  if (existing) {
    await client.data.AIWidgetRecord.update({ id: widget.id }, payload);
    return;
  }

  await client.data.AIWidgetRecord.create({
    id: widget.id,
    user_id: userId,
    ...payload,
  });
}

async function saveChatMessage(
  userId: string,
  sessionId: string,
  role: 'assistant' | 'user',
  content: string
): Promise<void> {
  await getRayfinClient().data.AgentChatMessage.create({
    id: crypto.randomUUID(),
    sessionId,
    role,
    content: content.slice(0, 2000),
    createdAt: new Date(),
    user_id: userId,
  });
}

async function findWidgetForEditing(widgetId: string | null | undefined): Promise<AIWidget | null> {
  if (!widgetId) {
    return null;
  }

  const record = await getRayfinClient().data.AIWidgetRecord.findById(widgetId);
  if (!record) {
    return null;
  }

  const { analytics } = await loadBankingContext();
  return toWidget(record, analytics);
}

export async function fetchAIWidgets(userId: string): Promise<AIWidget[]> {
  const { analytics } = await loadBankingContext();
  const records = await getRayfinClient().data.AIWidgetRecord.select([
    'id',
    'title',
    'description',
    'widget_type',
    'data_mode',
    'chart_type',
    'query_key',
    'x_axis',
    'y_axis',
    'colors_json',
    'custom_data_json',
    'simulation_type',
    'simulation_defaults_json',
    'last_refreshed',
    'user_id',
  ])
    .where({ user_id: userId })
    .execute();

  return records.map((record) => toWidget(record, analytics));
}

export async function refreshAIWidget(userId: string, widgetId: string): Promise<AIWidget> {
  const { analytics } = await loadBankingContext();
  const record = await getRayfinClient().data.AIWidgetRecord.findById(widgetId);
  if (!record) {
    throw new Error('Widget not found.');
  }

  const refreshed: AIWidget = {
    ...toWidget(record, analytics),
    last_refreshed: new Date().toISOString(),
  };
  await persistWidget(userId, refreshed);
  return refreshed;
}

export async function deleteAIWidget(widgetId: string): Promise<void> {
  await getRayfinClient().data.AIWidgetRecord.delete({ id: widgetId });
}

export async function fetchChatHistory(
  sessionId: string
): Promise<Array<{ role: 'assistant' | 'user'; content: string }>> {
  const messages = await getRayfinClient().data.AgentChatMessage.select([
    'id',
    'sessionId',
    'role',
    'content',
    'createdAt',
    'user_id',
  ])
    .where({ sessionId })
    .orderBy({ createdAt: 'asc' })
    .execute();

  return messages.map((message) => ({
    role: message.role as 'assistant' | 'user',
    content: message.content,
  }));
}

export async function sendChatPrompt(input: {
  userId: string;
  sessionId: string;
  prompt: string;
  editingWidgetId?: string | null;
  createWidgetHint?: boolean;
}): Promise<AgentApiResponse> {
  const snapshot = await loadBankingSnapshot();
  const analytics = buildBankingAnalytics(snapshot);
  const editingWidget = await findWidgetForEditing(input.editingWidgetId);
  const response = await getRayfinClient().functions.chatWithBankingAgents.invoke({
    input: {
      userId: input.userId,
      sessionId: input.sessionId,
      prompt: input.prompt,
      snapshot,
      analytics,
      editingWidget,
      editingWidgetId: input.editingWidgetId ?? null,
      createWidgetHint: input.createWidgetHint ?? false,
    },
  });

  if (response.widget) {
    await persistWidget(input.userId, response.widget);
  }

  await saveChatMessage(input.userId, input.sessionId, 'user', input.prompt);
  await saveChatMessage(input.userId, input.sessionId, 'assistant', response.response);

  return response;
}
