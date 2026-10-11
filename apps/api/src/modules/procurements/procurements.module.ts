import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { ProcurementsService } from './application/procurements.service.js';
import { ProcurementsController } from './presentation/procurements.controller.js';
@Module({
  imports: [TenancyModule],
  controllers: [ProcurementsController],
  providers: [ProcurementsService],
  exports: [ProcurementsService],
})
export class ProcurementsModule {}
