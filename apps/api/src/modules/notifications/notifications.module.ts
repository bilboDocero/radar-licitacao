import {
  Controller,
  Get,
  Inject,
  Module,
  Param,
  Put,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { alerts } from '@radar/database';
import type { TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Tenant, uuid } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
@Controller('notifications')
@UseGuards(TenantGuard)
class NotificationsController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get() list(@Tenant() tenant: TenantContext) {
    return this.database.db
      .select()
      .from(alerts)
      .where(eq(alerts.organizationId, tenant.organizationId))
      .orderBy(desc(alerts.createdAt))
      .limit(100);
  }
  @Put(':id/read') async read(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    const [row] = await this.database.db
      .update(alerts)
      .set({ readAt: new Date() })
      .where(and(eq(alerts.id, uuid(id)), eq(alerts.organizationId, tenant.organizationId)))
      .returning();
    if (!row) throw new NotFoundException('Notificação não encontrada');
    return row;
  }
}
@Module({ imports: [TenancyModule], controllers: [NotificationsController] })
export class NotificationsModule {}
