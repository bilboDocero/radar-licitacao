import { Global, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { environment, logger } from '@radar/config';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(environment().REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      connectTimeout: 5000,
    });

    this.client.on('error', (err) => {
      logger.warn({ err }, 'Aviso de conexão com o Redis');
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      logger.warn({ err, key }, 'Falha na leitura do cache Redis');
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      logger.warn({ err, key }, 'Falha na escrita do cache Redis');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'Falha ao remover chave no Redis');
    }
  }

  /**
   * Implementa rate limiting com contador em janela temporal no Redis.
   */
  async checkRateLimit(
    key: string,
    windowSeconds: number,
    maxRequests: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }
      const allowed = current <= maxRequests;
      const remaining = Math.max(0, maxRequests - current);
      return { allowed, remaining };
    } catch (err) {
      logger.warn({ err, key }, 'Falha na checagem de rate limit no Redis; liberando preventivamente');
      return { allowed: true, remaining: 1 };
    }
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
