import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly stripeService: StripeService,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<SubscriptionDocument> {
    try {
      const subscription = new this.subscriptionModel({
        ...createSubscriptionDto,
        userId: createSubscriptionDto.userId,
        planId: createSubscriptionDto.planId,
        currentPeriodStart: new Date(createSubscriptionDto.currentPeriodStart),
        currentPeriodEnd: new Date(createSubscriptionDto.currentPeriodEnd),
        status: createSubscriptionDto.status || SubscriptionStatus.INCOMPLETE,
        trialStart: createSubscriptionDto.trialStart
          ? new Date(createSubscriptionDto.trialStart)
          : undefined,
        trialEnd: createSubscriptionDto.trialEnd
          ? new Date(createSubscriptionDto.trialEnd)
          : undefined,
      });

      const savedSubscription = await subscription.save();
      this.logger.log(`Subscription created: ${savedSubscription._id.toString()}`);
      return savedSubscription;
    } catch (error) {
      this.logger.error(`Error creating subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ userId, status: SubscriptionStatus.ACTIVE })
      .populate('planId')
      .exec();
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findOne({ stripeSubscriptionId }).populate('planId').exec();
  }

  async updateByStripeSubscriptionId(
    stripeSubscriptionId: string,
    updateData: Partial<SubscriptionDocument>,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel.findOne({ stripeSubscriptionId });
    if (!subscription) {
      throw new NotFoundException(`Subscription with Stripe ID ${stripeSubscriptionId} not found`);
    }

    Object.assign(subscription, updateData);
    const updated = await subscription.save();
    this.logger.log(`Subscription updated: ${updated._id.toString()}`);
    return updated;
  }

  async findAllByUserId(userId: string): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find({ userId })
      .populate('planId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel
      .find()
      .populate('planId')
      .populate('userId', 'email role')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getActiveSubscription(userId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({
        userId,
        status: {
          $in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      })
      .populate('planId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async cancel(
    subscriptionId: string,
    stripeSubscriptionId: string,
  ): Promise<SubscriptionDocument> {
    try {
      await this.stripeService.cancelSubscription(stripeSubscriptionId);
      this.logger.log(`Subscription canceled in Stripe: ${stripeSubscriptionId}`);

      const subscription = await this.subscriptionModel.findById(subscriptionId).populate('planId');
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
      const updated = await subscription.save();

      await updated.populate('planId');

      this.logger.log(`Subscription canceled in database: ${subscriptionId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error canceling subscription: ${error.message}`, error.stack);
      throw error;
    }
  }
}
