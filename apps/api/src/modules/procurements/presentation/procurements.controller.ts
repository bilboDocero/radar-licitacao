import { Controller, Delete, Get, Inject, Param, Put, Query, UseGuards } from '@nestjs/common';
import type { TenantContext } from '@radar/contracts';
import { Tenant } from '../../../common/http.js';
import { TenantGuard } from '../../tenancy/tenancy.module.js';
import { ProcurementsService } from '../application/procurements.service.js';
@Controller()
@UseGuards(TenantGuard)
export class ProcurementsController {
  constructor(@Inject(ProcurementsService) private readonly service: ProcurementsService) {}
  @Get('procurements') search(@Query() query: unknown) {
    return this.service.search(query);
  }
  @Get('procurements/:id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
  @Get('favorites') favorites(@Tenant() tenant: TenantContext) {
    return this.service.favorites(tenant.organizationId);
  }
  @Put('favorites/:id') save(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.save(tenant, id);
  }
  @Delete('favorites/:id') remove(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.remove(tenant, id);
  }
}
