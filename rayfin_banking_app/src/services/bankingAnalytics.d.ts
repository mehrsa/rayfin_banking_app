import type { Account, AccountSummary, BankTransaction, BankingAnalytics, BankingSnapshot } from '../types/banking';
export declare function getTransactionImpact(transaction: BankTransaction, accountId: string): number;
export declare function buildAccountSummaries(accounts: Account[], transactions: BankTransaction[]): AccountSummary[];
export declare function buildBankingAnalytics(snapshot: BankingSnapshot): BankingAnalytics;
