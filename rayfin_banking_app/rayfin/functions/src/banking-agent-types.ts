export type AIWidgetMode = 'static' | 'dynamic';
export type AIChartType = 'bar' | 'line' | 'pie' | 'area';
export type AIWidgetType = 'chart' | 'simulation';
export type AIWidgetQueryKey =
  | 'monthly_cash_flow'
  | 'budget_health'
  | 'merchant_spend'
  | 'account_balances';
export type SimulationType =
  | 'budget_planner'
  | 'savings_projector'
  | 'emergency_fund';
export type AgentName =
  | 'coordinator'
  | 'fabric_agent'
  | 'account_agent'
  | 'support_agent'
  | 'visualization_agent';

export interface AIChartDatum {
  [key: string]: number | string;
}

export interface AIWidgetConfig {
  chartType: AIChartType | 'simulation';
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  customProps?: {
    data?: AIChartDatum[];
    referenceValue?: number;
  };
}

export interface SimulationConfig {
  simulation_type: SimulationType;
  defaults: Record<string, number | string>;
}

export interface AIWidget {
  id: string;
  title: string;
  description: string;
  widget_type: AIWidgetType;
  config: AIWidgetConfig;
  data_mode: AIWidgetMode;
  query_key?: AIWidgetQueryKey;
  last_refreshed: string | null;
  simulation_config?: SimulationConfig;
}

export interface AgentTraceStep {
  agent: AgentName;
  title: string;
  detail: string;
  status?: 'completed' | 'fallback';
}

export interface AgentAction {
  type: 'create_account' | 'create_transaction';
  payload: Record<string, unknown>;
}

export interface AgentApiResponse {
  response: string;
  session_id: string;
  trace?: AgentTraceStep[];
  widget?: AIWidget;
  widget_created?: boolean;
  widget_updated?: boolean;
  widget_mode?: AIWidgetMode;
  widget_type?: AIWidgetType;
  simulation_type?: SimulationType;
  open_section?: 'overview' | 'activity' | 'move-money' | 'analytics' | 'ai-module';
  actions?: AgentAction[];
}

export interface BankingSnapshot {
  profile?: Record<string, unknown> | null;
  accounts?: Array<Record<string, unknown>>;
  categories?: Array<{ id: string; name: string } & Record<string, unknown>>;
  transactions?: Array<Record<string, unknown>>;
}

export interface MonthlyCashFlowPoint {
  monthLabel: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TopMerchant {
  merchantName: string;
  amount: number;
  transactionCount: number;
}

export interface AccountSummary {
  id: string;
  name: string;
  currentBalance: number;
  netChange?: number;
  accountType: string;
}

export interface CategorySpend {
  name: string;
  spent: number;
  budget: number;
  remaining: number;
  exceededAmount: number;
}

export interface BankingAnalytics {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  savingsRate?: number;
  budgetHealth?: Record<string, unknown>;
  categorySpend?: CategorySpend[];
  topMerchants?: TopMerchant[];
  recentTransactions?: Array<Record<string, unknown>>;
  monthlyCashFlow?: MonthlyCashFlowPoint[];
  accountSummaries?: AccountSummary[];
}

export interface ChatWithBankingAgentsInput {
  userId: string;
  sessionId: string;
  prompt: string;
  snapshot: BankingSnapshot;
  analytics: BankingAnalytics;
  editingWidget?: AIWidget | null;
  editingWidgetId?: string | null;
  createWidgetHint?: boolean;
}

export interface RouteDecision {
  route: 'fabric_agent' | 'account_agent' | 'support_agent' | 'visualization_agent';
  reason: string;
}

export interface WidgetIntent {
  title: string;
  description: string;
  widget_type: AIWidgetType;
  data_mode: AIWidgetMode;
  chart_type?: AIChartType;
  query_key?: AIWidgetQueryKey;
  x_axis?: string;
  y_axis?: string;
  colors?: string[];
  simulation_type?: SimulationType;
  defaults?: Record<string, number | string>;
}

export interface RouteContext {
  profile?: Record<string, unknown> | null;
  accounts: Array<Record<string, unknown>>;
  categories: Array<{ id: string; name: string } & Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
  analytics: BankingAnalytics;
}

export interface AgentReply {
  reply: string;
  open_section?: 'overview' | 'activity' | 'move-money' | 'analytics' | 'ai-module';
}

export interface AccountAgentReply extends AgentReply {
  action: AgentAction | null;
}

export interface VisualizationAgentReply extends AgentReply {
  widget_intent: WidgetIntent;
  widget?: AIWidget;
}
