export type AIWidgetMode = 'static' | 'dynamic';
export type AIChartType = 'bar' | 'line' | 'pie' | 'area';
export type AIWidgetType = 'chart' | 'simulation';
export type AIWidgetQueryKey = 'monthly_cash_flow' | 'budget_health' | 'merchant_spend' | 'account_balances';
export type SimulationType = 'budget_planner' | 'savings_projector' | 'emergency_fund';
export type AgentName = 'coordinator' | 'fabric_agent' | 'account_agent' | 'support_agent' | 'visualization_agent';
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
export interface AgentWorkflowResult {
    reply: string;
    trace: AgentTraceStep[];
    widget?: AIWidget;
    widgetCreated?: boolean;
    widgetUpdated?: boolean;
    widgetMode?: AIWidgetMode;
    widgetType?: AIWidgetType;
    simulationType?: SimulationType;
    openSection?: 'overview' | 'activity' | 'move-money' | 'analytics' | 'ai-module';
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
