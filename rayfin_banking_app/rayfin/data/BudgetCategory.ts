import { decimal, entity, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class BudgetCategory {
  @uuid() id!: string;

  @text({ max: 80 }) name!: string;

  @text({ max: 24 }) kind!: string;

  @text({ max: 24 }) accentColor!: string;

  @text({ max: 160, optional: true }) description?: string;

  @decimal() monthlyBudget!: number;

  @text({ max: 120 }) user_id!: string;
}
