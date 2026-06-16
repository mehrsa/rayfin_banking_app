export type AccountType = 'checking' | 'savings' | 'investment';
export type CategoryKind = 'expense' | 'income' | 'transfer';
export type TransactionType = 'deposit' | 'payment' | 'transfer' | 'withdrawal';
export type BudgetStatus = 'on-track' | 'watch' | 'exceeded';
export interface CustomerProfile {
    id: string;
    fullName: string;
    email: string;
    primaryGoal: string;
    monthlyIncomeTarget: number;
    savingsGoal: number;
    memberSince: string;
    user_id: string;
}
export interface Account {
    id: string;
    name: string;
    accountType: AccountType;
    institution: string;
    accountNumberMask: string;
    currency: string;
    accentColor: string;
    openingBalance: number;
    displayOrder: number;
    createdAt: string;
    user_id: string;
}
export interface BudgetCategory {
    id: string;
    name: string;
    kind: CategoryKind;
    accentColor: string;
    description?: string;
    monthlyBudget: number;
    user_id: string;
}
export interface BankTransaction {
    id: string;
    transactionType: TransactionType;
    status: string;
    amount: number;
    description: string;
    merchantName?: string;
    counterpartyName?: string;
    postedAt: string;
    createdAt: string;
    fromAccount_id?: string;
    toAccount_id?: string;
    category_id?: string;
    user_id: string;
}
export interface AccountSummary extends Account {
    currentBalance: number;
    netChange: number;
}
export interface CategorySpend {
    categoryId: string;
    name: string;
    accentColor: string;
    budget: number;
    spent: number;
    utilization: number;
    remaining: number;
    exceededAmount: number;
    status: BudgetStatus;
}
export interface MonthlyCashFlowPoint {
    monthLabel: string;
    income: number;
    expenses: number;
    transfers: number;
    net: number;
}
export interface MerchantSpend {
    merchantName: string;
    amount: number;
    transactionCount: number;
    shareOfExpenses: number;
}
export interface BudgetHealthSummary {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallUtilization: number;
    exceededCount: number;
    watchCount: number;
}
export interface BankingAnalytics {
    accountSummaries: AccountSummary[];
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    averageMonthlyNet: number;
    monthlyCashFlow: MonthlyCashFlowPoint[];
    categorySpend: CategorySpend[];
    topMerchants: MerchantSpend[];
    recentTransactions: BankTransaction[];
    budgetHealth: BudgetHealthSummary;
}
export interface BankingSnapshot {
    profile: CustomerProfile | null;
    accounts: Account[];
    categories: BudgetCategory[];
    transactions: BankTransaction[];
}
export interface CreateAccountInput {
    name: string;
    accountType: AccountType;
    institution: string;
    openingBalance: number;
}
export interface CreateMoneyMovementInput {
    transactionType: TransactionType;
    amount: number;
    description: string;
    categoryId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    merchantName?: string;
    counterpartyName?: string;
}
