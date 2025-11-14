import { ApiProperty } from '@nestjs/swagger';
import { PlanName, PlanDuration } from '../schemas/plan.schema';

export class PlanResponseDto {
  @ApiProperty({
    description: 'Plan ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Plan name',
    enum: PlanName,
    example: PlanName.BASIC,
  })
  name: PlanName;

  @ApiProperty({
    description: 'Plan price',
    example: 9.99,
  })
  price: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Stripe Price ID',
    example: 'price_1234567890',
    required: false,
  })
  stripePriceId?: string;

  @ApiProperty({
    description: 'Stripe Product ID',
    example: 'prod_1234567890',
    required: false,
  })
  stripeProductId?: string;

  @ApiProperty({
    description: 'Plan features',
    example: ['Feature 1', 'Feature 2'],
    type: [String],
  })
  features: string[];

  @ApiProperty({
    description: 'Plan duration',
    enum: PlanDuration,
    example: PlanDuration.MONTHLY,
  })
  duration: PlanDuration;

  @ApiProperty({
    description: 'Whether the plan is active',
    example: true,
  })
  isActive: boolean;
}
