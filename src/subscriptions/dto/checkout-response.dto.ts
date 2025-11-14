import { ApiProperty } from '@nestjs/swagger';

export class CheckoutResponseDto {
  @ApiProperty({
    description: 'Stripe Checkout Session URL',
    example: 'https://checkout.stripe.com/c/pay/cs_test_...',
  })
  url: string;

  @ApiProperty({
    description: 'Stripe Checkout Session ID',
    example: 'cs_test_1234567890',
  })
  sessionId: string;
}
