import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bot,
  CircleDollarSign,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { AIModule } from '@/components/AIModule';
import { AgentChat } from '@/components/AgentChat';
import {
  deleteAIWidget,
  fetchAIWidgets,
  refreshAIWidget,
} from '@/services/agentApi';
import { useAuth } from '@/hooks/AuthContext';
import { useBankingData } from '@/hooks/useBankingData';
import type {
  AccountSummary,
  BankTransaction,
  CategoryKind,
  TransactionType,
} from '@/types/banking';
import type { AIWidget } from '@/types/aiModule';

type PageSection =
  | 'overview'
  | 'activity'
  | 'move-money'
  | 'analytics'
  | 'ai-module';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function sectionButtonClass(active: boolean): string {
  return active
    ? 'bg-gray-950 text-white shadow-sm'
    : 'bg-white text-gray-600 hover:bg-gray-100';
}

function statusPillClass(status: 'on-track' | 'watch' | 'exceeded'): string {
  if (status === 'exceeded') {
    return 'bg-rose-100 text-rose-700';
  }
  if (status === 'watch') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-emerald-100 text-emerald-700';
}

function transactionTone(transaction: BankTransaction): {
  amountClass: string;
  badgeClass: string;
  label: string;
} {
  switch (transaction.transactionType) {
    case 'deposit':
      return {
        amountClass: 'text-emerald-600',
        badgeClass: 'bg-emerald-100 text-emerald-700',
        label: 'Deposit',
      };
    case 'payment':
      return {
        amountClass: 'text-rose-600',
        badgeClass: 'bg-rose-100 text-rose-700',
        label: 'Payment',
      };
    case 'withdrawal':
      return {
        amountClass: 'text-amber-600',
        badgeClass: 'bg-amber-100 text-amber-700',
        label: 'Withdrawal',
      };
    default:
      return {
        amountClass: 'text-blue-600',
        badgeClass: 'bg-blue-100 text-blue-700',
        label: 'Transfer',
      };
  }
}

function categoryKindForTransaction(transactionType: TransactionType): CategoryKind {
  return transactionType === 'deposit'
    ? 'income'
    : transactionType === 'transfer'
      ? 'transfer'
      : 'expense';
}

function getAccountName(
  accounts: AccountSummary[],
  accountId: string | undefined
): string {
  if (!accountId) return 'External account';
  return accounts.find((account) => account.id === accountId)?.name ?? 'Unknown account';
}

function transactionAmountLabel(transaction: BankTransaction): string {
  if (transaction.transactionType === 'deposit') return `+${formatCurrency(transaction.amount)}`;
  if (transaction.transactionType === 'transfer') return formatCurrency(transaction.amount);
  return `-${formatCurrency(transaction.amount)}`;
}

function truncateLabel(label: string): string {
  return label.length > 12 ? `${label.slice(0, 10)}...` : label;
}

function resolveAccentColor(accentClass: string): string {
  const palette: Record<string, string> = {
    'bg-blue-500': '#f43f5e',
    'bg-emerald-500': '#10b981',
    'bg-violet-500': '#8b5cf6',
    'bg-amber-500': '#f59e0b',
    'bg-orange-500': '#f97316',
    'bg-rose-500': '#f43f5e',
    'bg-sky-500': '#fb7185',
    'bg-indigo-500': '#ef4444',
  };

  return palette[accentClass] ?? '#64748b';
}

function MetricCard({
  label,
  value,
  note,
  valueClass,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  valueClass?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="rounded-xl bg-gray-100 p-2 text-gray-700">{icon}</span>
      </div>
      <p className={`mt-4 text-3xl font-semibold text-gray-950 ${valueClass ?? ''}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-gray-500">{note}</p>
    </div>
  );
}

export function HomePage() {
  const { signOut, user } = useAuth();
  const [activeSection, setActiveSection] = useState<PageSection>('overview');
  const [movementType, setMovementType] = useState<TransactionType>('transfer');
  const [movementAmount, setMovementAmount] = useState('250');
  const [movementDescription, setMovementDescription] = useState('');
  const [movementMerchant, setMovementMerchant] = useState('');
  const [movementFromAccountId, setMovementFromAccountId] = useState('');
  const [movementToAccountId, setMovementToAccountId] = useState('');
  const [movementCategoryId, setMovementCategoryId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountInstitution, setAccountInstitution] = useState('Contoso Credit Union');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'investment'>(
    'checking'
  );
  const [accountOpeningBalance, setAccountOpeningBalance] = useState('0');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formError, setFormError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<AIWidget | null>(null);
  const [widgets, setWidgets] = useState<AIWidget[]>([]);
  const {
    profile,
    categories,
    analytics,
    error,
    loading,
    mutating,
    refresh,
    createAccount,
    createTransaction,
  } = useBankingData(user);

  useEffect(() => {
    let cancelled = false;

    async function loadWidgets() {
      if (!user) {
        setWidgets([]);
        return;
      }

      try {
        const nextWidgets = await fetchAIWidgets(user.id);
        if (!cancelled) {
          setWidgets(nextWidgets);
        }
      } catch {
        if (!cancelled) {
          setWidgets([]);
        }
      }
    }

    void loadWidgets();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const compatibleCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.kind === categoryKindForTransaction(movementType)
      ),
    [categories, movementType]
  );

  const filteredTransactions = useMemo(() => {
    return analytics.recentTransactions.filter((transaction) => {
      const searchTarget = [
        transaction.description,
        transaction.merchantName,
        transaction.counterpartyName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchTarget.includes(search.toLowerCase());
      const matchesType =
        typeFilter === 'all' || transaction.transactionType === typeFilter;
      const matchesAccount =
        accountFilter === 'all' ||
        transaction.fromAccount_id === accountFilter ||
        transaction.toAccount_id === accountFilter;
      const matchesCategory =
        categoryFilter === 'all' || transaction.category_id === categoryFilter;

      return matchesSearch && matchesType && matchesAccount && matchesCategory;
    });
  }, [
    accountFilter,
    analytics.recentTransactions,
    categoryFilter,
    search,
    typeFilter,
  ]);

  const activeError = formError ?? error;
  const budgetHeadline = analytics.categorySpend[0];
  const spendingMix = analytics.categorySpend
    .filter((item) => item.spent > 0)
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      value: item.spent,
      color: resolveAccentColor(item.accentColor),
    }));

  function upsertWidget(widget: AIWidget) {
    setWidgets((current) => {
      const existingIndex = current.findIndex((item) => item.id === widget.id);
      if (existingIndex === -1) {
        return [...current, widget];
      }

      const next = [...current];
      next[existingIndex] = widget;
      return next;
    });
  }

  async function refreshWidgetById(widgetId: string) {
    if (!user) {
      return;
    }

    const refreshed = await refreshAIWidget(user.id, widgetId);
    upsertWidget(refreshed);
  }

  async function deleteWidget(widgetId: string) {
    if (!user) {
      return;
    }

    await deleteAIWidget(widgetId);
    setWidgets((current) => current.filter((widget) => widget.id !== widgetId));
    if (editingWidget?.id === widgetId) {
      setEditingWidget(null);
    }
  }

  async function handleCreateAccount() {
    setFormError(null);
    const openingBalance = Number(accountOpeningBalance);

    if (!accountName.trim()) {
      setFormError('Account name is required.');
      return;
    }

    if (!accountInstitution.trim()) {
      setFormError('Institution name is required.');
      return;
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setFormError('Opening balance must be zero or greater.');
      return;
    }

    try {
      await createAccount({
        name: accountName.trim(),
        accountType,
        institution: accountInstitution.trim(),
        openingBalance,
      });

      setAccountName('');
      setAccountOpeningBalance('0');
    } catch (accountError) {
      setFormError(
        accountError instanceof Error
          ? accountError.message
          : 'Unable to create account.'
      );
    }
  }

  async function handleCreateMovement() {
    setFormError(null);
    const amount = Number(movementAmount);
    const sourceAccount = analytics.accountSummaries.find(
      (account) => account.id === movementFromAccountId
    );
    const destinationAccount = analytics.accountSummaries.find(
      (account) => account.id === movementToAccountId
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }

    if (movementType === 'deposit' && !movementToAccountId) {
      setFormError('Choose the account receiving the deposit.');
      return;
    }

    if ((movementType === 'payment' || movementType === 'withdrawal') && !movementFromAccountId) {
      setFormError('Choose the account funding the transaction.');
      return;
    }

    if (movementType === 'transfer') {
      if (!movementFromAccountId || !movementToAccountId) {
        setFormError('Choose both accounts for a transfer.');
        return;
      }
      if (movementFromAccountId === movementToAccountId) {
        setFormError('Transfers require two different accounts.');
        return;
      }
    }

    if (
      sourceAccount &&
      (movementType === 'payment' ||
        movementType === 'withdrawal' ||
        movementType === 'transfer') &&
      sourceAccount.currentBalance < amount
    ) {
      setFormError('This transaction exceeds the selected account balance.');
      return;
    }

    try {
      await createTransaction({
        transactionType: movementType,
        amount,
        description:
          movementDescription.trim() ||
          (movementType === 'deposit'
            ? 'Manual deposit'
            : movementType === 'transfer'
              ? 'Internal transfer'
              : 'Manual payment'),
        merchantName: movementMerchant.trim() || undefined,
        counterpartyName:
          movementType === 'transfer' ? destinationAccount?.name : undefined,
        categoryId: movementCategoryId || undefined,
        fromAccountId: movementFromAccountId || undefined,
        toAccountId: movementToAccountId || undefined,
      });

      setMovementAmount('250');
      setMovementDescription('');
      setMovementMerchant('');
    } catch (movementError) {
      setFormError(
        movementError instanceof Error
          ? movementError.message
          : 'Unable to save transaction.'
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-500 shadow-sm">
          Loading your banking dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-900 to-indigo-800 text-white shadow-xl">
          <div className="flex flex-col gap-8 px-6 py-8 lg:flex-row lg:items-start lg:justify-between lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-blue-100">
                <Sparkles className="h-3.5 w-3.5" />
                Banking workspace
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome{profile?.fullName || user?.name ? `, ${profile?.fullName || user?.name}` : ''}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
                Track your live ledger, monitor meaningful monthly budgets, and use a
                coordinator-led AI workspace that mirrors the multi-agent sample
                experience.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => void refresh()}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                type="button"
              >
                Refresh data
              </button>
              <button
                onClick={() => {
                  setActiveSection('ai-module');
                  setIsChatOpen(true);
                }}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-blue-50"
                type="button"
              >
                Open AI Module
              </button>
              <button
                onClick={() => void signOut()}
                className="rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {([
            ['overview', 'Overview'],
            ['move-money', 'Move Money'],
            ['activity', 'Activity'],
            ['analytics', 'Analytics'],
            ['ai-module', 'AI Module'],
          ] as const).map(([section, label]) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${sectionButtonClass(
                activeSection === section
              )}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {activeError}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Net worth"
            value={formatCurrency(analytics.totalBalance)}
            note={`Across ${analytics.accountSummaries.length} accounts`}
            icon={<Wallet className="h-4 w-4" />}
          />
          <MetricCard
            label="This month income"
            value={formatCurrency(analytics.monthlyIncome)}
            note={`Average month: ${formatCurrency(analytics.averageMonthlyIncome)}`}
            valueClass="text-emerald-600"
            icon={<CircleDollarSign className="h-4 w-4" />}
          />
          <MetricCard
            label="This month expenses"
            value={formatCurrency(analytics.monthlyExpenses)}
            note={`Tracked budget: ${formatCurrency(analytics.budgetHealth.totalBudget)}`}
            valueClass="text-rose-600"
            icon={<TriangleAlert className="h-4 w-4" />}
          />
          <MetricCard
            label="Savings rate"
            value={`${analytics.savingsRate.toFixed(1)}%`}
            note={`Budget status: ${
              analytics.budgetHealth.exceededCount > 0
                ? `${analytics.budgetHealth.exceededCount} exceeded`
                : analytics.budgetHealth.watchCount > 0
                  ? `${analytics.budgetHealth.watchCount} watch`
                  : 'all on track'
            }`}
            valueClass="text-blue-700"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </section>

        {activeSection === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-950">Accounts</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Current balances across your everyday, savings, and goal-based
                      accounts.
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {analytics.accountSummaries.map((account) => (
                    <article
                      key={account.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            {account.accountType}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-gray-950">
                            {account.name}
                          </h3>
                        </div>
                        <span
                          className={`h-3 w-3 rounded-full ${account.accentColor}`}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-4 text-3xl font-semibold text-gray-950">
                        {formatCurrency(account.currentBalance)}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <span>{account.institution}</span>
                        <span>{account.accountNumberMask}</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500">Net change: </span>
                        <span
                          className={
                            account.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }
                        >
                          {account.netChange >= 0 ? '+' : ''}
                          {formatCurrency(account.netChange)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-950">
                    Six-month cash flow
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    A bounded chart view of income, expenses, and net cash flow instead
                    of stacked progress bars.
                  </p>
                </div>
                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={analytics.monthlyCashFlow.map((point) => ({
                        month: point.monthLabel,
                        income: point.income,
                        expenses: point.expenses,
                        net: point.net,
                      }))}
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis width={72} tickFormatter={(value) => formatCurrency(value)} fontSize={12} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="expenses" fill="#f43f5e" radius={[8, 8, 0, 0]} maxBarSize={36} />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-950">Budget health</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Monthly budgets only. Exceeded categories now use explicit status
                      states instead of overflowing bars.
                    </p>
                  </div>
                  {analytics.budgetHealth.exceededCount > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {analytics.budgetHealth.exceededCount} over budget
                    </div>
                  )}
                </div>
                <div className="mt-5 space-y-4">
                  {analytics.categorySpend.slice(0, 4).map((item) => (
                    <div key={item.categoryId} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(
                                item.status
                              )}`}
                            >
                              {item.status === 'exceeded'
                                ? 'Exceeded'
                                : item.status === 'watch'
                                  ? 'Watch'
                                  : 'On track'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatCurrency(item.spent)} of {formatCurrency(item.budget)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          {item.status === 'exceeded' ? (
                            <p className="font-medium text-rose-700">
                              {formatCurrency(item.exceededAmount)} over
                            </p>
                          ) : (
                            <p className="font-medium text-emerald-700">
                              {formatCurrency(item.remaining)} left
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${
                            item.status === 'exceeded'
                              ? 'bg-rose-500'
                              : item.status === 'watch'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.max(Math.min(item.utilization * 100, 100), 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  Biggest budget focus this month:{' '}
                  <span className="font-medium text-gray-900">
                    {budgetHeadline?.name ?? 'No tracked spend yet'}
                  </span>
                  .
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="text-xl font-semibold text-gray-950">Top merchants</h2>
                <div className="mt-5 space-y-4">
                  {analytics.topMerchants.map((merchant) => (
                    <div
                      key={merchant.merchantName}
                      className="rounded-2xl border border-gray-200 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-950">{merchant.merchantName}</p>
                          <p className="text-sm text-gray-500">
                            {merchant.transactionCount} expense entries
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(merchant.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {merchant.shareOfExpenses.toFixed(0)}% of total outflow
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeSection === 'move-money' && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-xl font-semibold text-gray-950">Record banking activity</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add deposits, payments, transfers, and withdrawals to keep your balances current.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-gray-600">
                  Type
                  <select
                    value={movementType}
                    onChange={(event) => {
                      const nextType = event.target.value as TransactionType;
                      setMovementType(nextType);
                      setMovementCategoryId('');
                    }}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  >
                    <option value="transfer">Transfer</option>
                    <option value="deposit">Deposit</option>
                    <option value="payment">Payment</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  Amount
                  <input
                    value={movementAmount}
                    onChange={(event) => setMovementAmount(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  />
                </label>
                <label className="text-sm text-gray-600">
                  From account
                  <select
                    value={movementFromAccountId}
                    onChange={(event) => setMovementFromAccountId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  >
                    <option value="">Select account</option>
                    {analytics.accountSummaries.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.currentBalance)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  To account
                  <select
                    value={movementToAccountId}
                    onChange={(event) => setMovementToAccountId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  >
                    <option value="">Select account</option>
                    {analytics.accountSummaries.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.currentBalance)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600 md:col-span-2">
                  Category
                  <select
                    value={movementCategoryId}
                    onChange={(event) => setMovementCategoryId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  >
                    <option value="">Select category</option>
                    {compatibleCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600 md:col-span-2">
                  Description
                  <input
                    value={movementDescription}
                    onChange={(event) => setMovementDescription(event.target.value)}
                    placeholder="Describe the money movement"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  />
                </label>
                <label className="text-sm text-gray-600 md:col-span-2">
                  Merchant or counterparty
                  <input
                    value={movementMerchant}
                    onChange={(event) => setMovementMerchant(event.target.value)}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateMovement();
                  }}
                  disabled={mutating}
                  className="rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {mutating ? 'Saving...' : 'Save transaction'}
                </button>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-xl font-semibold text-gray-950">Open another account</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add a new account to organize savings, spending, or long-term goals.
              </p>
              <div className="mt-6 space-y-4">
                <label className="block text-sm text-gray-600">
                  Account name
                  <input
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    placeholder="Vacation savings"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  />
                </label>
                <label className="block text-sm text-gray-600">
                  Account type
                  <select
                    value={accountType}
                    onChange={(event) =>
                      setAccountType(event.target.value as 'checking' | 'savings' | 'investment')
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="investment">Goal / investment</option>
                  </select>
                </label>
                <label className="block text-sm text-gray-600">
                  Institution
                  <input
                    value={accountInstitution}
                    onChange={(event) => setAccountInstitution(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  />
                </label>
                <label className="block text-sm text-gray-600">
                  Opening balance
                  <input
                    value={accountOpeningBalance}
                    onChange={(event) => setAccountOpeningBalance(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleCreateAccount();
                }}
                disabled={mutating}
                className="mt-6 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutating ? 'Creating...' : 'Create account'}
              </button>
            </section>
          </div>
        )}

        {activeSection === 'activity' && (
          <section className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-950">Transaction activity</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review recent activity across all of your accounts.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transactions"
                  className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                />
                <select
                  value={accountFilter}
                  onChange={(event) => setAccountFilter(event.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                >
                  <option value="all">All accounts</option>
                  {analytics.accountSummaries.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as 'all' | TransactionType)
                  }
                  className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                >
                  <option value="all">All types</option>
                  <option value="deposit">Deposits</option>
                  <option value="payment">Payments</option>
                  <option value="transfer">Transfers</option>
                  <option value="withdrawal">Withdrawals</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="grid grid-cols-[1.2fr,1fr,0.8fr] gap-4 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 sm:grid-cols-[1.5fr,1fr,1fr,0.8fr]">
                <div>Description</div>
                <div className="hidden sm:block">Accounts</div>
                <div>Date</div>
                <div className="text-right">Amount</div>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const tone = transactionTone(transaction);

                  return (
                    <div
                      key={transaction.id}
                      className="grid grid-cols-[1.2fr,1fr,0.8fr] gap-4 px-4 py-4 text-sm sm:grid-cols-[1.5fr,1fr,1fr,0.8fr]"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-950">{transaction.description}</div>
                        <div className="text-xs text-gray-500">
                          {transaction.merchantName || transaction.counterpartyName || 'Manual entry'}
                        </div>
                      </div>
                      <div className="hidden text-sm text-gray-500 sm:block">
                        {getAccountName(analytics.accountSummaries, transaction.fromAccount_id)}
                        {transaction.toAccount_id &&
                          ` -> ${getAccountName(
                            analytics.accountSummaries,
                            transaction.toAccount_id
                          )}`}
                      </div>
                      <div className="text-gray-500">
                        <div>{new Date(transaction.postedAt).toLocaleDateString()}</div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${tone.badgeClass}`}
                        >
                          {tone.label}
                        </span>
                      </div>
                      <div className={`text-right font-semibold ${tone.amountClass}`}>
                        {transactionAmountLabel(transaction)}
                      </div>
                    </div>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No transactions matched the current filters.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'analytics' && (
          <div className="grid gap-6 xl:grid-cols-[1.25fr,1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="text-xl font-semibold text-gray-950">Cash flow analytics</h2>
              <p className="mt-1 text-sm text-gray-500">
                Compare inflow, outflow, and net trend across the last six months.
              </p>
              <div className="mt-6 h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analytics.monthlyCashFlow.map((point) => ({
                      month: point.monthLabel,
                      income: point.income,
                      expenses: point.expenses,
                      net: point.net,
                    }))}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis width={72} tickFormatter={(value) => formatCurrency(value)} fontSize={12} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={40} />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Average income</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-950">
                    {formatCurrency(analytics.averageMonthlyIncome)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Average expenses</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-950">
                    {formatCurrency(analytics.averageMonthlyExpenses)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Average net</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-950">
                    {formatCurrency(analytics.averageMonthlyNet)}
                  </p>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="text-xl font-semibold text-gray-950">Spending mix</h2>
                <p className="mt-1 text-sm text-gray-500">
                  A meaningful share view of this month’s category spend.
                </p>
                <div className="mt-6 h-72">
                  {spendingMix.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={spendingMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="48%"
                          outerRadius="74%"
                          paddingAngle={2}
                        >
                          {spendingMix.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend formatter={(value) => truncateLabel(String(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                      No expense mix available yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h2 className="text-xl font-semibold text-gray-950">Budget health details</h2>
                <div className="mt-5 space-y-4">
                  {analytics.categorySpend.map((item) => (
                    <div key={item.categoryId} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(
                                item.status
                              )}`}
                            >
                              {item.status === 'exceeded'
                                ? 'Exceeded'
                                : item.status === 'watch'
                                  ? 'Watch'
                                  : 'On track'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {item.status === 'exceeded'
                            ? `${formatCurrency(item.exceededAmount)} over`
                            : `${formatCurrency(item.remaining)} left`}
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${
                            item.status === 'exceeded'
                              ? 'bg-rose-500'
                              : item.status === 'watch'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.max(Math.min(item.utilization * 100, 100), 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeSection === 'ai-module' && (
          <AIModule
            widgets={widgets}
            onOpenChat={(widget) => {
              setEditingWidget(widget ?? null);
              setIsChatOpen(true);
            }}
            onRefreshWidget={refreshWidgetById}
            onDeleteWidget={deleteWidget}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsChatOpen((current) => !current)}
        className={`fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition ${
          isChatOpen ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {isChatOpen ? (
          <Bot className="h-6 w-6" />
        ) : (
          <MessageSquareText className="h-6 w-6" />
        )}
      </button>

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-30 h-[42rem] w-[min(30rem,calc(100vw-2rem))]">
          <AgentChat
            userId={user?.id ?? 'local-user'}
            userName={profile?.fullName ?? user?.name}
            editingWidget={editingWidget}
            currentSection={activeSection}
            onClearEditingWidget={() => setEditingWidget(null)}
            onWidgetSave={upsertWidget}
            onOpenSection={(section) => setActiveSection(section)}
            createAccount={createAccount}
            createTransaction={createTransaction}
            refreshBankingData={refresh}
          />
        </div>
      )}
    </div>
  );
}
