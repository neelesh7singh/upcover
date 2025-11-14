import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class PlanInfoDto {
  @ApiProperty({
    description: 'Plan ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Plan name',
    example: 'Premium',
  })
  name: string;

  @ApiProperty({
    description: 'Plan price',
    example: 29.99,
  })
  price: number;

  @ApiProperty({
    description: 'Currency',
    example: 'usd',
  })
  currency: string;

  @ApiProperty({
    description: 'Plan features',
    example: ['Feature 1', 'Feature 2'],
  })
  features: string[];

  @ApiProperty({
    description: 'Plan duration',
    example: 'monthly',
  })
  duration: string;
}

export class SubscriptionResponseDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439012',
  })
  userId: string;

  @ApiProperty({
    description: 'Plan information',
    type: PlanInfoDto,
  })
  plan: PlanInfoDto;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Stripe Subscription ID',
    example: 'sub_1234567890',
    required: false,
  })
  stripeSubscriptionId?: string;

  @ApiProperty({
    description: 'Stripe Customer ID',
    example: 'cus_1234567890',
    required: false,
  })
  stripeCustomerId?: string;

  @ApiProperty({
    description: 'Current period start date',
    example: '2024-01-01T00:00:00.000Z',
  })
  currentPeriodStart: string;

  @ApiProperty({
    description: 'Current period end date',
    example: '2024-02-01T00:00:00.000Z',
  })
  currentPeriodEnd: string;

  @ApiProperty({
    description: 'Trial start date',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  trialStart?: string;

  @ApiProperty({
    description: 'Trial end date',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  trialEnd?: string;

  @ApiProperty({
    description: 'Cancellation date',
    example: '2024-01-20T00:00:00.000Z',
    required: false,
  })
  canceledAt?: string;

  @ApiProperty({
    description: 'Subscription creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Subscription last update date',
    example: '2024-01-15T00:00:00.000Z',
  })
  updatedAt: string;
}
