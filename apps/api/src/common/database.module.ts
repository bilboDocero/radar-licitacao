import { Global, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { createDatabase } from '@radar/database';
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly connection = createDatabase();
  readonly db = this.connection.db;
  async onApplicationShutdown() {
    await this.connection.pool.end();
  }
}
@Global()
@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
