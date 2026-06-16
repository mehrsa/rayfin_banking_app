import {
  Bot,
  Edit3,
  LineChart,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { AIWidgetRenderer } from '@/components/AIWidgetRenderer';
import { SimulationWidgetRenderer } from '@/components/SimulationWidgetRenderer';
import type { AIWidget } from '@/types/aiModule';

interface AIModuleProps {
  widgets: AIWidget[];
  onOpenChat: (widget?: AIWidget) => void;
  onRefreshWidget: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
}

type WidgetFilter = 'all' | 'charts' | 'simulations';

function formatLastUpdated(value: string | null): string {
  if (!value) {
    return 'Not refreshed yet';
  }

  const deltaInMinutes = Math.max(
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
    0
  );

  if (deltaInMinutes < 1) {
    return 'Updated just now';
  }

  if (deltaInMinutes < 60) {
    return `Updated ${deltaInMinutes}m ago`;
  }

  return `Updated ${Math.round(deltaInMinutes / 60)}h ago`;
}

export function AIModule({
  widgets,
  onOpenChat,
  onRefreshWidget,
  onDeleteWidget,
}: AIModuleProps) {
  const [filter, setFilter] = useState<WidgetFilter>('all');
  const chartCount = widgets.filter((widget) => widget.widget_type === 'chart').length;
  const simulationCount = widgets.filter(
    (widget) => widget.widget_type === 'simulation'
  ).length;

  const filteredWidgets = useMemo(() => {
    if (filter === 'charts') {
      return widgets.filter((widget) => widget.widget_type === 'chart');
    }
    if (filter === 'simulations') {
      return widgets.filter((widget) => widget.widget_type === 'simulation');
    }
    return widgets;
  }, [filter, widgets]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-blue-900 to-sky-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Multi-agent workspace
            </div>
            <h2 className="mt-4 text-3xl font-semibold">AI Module</h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              This mirrors the sample’s coordinator plus specialist-agent experience:
              use chat to ask questions, create dynamic widgets, or build planners and
              simulators that live here.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onOpenChat()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-blue-50"
            >
              <Bot className="h-4 w-4" />
              Open agent chat
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm text-blue-100">Total modules</p>
            <p className="mt-2 text-3xl font-semibold">{widgets.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm text-blue-100">Dynamic charts</p>
            <p className="mt-2 text-3xl font-semibold">{chartCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm text-blue-100">Simulators</p>
            <p className="mt-2 text-3xl font-semibold">{simulationCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200">
          {([
            ['all', `All (${widgets.length})`],
            ['charts', `Charts (${chartCount})`],
            ['simulations', `Simulators (${simulationCount})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === value
                  ? 'bg-gray-950 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Refresh dynamic cards after new transactions or account changes.
        </p>
      </div>

      {filteredWidgets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <Sparkles className="mx-auto h-10 w-10 text-indigo-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">No AI modules yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Ask for a cash flow chart, a budget health widget, or an emergency fund
            simulator and the visualization agent will add it here.
          </p>
          <button
            type="button"
            onClick={() => onOpenChat()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Bot className="h-4 w-4" />
            Create with chat
          </button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredWidgets.map((widget) => (
            <article
              key={widget.id}
              className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        widget.widget_type === 'simulation'
                          ? 'bg-amber-100 text-amber-800'
                          : widget.data_mode === 'dynamic'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {widget.widget_type === 'simulation'
                        ? 'Simulation'
                        : widget.data_mode === 'dynamic'
                          ? 'Dynamic'
                          : 'Static'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatLastUpdated(widget.last_refreshed)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-950">
                    {widget.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{widget.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {widget.widget_type === 'chart' && widget.data_mode === 'dynamic' && (
                    <button
                      type="button"
                      onClick={() => onRefreshWidget(widget.id)}
                      className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
                      title="Refresh widget"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenChat(widget)}
                    className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
                    title="Edit with AI"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteWidget(widget.id)}
                    className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
                    title="Delete widget"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 h-80">
                {widget.widget_type === 'simulation' ? (
                  <SimulationWidgetRenderer widget={widget} />
                ) : (
                  <AIWidgetRenderer widget={widget} />
                )}
              </div>

              <div className="mt-6 flex items-center gap-3 text-xs text-gray-500">
                {widget.widget_type === 'simulation' ? (
                  <>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Interactive planner powered by the visualization agent
                  </>
                ) : (
                  <>
                    <LineChart className="h-3.5 w-3.5" />
                    {widget.data_mode === 'dynamic'
                      ? 'Refreshable chart backed by the current Rayfin ledger'
                      : 'Static comparison chart'}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
