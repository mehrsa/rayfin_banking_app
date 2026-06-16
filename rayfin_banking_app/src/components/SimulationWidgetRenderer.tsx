import {
  AlertTriangle,
  PiggyBank,
  ShieldCheck,
  Target,
} from 'lucide-react';

import type { AIWidget } from '@/types/aiModule';

interface SimulationWidgetRendererProps {
  widget: AIWidget;
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function Progress({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) {
  return (
    <div className="h-2 rounded-full bg-gray-100">
      <div
        className={`h-2 rounded-full ${colorClass}`}
        style={{ width: `${Math.max(Math.min(value, 100), 4)}%` }}
      />
    </div>
  );
}

export function SimulationWidgetRenderer({
  widget,
}: SimulationWidgetRendererProps) {
  const config = widget.simulation_config;

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        No simulation data available.
      </div>
    );
  }

  if (config.simulation_type === 'savings_projector') {
    const currentSavings = Number(config.defaults.currentSavings ?? 0);
    const monthlyContribution = Number(config.defaults.monthlyContribution ?? 0);
    const targetSavings = Number(config.defaults.targetSavings ?? 0);
    const gap = Math.max(targetSavings - currentSavings, 0);
    const monthsToGoal =
      monthlyContribution > 0 ? Math.ceil(gap / monthlyContribution) : null;
    const progress =
      targetSavings > 0 ? (currentSavings / targetSavings) * 100 : 0;

    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 p-4">
          <PiggyBank className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <p className="font-medium text-indigo-950">Savings projector</p>
            <p className="mt-1 text-sm text-indigo-700">
              {monthsToGoal
                ? `At the current pace, you reach the target in about ${monthsToGoal} months.`
                : 'Add a monthly contribution to estimate time to target.'}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Current savings</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {formatCurrency(currentSavings)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Monthly contribution</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {formatCurrency(monthlyContribution)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Target</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {formatCurrency(targetSavings)}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Progress to goal</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} colorClass="bg-indigo-500" />
        </div>
      </div>
    );
  }

  if (config.simulation_type === 'emergency_fund') {
    const currentSavings = Number(config.defaults.currentSavings ?? 0);
    const monthlyExpenses = Number(config.defaults.monthlyExpenses ?? 0);
    const targetMonths = Number(config.defaults.targetMonths ?? 6);
    const targetFund = monthlyExpenses * targetMonths;
    const gap = Math.max(targetFund - currentSavings, 0);
    const coverage =
      monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;

    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-950">Emergency fund coverage</p>
            <p className="mt-1 text-sm text-emerald-700">
              You currently cover about {coverage.toFixed(1)} months of expenses.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Current reserves</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {formatCurrency(currentSavings)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Monthly expenses</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {formatCurrency(monthlyExpenses)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Target fund</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">
              {formatCurrency(targetFund)}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <p>
              {gap > 0
                ? `You still need ${formatCurrency(gap)} to fully fund a ${targetMonths}-month reserve.`
                : 'You are already at or above the recommended reserve target.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalBudget = Number(config.defaults.totalBudget ?? 0);
  const totalSpent = Number(config.defaults.totalSpent ?? 0);
  const targetSavingsRate = Number(config.defaults.targetSavingsRate ?? 0);
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4">
        <Target className="mt-0.5 h-5 w-5 text-blue-600" />
        <div>
          <p className="font-medium text-blue-950">Budget planner</p>
          <p className="mt-1 text-sm text-blue-700">
            Keep budget utilization under 100% while preserving a {targetSavingsRate}%
            savings rate.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Tracked budget</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Spent so far</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">
            {formatCurrency(totalSpent)}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Budget utilization</span>
          <span>{utilization.toFixed(0)}%</span>
        </div>
        <Progress
          value={utilization}
          colorClass={utilization >= 100 ? 'bg-rose-500' : 'bg-blue-500'}
        />
      </div>
    </div>
  );
}
