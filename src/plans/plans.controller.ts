import { Controller, Get, Param, Patch, Body, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { PlanResponseDto } from './dto/plan-response.dto';
import { UpdateStripePriceDto } from './dto/update-stripe-price.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'List of available plans',
    type: [PlanResponseDto],
  })
  async findAll(): Promise<PlanResponseDto[]> {
    const plans = await this.plansService.findAll();
    return plans.map((plan) => this.mapToResponseDto(plan));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific plan by ID' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan details',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  async findOne(@Param('id') id: string): Promise<PlanResponseDto> {
    const plan = await this.plansService.findById(id);
    return this.mapToResponseDto(plan);
  }

  @Patch('admin/:id/stripe-price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update Stripe Price ID for a plan (Admin only)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiBody({ type: UpdateStripePriceDto })
  @ApiResponse({
    status: 200,
    description: 'Plan updated successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plan not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateStripePriceId(
    @Param('id') id: string,
    @Body() updateStripePriceDto: UpdateStripePriceDto,
  ): Promise<PlanResponseDto> {
    try {
      const plan = await this.plansService.updateStripePriceId(
        id,
        updateStripePriceDto.stripePriceId,
      );
      this.logger.log(
        `Stripe Price ID updated for plan ${id}: ${updateStripePriceDto.stripePriceId}`,
      );
      return this.mapToResponseDto(plan);
    } catch (error) {
      this.logger.error(`Error updating Stripe Price ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapToResponseDto(plan: any): PlanResponseDto {
    return {
      id: plan._id.toString(),
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId,
      features: plan.features,
      duration: plan.duration,
      isActive: plan.isActive,
    };
  }
}
