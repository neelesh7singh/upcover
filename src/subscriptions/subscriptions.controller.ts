import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService } from '../plans/plans.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument, UserRole } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('subscriptions/checkout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create Stripe Checkout Session for subscription' })
  @ApiBody({ type: CreateCheckoutDto })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan ID or missing Stripe price ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createCheckout(
    @Body() createCheckoutDto: CreateCheckoutDto,
    @CurrentUser() user: UserDocument,
  ): Promise<CheckoutResponseDto> {
    try {
      // Validate plan exists
      const plan = await this.plansService.findById(createCheckoutDto.planId);
      if (!plan.isActive) {
        throw new BadRequestException('Plan is not active');
      }

      // Check if plan has Stripe price ID
      if (!plan.stripePriceId) {
        throw new BadRequestException(
          'Plan does not have a Stripe price ID configured. Please configure Stripe price ID for this plan.',
        );
      }

      // Get default URLs from config or use provided ones
      const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      const successUrl =
        createCheckoutDto.successUrl ||
        `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = createCheckoutDto.cancelUrl || `${baseUrl}/subscription/cancel`;

      // Create Stripe Checkout Session
      const session = await this.stripeService.createCheckoutSession({
        customerEmail: user.email,
        priceId: plan.stripePriceId,
        userId: user._id.toString(),
        planId: plan._id.toString(),
        successUrl,
        cancelUrl,
      });

      this.logger.log(`Checkout session created for user ${user._id.toString()}: ${session.id}`);

      return {
        url: session.url || '',
        sessionId: session.id,
      };
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create checkout session: ${error.message}`);
    }
  }

  @Get('subscription')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getSubscription(@CurrentUser() user: UserDocument): Promise<SubscriptionResponseDto> {
    try {
      const subscription = await this.subscriptionsService.getActiveSubscription(
        user._id.toString(),
      );

      if (!subscription) {
        throw new NotFoundException('No active subscription found');
      }

      return this.mapToResponseDto(subscription);
    } catch (error) {
      this.logger.error(`Error retrieving subscription: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve subscription: ${error.message}`);
    }
  }

  @Post('subscription/cancel')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel current user subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  @ApiResponse({
    status: 400,
    description: 'Subscription cannot be canceled',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async cancelSubscription(@CurrentUser() user: UserDocument): Promise<SubscriptionResponseDto> {
    try {
      const subscription = await this.subscriptionsService.getActiveSubscription(
        user._id.toString(),
      );

      if (!subscription) {
        throw new NotFoundException('No active subscription found');
      }

      if (!subscription.stripeSubscriptionId) {
        throw new BadRequestException(
          'Subscription does not have a Stripe subscription ID and cannot be canceled',
        );
      }

      const canceledSubscription = await this.subscriptionsService.cancel(
        subscription._id.toString(),
        subscription.stripeSubscriptionId,
      );

      this.logger.log(
        `Subscription canceled for user ${user._id.toString()}: ${subscription._id.toString()}`,
      );

      return this.mapToResponseDto(canceledSubscription);
    } catch (error) {
      this.logger.error(`Error canceling subscription: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to cancel subscription: ${error.message}`);
    }
  }

  private mapToResponseDto(subscription: any): SubscriptionResponseDto {
    const plan = subscription.planId;

    if (!plan) {
      this.logger.warn(
        `Plan not populated for subscription ${subscription._id.toString()}, fetching plan separately`,
      );
      throw new BadRequestException(
        'Subscription plan information is not available. Please try again.',
      );
    }

    return {
      id: subscription._id.toString(),
      userId: subscription.userId.toString(),
      plan: {
        id: plan._id?.toString() || plan.toString(),
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        features: plan.features || [],
        duration: plan.duration,
      },
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      trialStart: subscription.trialStart?.toISOString(),
      trialEnd: subscription.trialEnd?.toISOString(),
      canceledAt: subscription.canceledAt?.toISOString(),
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  @Get('admin/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all subscriptions',
    type: [SubscriptionResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getAllSubscriptions(): Promise<SubscriptionResponseDto[]> {
    try {
      const subscriptions = await this.subscriptionsService.findAll();
      return subscriptions.map((subscription: any) => this.mapToResponseDto(subscription));
    } catch (error) {
      this.logger.error(`Error retrieving all subscriptions: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve subscriptions: ${error.message}`);
    }
  }

  @Get('admin/subscriptions/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscriptions for a specific user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'List of user subscriptions',
    type: [SubscriptionResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getUserSubscriptions(@Param('userId') userId: string): Promise<SubscriptionResponseDto[]> {
    try {
      const subscriptions = await this.subscriptionsService.findAllByUserId(userId);
      return subscriptions.map((subscription) => this.mapToResponseDto(subscription));
    } catch (error) {
      this.logger.error(
        `Error retrieving subscriptions for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Failed to retrieve subscriptions: ${error.message}`);
    }
  }
}
