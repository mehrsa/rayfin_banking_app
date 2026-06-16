import { describe, expect, it } from 'vitest';

import { buildBankingAnalytics } from '@/services/bankingAnalytics';
import type { BankingSnapshot } from '@/types/banking';

function isoDate(monthOffset: number, day: number): string {
  const value = new Date();
  value.setMonth(value.getMonth() + monthOffset, day);
  value.setHours(12, 0, 0, 0);
  return value.toISOString();
}

describe('buildBankingAnalytics', () => {
  it('derives balances, monthly metrics, and current-month budget usage from the SQL ledger', () => {
    const snapshot: BankingSnapshot = {
      profile: null,
      accounts: [
        {
          id: 'checking',
          name: 'Checking',
          accountType: 'checking',
          institution: 'Rayfin CU',
          accountNumberMask: '••••1001',
          currency: 'USD',
          accentColor: 'bg-blue-500',
          openingBalance: 1000,
          displayOrder: 1,
          createdAt: isoDate(-2, 1),
          user_id: 'user-1',
        },
        {
          id: 'savings',
          name: 'Savings',
          accountType: 'savings',
          institution: 'Rayfin CU',
          accountNumberMask: '••••2002',
          currency: 'USD',
          accentColor: 'bg-emerald-500',
          openingBalance: 200,
          displayOrder: 2,
          createdAt: isoDate(-2, 1),
          user_id: 'user-1',
        },
      ],
      categories: [
        {
          id: 'income',
          name: 'Income',
          kind: 'income',
          accentColor: 'bg-emerald-500',
          monthlyBudget: 0,
          user_id: 'user-1',
        },
        {
          id: 'groceries',
          name: 'Groceries',
          kind: 'expense',
          accentColor: 'bg-amber-500',
          monthlyBudget: 300,
          user_id: 'user-1',
        },
      ],
      transactions: [
        {
          id: 'deposit-1',
          transactionType: 'deposit',
          status: 'completed',
          amount: 500,
          description: 'Payroll deposit',
          postedAt: isoDate(0, 2),
          createdAt: isoDate(0, 2),
          toAccount_id: 'checking',
          category_id: 'income',
          user_id: 'user-1',
        },
        {
          id: 'payment-1',
          transactionType: 'payment',
          status: 'completed',
          amount: 120,
          description: 'Grocery run',
          merchantName: 'Northwind Market',
          postedAt: isoDate(0, 4),
          createdAt: isoDate(0, 4),
          fromAccount_id: 'checking',
          category_id: 'groceries',
          user_id: 'user-1',
        },
        {
          id: 'transfer-1',
          transactionType: 'transfer',
          status: 'completed',
          amount: 200,
          description: 'Move to savings',
          postedAt: isoDate(0, 6),
          createdAt: isoDate(0, 6),
          fromAccount_id: 'checking',
          toAccount_id: 'savings',
          user_id: 'user-1',
        },
        {
          id: 'payment-2',
          transactionType: 'payment',
          status: 'completed',
          amount: 90,
          description: 'Earlier grocery run',
          merchantName: 'Northwind Market',
          postedAt: isoDate(-1, 23),
          createdAt: isoDate(-1, 23),
          fromAccount_id: 'checking',
          category_id: 'groceries',
          user_id: 'user-1',
        },
      ],
    };

    const analytics = buildBankingAnalytics(snapshot);

    expect(analytics.totalBalance).toBe(1490);
    expect(analytics.accountSummaries[0]?.currentBalance).toBe(1090);
    expect(analytics.accountSummaries[1]?.currentBalance).toBe(400);
    expect(analytics.monthlyIncome).toBe(500);
    expect(analytics.monthlyExpenses).toBe(120);
    expect(analytics.categorySpend[0]?.spent).toBe(120);
    expect(analytics.categorySpend[0]?.utilization).toBeCloseTo(0.4);
    expect(analytics.categorySpend[0]?.remaining).toBe(180);
    expect(analytics.categorySpend[0]?.status).toBe('on-track');
    expect(analytics.topMerchants[0]).toEqual({
      merchantName: 'Northwind Market',
      amount: 210,
      transactionCount: 2,
      shareOfExpenses: 100,
    });
    expect(analytics.budgetHealth.totalBudget).toBe(300);
    expect(analytics.budgetHealth.totalSpent).toBe(120);
    expect(analytics.recentTransactions[0]?.id).toBe('transfer-1');
  });
});
