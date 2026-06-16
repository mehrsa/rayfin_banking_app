import {
  Bot,
  LoaderCircle,
  MessageSquareText,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchChatHistory,
  sendChatPrompt,
} from '@/services/agentApi';
import type {
  CreateAccountInput,
  CreateMoneyMovementInput,
} from '@/types/banking';
import type { AgentApiResponse, AgentTraceStep, AIWidget } from '@/types/aiModule';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  trace?: AgentTraceStep[];
  widgetCreated?: boolean;
  widgetUpdated?: boolean;
  widgetType?: 'chart' | 'simulation';
  widgetMode?: 'static' | 'dynamic';
  simulationType?: string;
}

interface AgentChatProps {
  userId: string;
  userName?: string;
  editingWidget: AIWidget | null;
  currentSection: 'overview' | 'activity' | 'move-money' | 'analytics' | 'ai-module';
  onClearEditingWidget: () => void;
  onWidgetSave: (widget: AIWidget) => void;
  onOpenSection: (
    section: 'overview' | 'activity' | 'move-money' | 'analytics' | 'ai-module'
  ) => void;
  createAccount: (input: CreateAccountInput) => Promise<void>;
  createTransaction: (input: CreateMoneyMovementInput) => Promise<void>;
  refreshBankingData: () => Promise<unknown>;
}

const starterPrompts = [
  'Show my latest balances',
  'How much have I spent on groceries this month?',
  'Create a budget health widget',
  'Build an emergency fund simulator',
  'Transfer $250 from Everyday Checking to High Yield Savings',
];

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionStorageKey(userId: string): string {
  return `rayfin-agent-session:${userId}`;
}

function createOrLoadSessionId(userId: string): string {
  const key = getSessionStorageKey(userId);
  const existing = sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = `session-${crypto.randomUUID()}`;
  sessionStorage.setItem(key, created);
  return created;
}

function initialAssistantMessage(): ChatMessage {
  return {
    id: createId('message'),
    role: 'assistant',
    content:
      'I can route requests through the Rayfin coordinator and specialist workflow: ask for banking answers, create AI widgets, or build a simulator for your finances.',
  };
}

function isWidgetPrompt(prompt: string, section: AgentChatProps['currentSection']): boolean {
  return (
    section === 'ai-module' ||
    /create.*(chart|graph|visual|widget|pie|bar|line|simulator|calculator|projection|what.?if)/i.test(
      prompt
    ) ||
    /show.*as.*(chart|graph|pie|bar)/i.test(prompt) ||
    /(loan|mortgage|savings|budget|retirement|emergency).*(calculator|simulator|planner|projector)/i.test(
      prompt
    )
  );
}

export function AgentChat({
  userId,
  userName,
  editingWidget,
  currentSection,
  onClearEditingWidget,
  onWidgetSave,
  onOpenSection,
  createAccount,
  createTransaction,
  refreshBankingData,
}: AgentChatProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage()]);
  const [sessionId] = useState(() => createOrLoadSessionId(userId));
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const promptSuggestions = useMemo(
    () =>
      editingWidget
        ? [
            `Change the title to "${editingWidget.title} - refreshed"`,
            'Switch this widget to a bar chart',
            'Update this to a line chart',
          ]
        : starterPrompts,
    [editingWidget]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const history = await fetchChatHistory(sessionId);

        if (cancelled || history.length === 0) {
          return;
        }

        setMessages(
          history.map((message) => ({
            id: createId('message'),
            role: message.role,
            content: message.content,
          }))
        );
      } catch {
        // Keep the default assistant message when history cannot be loaded.
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [sessionId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, submitting]);

  useEffect(() => {
    if (!editingWidget) {
      return;
    }

    setMessages((current) => {
      const alreadyPrompted = current.some((message) =>
        message.content.includes(editingWidget.title)
      );
      if (alreadyPrompted) {
        return current;
      }

      return [
        ...current,
        {
          id: createId('message'),
          role: 'assistant',
          content:
            editingWidget.widget_type === 'simulation'
              ? `Editing **${editingWidget.title}**. You can change the title or update its defaults, such as the monthly contribution or target amount.`
              : `Editing **${editingWidget.title}**. Ask me to change the chart type, retitle it, or regenerate it for a different finance question.`,
        },
      ];
    });
  }, [editingWidget]);

  async function executeActions(response: AgentApiResponse) {
    for (const action of response.actions ?? []) {
      if (action.type === 'create_account') {
        await createAccount(action.payload as unknown as CreateAccountInput);
      }

      if (action.type === 'create_transaction') {
        await createTransaction(action.payload as unknown as CreateMoneyMovementInput);
      }
    }

    if ((response.actions ?? []).length > 0) {
      await refreshBankingData();
    }
  }

  async function submitPrompt(prompt: string) {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      return;
    }

    setSubmitting(true);
    setInput('');
    setMessages((current) => [
      ...current,
      { id: createId('message'), role: 'user', content: nextPrompt },
    ]);

    try {
      const response = await sendChatPrompt({
        userId,
        sessionId,
        prompt: nextPrompt,
        editingWidgetId: editingWidget?.id ?? null,
        createWidgetHint: isWidgetPrompt(nextPrompt, currentSection),
      });

      if (response.widget) {
        onWidgetSave(response.widget);
      }

      await executeActions(response);

      setMessages((current) => [
        ...current,
        {
          id: createId('message'),
          role: 'assistant',
          content: response.response,
          trace: response.trace,
          widgetCreated: response.widget_created,
          widgetUpdated: response.widget_updated,
          widgetType: response.widget_type,
          widgetMode: response.widget_mode,
          simulationType: response.simulation_type,
        },
      ]);

      if (response.open_section) {
        onOpenSection(response.open_section);
      }

      if (response.widget_updated) {
        onClearEditingWidget();
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createId('message'),
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'The Rayfin banking workspace could not complete that request.',
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
      <div className="border-b border-gray-200 bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-800 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Rayfin multi-agent chat
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              {userName ? `${userName}'s AI banking desk` : 'AI banking desk'}
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Coordinator + data, account, support, and visualization specialists backed by your Rayfin data.
            </p>
          </div>
        </div>
      </div>

      {editingWidget && (
        <div className="border-b border-indigo-100 bg-indigo-50 px-5 py-3 text-sm text-indigo-900">
          Editing <span className="font-semibold">{editingWidget.title}</span>. Ask for
          a retitle, a chart-type change, or updated simulator defaults.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Bot className="h-4 w-4" />
              </span>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'bg-gray-950 text-white'
                  : 'bg-gray-50 text-gray-800 ring-1 ring-gray-200'
              }`}
            >
              <p className="whitespace-pre-line">{message.content}</p>

              {message.trace && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.trace.map((step, index) => (
                    <span
                      key={`${step.agent}-${index}`}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        step.status === 'fallback'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                      title={step.detail}
                    >
                      {step.title}
                    </span>
                  ))}
                </div>
              )}

              {(message.widgetCreated || message.widgetUpdated) && (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                  {message.widgetType === 'simulation'
                    ? `AI Module updated with a ${message.simulationType?.replace(/_/g, ' ')} simulator.`
                    : `AI Module updated with a ${message.widgetMode} visualization.`}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-950 text-white">
                <User className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}

        {submitting && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <LoaderCircle className="h-4 w-4 animate-spin" />
            </span>
            Routing your request through the Rayfin specialist workflow...
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {promptSuggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void submitPrompt(prompt)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitPrompt(input);
          }}
        >
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              <MessageSquareText className="h-3.5 w-3.5" />
              Ask the banking agents
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              placeholder="Create a cash flow widget, explain my budget risk, or move money between accounts..."
              className="w-full resize-none border-0 p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-950 px-4 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
