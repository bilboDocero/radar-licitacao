import { Controller, Get, Module } from '@nestjs/common';
export interface PaymentProvider {
  createCheckout(input: {
    organizationId: string;
    planId: string;
    idempotencyKey: string;
  }): Promise<{ url: string }>;
  verifyWebhook(body: Uint8Array, signature: string): Promise<{ eventId: string; status: string }>;
}
@Controller('billing')
class BillingController {
  @Get('status') status() {
    return {
      configured: false,
      message:
        'Provedor de pagamentos ainda não configurado. Nenhuma cobrança é realizada. O período de avaliação não representa uma assinatura paga.',
    };
  }
}
@Module({ controllers: [BillingController] })
export class BillingModule {}
