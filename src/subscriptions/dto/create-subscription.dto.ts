import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { SubscriptionStatus } from '../schemas/subscription.schema';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @ApiProperty({
    description: 'Plan ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty()
  @IsMongoId()
  planId: string;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
    required: false,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({
    description: 'Stripe Subscription ID',
    example: 'sub_1234567890',
    required: false,
  })
  @IsOptional()
  stripeSubscriptionId?: string;

  @ApiProperty({
    description: 'Stripe Customer ID',
    example: 'cus_1234567890',
    required: false,
  })
  @IsOptional()
  stripeCustomerId?: string;

  @ApiProperty({
    description: 'Current period start date',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  currentPeriodStart: string;

  @ApiProperty({
    description: 'Current period end date',
    example: '2024-02-01T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  currentPeriodEnd: string;

  @ApiProperty({
    description: 'Trial start date',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  trialStart?: string;

  @ApiProperty({
    description: 'Trial end date',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  trialEnd?: string;
}
