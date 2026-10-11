import { Controller, Get, Inject, Module } from '@nestjs/common';
import { municipalities } from '@radar/database';
import { states } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Public } from '../../common/http.js';
@Controller('geography')
class GeographyController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Public() @Get() async list() {
    return {
      states,
      municipalities: await this.database.db.select().from(municipalities),
      note: 'Referência inicial de municípios; códigos oficiais IBGE. Importação completa pendente.',
    };
  }
}
@Module({ controllers: [GeographyController] })
export class GeographyModule {}
