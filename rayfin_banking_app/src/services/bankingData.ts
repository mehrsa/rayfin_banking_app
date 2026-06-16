import { getRayfinClient } from '@/services/rayfinClient';
import { createSampleBankingSeed } from '@/services/sampleBankingData';
import type { AuthUser } from '@/services/IAuthService';
import type {
  AccountType,
  BankingSnapshot,
  CategoryKind,
  CreateAccountInput,
  CreateMoneyMovementInput,
  TransactionType,
} from '@/types/banking';

function normalizeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toAccountType(value: string): AccountType {
  if (value === 'checking' || value === 'savings' || value === 'investment') {
    return value;
  }

  throw new Error(`Unsupported account type "${value}" in SQL data.`);
}

function toCategoryKind(value: string): CategoryKind {
  if (value === 'expense' || value === 'income' || value === 'transfer') {
    return value;
  }

  throw new Error(`Unsupported category kind "${value}" in SQL data.`);
}

function toTransactionType(value: string): TransactionType {
  if (
    value === 'deposit' ||
    value === 'payment' ||
    value === 'transfer' ||
    value === 'withdrawal'
  ) {
    return value;
  }

  throw new Error(`Unsupported transaction type "${value}" in SQL data.`);
}

export async function loadBankingSnapshot(): Promise<BankingSnapshot> {
  const client = getRayfinClient();

  const [profiles, accounts, categories, transactions] = await Promise.all([
    client.data.CustomerProfile.select([
      'id',
      'fullName',
      'email',
      'primaryGoal',
      'monthlyIncomeTarget',
      'savingsGoal',
      'memberSince',
      'user_id',
    ]).execute(),
    client.data.Account.select([
      'id',
      'name',
      'accountType',
      'institution',
      'accountNumberMask',
      'currency',
      'accentColor',
      'openingBalance',
      'displayOrder',
      'createdAt',
      'user_id',
    ])
      .orderBy({ displayOrder: 'asc' })
      .execute(),
    client.data.BudgetCategory.select([
      'id',
      'name',
      'kind',
      'accentColor',
      'description',
      'monthlyBudget',
      'user_id',
    ]).execute(),
    client.data.BankTransaction.select([
      'id',
      'transactionType',
      'status',
      'amount',
      'description',
      'merchantName',
      'counterpartyName',
      'postedAt',
      'createdAt',
      'fromAccount_id',
      'toAccount_id',
      'category_id',
      'user_id',
    ])
      .orderBy({ postedAt: 'desc' })
      .execute(),
  ]);

  return {
    profile: profiles[0]
      ? {
          ...profiles[0],
          memberSince: normalizeDate(profiles[0].memberSince),
        }
      : null,
    accounts: accounts.map((account) => ({
      ...account,
      accountType: toAccountType(account.accountType),
      createdAt: normalizeDate(account.createdAt),
    })),
    categories: categories.map((category) => ({
      ...category,
      kind: toCategoryKind(category.kind),
    })),
    transactions: transactions.map((transaction) => ({
      ...transaction,
      transactionType: toTransactionType(transaction.transactionType),
      postedAt: normalizeDate(transaction.postedAt),
      createdAt: normalizeDate(transaction.createdAt),
    })),
  };
}

export async function ensureSeededBankingData(user: AuthUser): Promise<void> {
  const client = getRayfinClient();

  const [existingProfiles, existingAccounts, existingCategories] = await Promise.all([
    client.data.CustomerProfile.select(['id']).execute(),
    client.data.Account.select(['id']).execute(),
    client.data.BudgetCategory.select(['id', 'name']).execute(),
  ]);

  if (existingAccounts.length > 0) {
    return;
  }

  const seed = createSampleBankingSeed(user);

  if (existingProfiles.length === 0) {
    await client.data.CustomerProfile.create({
      ...seed.profile,
      user_id: user.id,
    });
  }

  const categoryIds = new Map<string, string>();

  for (const existingCategory of existingCategories) {
    categoryIds.set(existingCategory.name, existingCategory.id);
  }

  for (const category of seed.categories) {
    const existingId = categoryIds.get(category.name);
    if (existingId) {
      categoryIds.set(category.key, existingId);
      continue;
    }

    const { key: categoryKey, ...categoryInput } = category;
    const createdCategory = await client.data.BudgetCategory.create({
      ...categoryInput,
      user_id: user.id,
    });

    categoryIds.set(categoryKey, createdCategory.id);
    categoryIds.set(category.name, createdCategory.id);
  }

  const accountIds = new Map<string, string>();

  for (const account of seed.accounts) {
    const { key: accountKey, ...accountInput } = account;
    const createdAccount = await client.data.Account.create({
      ...accountInput,
      createdAt: new Date(),
      user_id: user.id,
    });

    accountIds.set(accountKey, createdAccount.id);
  }

  for (const transaction of seed.transactions) {
    await client.data.BankTransaction.create({
      transactionType: transaction.transactionType,
      status: 'completed',
      amount: transaction.amount,
      description: transaction.description,
      merchantName: transaction.merchantName,
      counterpartyName: transaction.counterpartyName,
      postedAt: transaction.postedAt,
      createdAt: transaction.postedAt,
      fromAccount: transaction.fromAccountKey
        ? { id: accountIds.get(transaction.fromAccountKey)! }
        : undefined,
      toAccount: transaction.toAccountKey
        ? { id: accountIds.get(transaction.toAccountKey)! }
        : undefined,
      category: transaction.categoryKey
        ? { id: categoryIds.get(transaction.categoryKey)! }
        : undefined,
      user_id: user.id,
    });
  }
}

export async function createBankAccount(
  user: AuthUser,
  input: CreateAccountInput
): Promise<void> {
  const client = getRayfinClient();
  const existingAccounts = await client.data.Account.select(['id']).execute();
  const accountSuffix = String(Date.now()).slice(-4);

  await client.data.Account.create({
    name: input.name,
    accountType: input.accountType,
    institution: input.institution,
    accountNumberMask: `••••${accountSuffix}`,
    currency: 'USD',
    accentColor:
      input.accountType === 'checking'
        ? 'bg-blue-500'
        : input.accountType === 'savings'
          ? 'bg-emerald-500'
          : 'bg-violet-500',
    openingBalance: input.openingBalance,
    displayOrder: existingAccounts.length + 1,
    createdAt: new Date(),
    user_id: user.id,
  });
}

export async function createMoneyMovement(
  user: AuthUser,
  input: CreateMoneyMovementInput
): Promise<void> {
  const client = getRayfinClient();

  await client.data.BankTransaction.create({
    transactionType: input.transactionType,
    status: 'completed',
    amount: input.amount,
    description: input.description,
    merchantName: input.merchantName,
    counterpartyName: input.counterpartyName,
    postedAt: new Date(),
    createdAt: new Date(),
    fromAccount: input.fromAccountId ? { id: input.fromAccountId } : undefined,
    toAccount: input.toAccountId ? { id: input.toAccountId } : undefined,
    category: input.categoryId ? { id: input.categoryId } : undefined,
    user_id: user.id,
  });
}
