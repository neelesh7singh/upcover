import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateStripePriceDto {
  @ApiProperty({
    description: 'Stripe Price ID',
    example: 'price_1234567890',
  })
  @IsNotEmpty({ message: 'Stripe Price ID is required' })
  @IsString({ message: 'Stripe Price ID must be a string' })
  stripePriceId: string;
}
