import {
  date,
  decimal,
  entity,
  one,
  role,
  text,
  uuid,
} from '@microsoft/rayfin-core';

import { Account } from './Account.js';
import { BudgetCategory } from './BudgetCategory.js';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class BankTransaction {
  @uuid() id!: string;

  @text({ max: 24 }) transactionType!: string;

  @text({ max: 24 }) status!: string;

  @decimal() amount!: number;

  @text({ max: 160 }) description!: string;

  @text({ max: 120, optional: true }) merchantName?: string;

  @text({ max: 120, optional: true }) counterpartyName?: string;

  @date() postedAt!: Date;

  @date() createdAt!: Date;

  @one(() => Account, { optional: true }) fromAccount?: Account;

  @uuid({ optional: true }) fromAccount_id?: string;

  @one(() => Account, { optional: true }) toAccount?: Account;

  @uuid({ optional: true }) toAccount_id?: string;

  @one(() => BudgetCategory, { optional: true }) category?: BudgetCategory;

  @uuid({ optional: true }) category_id?: string;

  @text({ max: 120 }) user_id!: string;
}
