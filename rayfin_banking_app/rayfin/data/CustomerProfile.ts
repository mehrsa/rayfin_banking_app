import { date, decimal, entity, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class CustomerProfile {
  @uuid() id!: string;

  @text({ max: 120 }) fullName!: string;

  @text({ max: 160 }) email!: string;

  @text({ max: 160 }) primaryGoal!: string;

  @decimal() monthlyIncomeTarget!: number;

  @decimal() savingsGoal!: number;

  @date() memberSince!: Date;

  @text({ max: 120 }) user_id!: string;
}
