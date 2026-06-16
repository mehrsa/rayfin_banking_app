import { date, entity, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class AgentChatMessage {
  @uuid() id!: string;

  @text({ max: 120 }) sessionId!: string;

  @text({ max: 24 }) role!: string;

  @text({ max: 2000 }) content!: string;

  @date() createdAt!: Date;

  @text({ max: 120 }) user_id!: string;
}
