import { date, decimal, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Account {
  @uuid() id!: string;

  @text({ max: 120 }) name!: string;

  @text({ max: 40 }) accountType!: string;

  @text({ max: 120 }) institution!: string;

  @text({ max: 16 }) accountNumberMask!: string;

  @text({ max: 12 }) currency!: string;

  @text({ max: 24 }) accentColor!: string;

  @decimal() openingBalance!: number;

  @int() displayOrder!: number;

  @date() createdAt!: Date;

  @text({ max: 120 }) user_id!: string;
}
