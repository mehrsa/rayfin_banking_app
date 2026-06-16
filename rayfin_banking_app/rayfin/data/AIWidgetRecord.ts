import { date, entity, role, text, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class AIWidgetRecord {
  @uuid() id!: string;

  @text({ max: 160 }) title!: string;

  @text({ max: 400 }) description!: string;

  @text({ max: 24 }) widget_type!: string;

  @text({ max: 24 }) data_mode!: string;

  @text({ max: 24 }) chart_type!: string;

  @text({ max: 64, optional: true }) query_key?: string;

  @text({ max: 80, optional: true }) x_axis?: string;

  @text({ max: 80, optional: true }) y_axis?: string;

  @text({ max: 800, optional: true }) colors_json?: string;

  @text({ max: 4000, optional: true }) custom_data_json?: string;

  @text({ max: 40, optional: true }) simulation_type?: string;

  @text({ max: 2000, optional: true }) simulation_defaults_json?: string;

  @date({ optional: true }) last_refreshed?: Date;

  @text({ max: 120 }) user_id!: string;
}
