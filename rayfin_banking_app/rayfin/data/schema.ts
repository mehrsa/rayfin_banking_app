import { AIWidgetRecord } from './AIWidgetRecord.js';
import { Account } from './Account.js';
import { AgentChatMessage } from './AgentChatMessage.js';
import { BankTransaction } from './BankTransaction.js';
import { BudgetCategory } from './BudgetCategory.js';
import { CustomerProfile } from './CustomerProfile.js';

export type AppSchema = {
  AIWidgetRecord: AIWidgetRecord;
  CustomerProfile: CustomerProfile;
  Account: Account;
  BudgetCategory: BudgetCategory;
  BankTransaction: BankTransaction;
  AgentChatMessage: AgentChatMessage;
};

export const schema = [
  AIWidgetRecord,
  CustomerProfile,
  Account,
  BudgetCategory,
  BankTransaction,
  AgentChatMessage,
];
