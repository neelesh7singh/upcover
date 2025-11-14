import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsOptional, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Plan ID to subscribe to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Plan ID is required' })
  @IsMongoId({ message: 'Invalid plan ID format' })
  planId: string;

  @ApiProperty({
    description: 'Success URL (where to redirect after successful payment)',
    example: 'https://yourapp.com/success',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Success URL must be a valid URL' })
  successUrl?: string;

  @ApiProperty({
    description: 'Cancel URL (where to redirect if payment is canceled)',
    example: 'https://yourapp.com/cancel',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Cancel URL must be a valid URL' })
  cancelUrl?: string;
}
