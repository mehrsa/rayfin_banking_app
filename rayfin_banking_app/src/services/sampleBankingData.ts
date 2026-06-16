import type { AuthUser } from '@/services/IAuthService';
import type {
  AccountType,
  CategoryKind,
  TransactionType,
} from '@/types/banking';

interface SeedAccount {
  key: string;
  name: string;
  accountType: AccountType;
  institution: string;
  accountNumberMask: string;
  currency: string;
  accentColor: string;
  openingBalance: number;
  displayOrder: number;
}

interface SeedCategory {
  key: string;
  name: string;
  kind: CategoryKind;
  accentColor: string;
  description?: string;
  monthlyBudget: number;
}

interface SeedTransaction {
  transactionType: TransactionType;
  amount: number;
  description: string;
  merchantName?: string;
  counterpartyName?: string;
  categoryKey?: string;
  fromAccountKey?: string;
  toAccountKey?: string;
  postedAt: Date;
}

export interface BankingSeedBlueprint {
  profile: {
    fullName: string;
    email: string;
    primaryGoal: string;
    monthlyIncomeTarget: number;
    savingsGoal: number;
    memberSince: Date;
  };
  accounts: SeedAccount[];
  categories: SeedCategory[];
  transactions: SeedTransaction[];
}

function monthsAgo(monthsBack: number, dayOfMonth: number, hour = 9): Date {
  const value = new Date();
  value.setMonth(value.getMonth() - monthsBack, dayOfMonth);
  value.setHours(hour, 0, 0, 0);
  return value;
}

export function createSampleBankingSeed(user: AuthUser): BankingSeedBlueprint {
  const accounts: SeedAccount[] = [
    {
      key: 'checking',
      name: 'Everyday Checking',
      accountType: 'checking',
      institution: 'Contoso Credit Union',
      accountNumberMask: '••••1024',
      currency: 'USD',
      accentColor: 'bg-blue-500',
      openingBalance: 2800,
      displayOrder: 1,
    },
    {
      key: 'savings',
      name: 'High Yield Savings',
      accountType: 'savings',
      institution: 'Contoso Credit Union',
      accountNumberMask: '••••8842',
      currency: 'USD',
      accentColor: 'bg-emerald-500',
      openingBalance: 7200,
      displayOrder: 2,
    },
    {
      key: 'travel',
      name: 'Travel Fund',
      accountType: 'investment',
      institution: 'Contoso Vault',
      accountNumberMask: '••••7731',
      currency: 'USD',
      accentColor: 'bg-violet-500',
      openingBalance: 1500,
      displayOrder: 3,
    },
  ];

  const categories: SeedCategory[] = [
    {
      key: 'income',
      name: 'Income',
      kind: 'income',
      accentColor: 'bg-emerald-500',
      description: 'Salary, reimbursements, and other inflows.',
      monthlyBudget: 0,
    },
    {
      key: 'housing',
      name: 'Housing',
      kind: 'expense',
      accentColor: 'bg-rose-500',
      description: 'Rent or mortgage obligations.',
      monthlyBudget: 1700,
    },
    {
      key: 'groceries',
      name: 'Groceries',
      kind: 'expense',
      accentColor: 'bg-amber-500',
      description: 'Supermarket and pantry spending.',
      monthlyBudget: 520,
    },
    {
      key: 'dining',
      name: 'Dining',
      kind: 'expense',
      accentColor: 'bg-orange-500',
      description: 'Restaurants and takeout.',
      monthlyBudget: 240,
    },
    {
      key: 'utilities',
      name: 'Utilities',
      kind: 'expense',
      accentColor: 'bg-sky-500',
      description: 'Power, internet, and mobile bills.',
      monthlyBudget: 250,
    },
    {
      key: 'travel',
      name: 'Travel',
      kind: 'expense',
      accentColor: 'bg-violet-500',
      description: 'Flights, hotels, and travel bookings.',
      monthlyBudget: 420,
    },
    {
      key: 'savings',
      name: 'Savings Contribution',
      kind: 'transfer',
      accentColor: 'bg-indigo-500',
      description: 'Internal transfers into goal-based accounts.',
      monthlyBudget: 700,
    },
  ];

  const transactions: SeedTransaction[] = [
    {
      transactionType: 'deposit',
      amount: 4200,
      description: 'Payroll deposit',
      merchantName: 'Contoso Payroll',
      categoryKey: 'income',
      toAccountKey: 'checking',
      postedAt: monthsAgo(5, 2),
    },
    {
      transactionType: 'payment',
      amount: 1650,
      description: 'Monthly rent',
      merchantName: 'Fabrikam Properties',
      categoryKey: 'housing',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(5, 3),
    },
    {
      transactionType: 'payment',
      amount: 365,
      description: 'Weekly groceries',
      merchantName: 'Northwind Market',
      categoryKey: 'groceries',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(5, 7),
    },
    {
      transactionType: 'transfer',
      amount: 650,
      description: 'Emergency fund transfer',
      counterpartyName: 'High Yield Savings',
      categoryKey: 'savings',
      fromAccountKey: 'checking',
      toAccountKey: 'savings',
      postedAt: monthsAgo(5, 10),
    },
    {
      transactionType: 'deposit',
      amount: 4200,
      description: 'Payroll deposit',
      merchantName: 'Contoso Payroll',
      categoryKey: 'income',
      toAccountKey: 'checking',
      postedAt: monthsAgo(4, 2),
    },
    {
      transactionType: 'payment',
      amount: 1650,
      description: 'Monthly rent',
      merchantName: 'Fabrikam Properties',
      categoryKey: 'housing',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(4, 3),
    },
    {
      transactionType: 'payment',
      amount: 402,
      description: 'Groceries and household items',
      merchantName: 'Northwind Market',
      categoryKey: 'groceries',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(4, 8),
    },
    {
      transactionType: 'payment',
      amount: 205,
      description: 'Utilities autopay',
      merchantName: 'Tailspin Energy',
      categoryKey: 'utilities',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(4, 12),
    },
    {
      transactionType: 'deposit',
      amount: 4200,
      description: 'Payroll deposit',
      merchantName: 'Contoso Payroll',
      categoryKey: 'income',
      toAccountKey: 'checking',
      postedAt: monthsAgo(3, 2),
    },
    {
      transactionType: 'payment',
      amount: 1650,
      description: 'Monthly rent',
      merchantName: 'Fabrikam Properties',
      categoryKey: 'housing',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(3, 3),
    },
    {
      transactionType: 'payment',
      amount: 342,
      description: 'Groceries and pantry restock',
      merchantName: 'Northwind Market',
      categoryKey: 'groceries',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(3, 9),
    },
    {
      transactionType: 'transfer',
      amount: 250,
      description: 'Travel fund contribution',
      counterpartyName: 'Travel Fund',
      categoryKey: 'savings',
      fromAccountKey: 'checking',
      toAccountKey: 'travel',
      postedAt: monthsAgo(3, 13),
    },
    {
      transactionType: 'deposit',
      amount: 4200,
      description: 'Payroll deposit',
      merchantName: 'Contoso Payroll',
      categoryKey: 'income',
      toAccountKey: 'checking',
      postedAt: monthsAgo(2, 2),
    },
    {
      transactionType: 'payment',
      amount: 1650,
      description: 'Monthly rent',
      merchantName: 'Fabrikam Properties',
      categoryKey: 'housing',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(2, 3),
    },
    {
      transactionType: 'payment',
      amount: 428,
      description: 'Family grocery trip',
      merchantName: 'Northwind Market',
      categoryKey: 'groceries',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(2, 8),
    },
    {
      transactionType: 'payment',
      amount: 198,
      description: 'Phone and internet bill',
      merchantName: 'Wide World Telecom',
      categoryKey: 'utilities',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(2, 15),
    },
    {
      transactionType: 'transfer',
      amount: 650,
      description: 'Emergency fund transfer',
      counterpartyName: 'High Yield Savings',
      categoryKey: 'savings',
      fromAccountKey: 'checking',
      toAccountKey: 'savings',
      postedAt: monthsAgo(2, 18),
    },
    {
      transactionType: 'deposit',
      amount: 4200,
      description: 'Payroll deposit',
      merchantName: 'Contoso Payroll',
      categoryKey: 'income',
      toAccountKey: 'checking',
      postedAt: monthsAgo(1, 2),
    },
    {
      transactionType: 'payment',
      amount: 1650,
      description: 'Monthly rent',
      merchantName: 'Fabrikam Properties',
      categoryKey: 'housing',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(1, 3),
    },
    {
      transactionType: 'payment',
      amount: 377,
      description: 'Groceries and pharmacy',
      merchantName: 'Northwind Market',
      categoryKey: 'groceries',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(1, 8),
    },
    {
      transactionType: 'payment',
      amount: 168,
      description: 'Team dinner',
      merchantName: 'Litware Bistro',
      categoryKey: 'dining',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(1, 11),
    },
    {
      transactionType: 'transfer',
      amount: 250,
      description: 'Travel fund contribution',
      counterpartyName: 'Travel Fund',
      categoryKey: 'savings',
      fromAccountKey: 'checking',
      toAccountKey: 'travel',
      postedAt: monthsAgo(1, 16),
    },
    {
      transactionType: 'deposit',
      amount: 4200,
      description: 'Payroll deposit',
      merchantName: 'Contoso Payroll',
      categoryKey: 'income',
      toAccountKey: 'checking',
      postedAt: monthsAgo(0, 2),
    },
    {
      transactionType: 'payment',
      amount: 1650,
      description: 'Monthly rent',
      merchantName: 'Fabrikam Properties',
      categoryKey: 'housing',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(0, 3),
    },
    {
      transactionType: 'payment',
      amount: 391,
      description: 'Groceries and pantry restock',
      merchantName: 'Northwind Market',
      categoryKey: 'groceries',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(0, 7),
    },
    {
      transactionType: 'payment',
      amount: 214,
      description: 'Utilities autopay',
      merchantName: 'Tailspin Energy',
      categoryKey: 'utilities',
      fromAccountKey: 'checking',
      postedAt: monthsAgo(0, 12),
    },
    {
      transactionType: 'transfer',
      amount: 650,
      description: 'Emergency fund transfer',
      counterpartyName: 'High Yield Savings',
      categoryKey: 'savings',
      fromAccountKey: 'checking',
      toAccountKey: 'savings',
      postedAt: monthsAgo(0, 15),
    },
    {
      transactionType: 'payment',
      amount: 480,
      description: 'Flight deposit',
      merchantName: 'Adventure Works Travel',
      categoryKey: 'travel',
      fromAccountKey: 'travel',
      postedAt: monthsAgo(0, 18),
    },
  ];

  return {
    profile: {
      fullName: user.name,
      email: user.email,
      primaryGoal: 'Build a six-month emergency fund.',
      monthlyIncomeTarget: 4200,
      savingsGoal: 25000,
      memberSince: monthsAgo(12, 1),
    },
    accounts,
    categories,
    transactions,
  };
}
