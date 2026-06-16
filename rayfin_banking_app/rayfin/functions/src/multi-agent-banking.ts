import { makeTrace } from './agent-tools.js';
import {
  routeRequest,
  runAccountAgent,
  runFabricAgent,
  runSupportAgent,
  runVisualizationAgent,
} from './agents.js';
import type { AIWidget, AgentApiResponse, RouteContext } from './banking-agent-types.js';

export async function runMultiAgentWorkflow(
  prompt: string,
  context: RouteContext,
  sessionId: string,
  userId: string,
  editingWidget?: AIWidget | null,
  createWidgetHint = false
): Promise<AgentApiResponse> {
  void userId;

  const routing = await routeRequest(prompt, context, editingWidget, createWidgetHint);
  const route = routing.route ?? 'fabric_agent';
  const trace = [
    makeTrace(
      'coordinator',
      'Coordinator routed the request',
      routing.reason || `Routed to ${route}.`
    ),
  ];

  if (route === 'visualization_agent') {
    const result = await runVisualizationAgent(prompt, context, editingWidget);
    trace.push(
      makeTrace(
        'visualization_agent',
        'Visualization specialist completed the request',
        'Prepared an AI Module widget or simulator from the latest banking context.'
      )
    );

    return {
      response: result.reply,
      session_id: sessionId,
      trace,
      widget: result.widget,
      widget_created: !editingWidget,
      widget_updated: Boolean(editingWidget),
      widget_mode: result.widget?.data_mode,
      widget_type: result.widget?.widget_type,
      simulation_type: result.widget?.simulation_config?.simulation_type,
      open_section: result.open_section ?? 'ai-module',
      actions: [],
    };
  }

  if (route === 'support_agent') {
    const result = await runSupportAgent(prompt, context);
    trace.push(
      makeTrace(
        'support_agent',
        'Support specialist answered the request',
        'Explained the app behavior and agent capabilities.'
      )
    );

    return {
      response: result.reply,
      session_id: sessionId,
      trace,
      open_section: result.open_section ?? 'ai-module',
      actions: [],
    };
  }

  if (route === 'account_agent') {
    const result = await runAccountAgent(prompt, context);
    trace.push(
      makeTrace(
        'account_agent',
        'Account specialist handled the request',
        'Prepared a banking action or direct answer.'
      )
    );

    return {
      response: result.reply,
      session_id: sessionId,
      trace,
      open_section: result.open_section ?? 'move-money',
      actions: result.action ? [result.action] : [],
    };
  }

  const result = await runFabricAgent(prompt, context);
  trace.push(
    makeTrace(
      'fabric_agent',
      'Data specialist answered from the banking context',
      'Resolved a read-only analytics question.'
    )
  );

  return {
    response: result.reply,
    session_id: sessionId,
    trace,
    open_section: result.open_section ?? 'analytics',
    actions: [],
  };
}
