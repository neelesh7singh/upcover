import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type} (ID: ${event.id})`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.warn(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling event ${event.type}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      if (session.mode !== 'subscription') {
        this.logger.log('Checkout session is not for subscription, skipping');
        return;
      }

      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      const subscriptionId = session.subscription as string;

      if (!userId || !planId || !subscriptionId) {
        this.logger.error('Missing required metadata in checkout session', {
          userId,
          planId,
          subscriptionId,
        });
        return;
      }

      // Retrieve full subscription details from Stripe
      const stripeSubscription = await this.stripeService.retrieveSubscription(subscriptionId);

      // Check if subscription already exists (idempotency)
      const existingSubscription =
        await this.subscriptionsService.findByStripeSubscriptionId(subscriptionId);

      if (existingSubscription) {
        this.logger.log(`Subscription already exists: ${subscriptionId}`);
        return;
      }

      // Extract period dates from multiple possible sources
      const periodDates = await this.extractSubscriptionPeriodDates(stripeSubscription);
      const currentPeriodStart = periodDates.start;
      const currentPeriodEnd = periodDates.end;

      // Create subscription in database with available period dates
      await this.subscriptionsService.create({
        userId,
        planId,
        status: this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status),
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId:
          typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer?.id || undefined,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: this.stripeTimestampToISO(stripeSubscription.trial_start),
        trialEnd: this.stripeTimestampToISO(stripeSubscription.trial_end),
      });

      this.logger.log(`Subscription created from checkout session: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error handling checkout.session.completed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const subscriptionId = subscription.id;
      const userId = subscription.metadata?.userId;
      const planId = subscription.metadata?.planId;

      if (!userId || !planId) {
        this.logger.warn(`Missing metadata in subscription ${subscriptionId}`);
        return;
      }

      // Retrieve full subscription details from Stripe to ensure we have all fields
      // Sometimes the webhook event object might not have all fields populated
      const fullSubscription = await this.stripeService.retrieveSubscription(subscriptionId);

      // Check if subscription already exists
      const existingSubscription =
        await this.subscriptionsService.findByStripeSubscriptionId(subscriptionId);

      // Extract period dates from multiple possible sources
      const periodDates = await this.extractSubscriptionPeriodDates(fullSubscription);
      const currentPeriodStart = periodDates.start;
      const currentPeriodEnd = periodDates.end;

      if (existingSubscription) {
        // Update existing subscription
        await this.subscriptionsService.updateByStripeSubscriptionId(subscriptionId, {
          status: this.mapStripeStatusToSubscriptionStatus(fullSubscription.status),
          currentPeriodStart: new Date(currentPeriodStart),
          currentPeriodEnd: new Date(currentPeriodEnd),
          stripeCustomerId:
            typeof fullSubscription.customer === 'string'
              ? fullSubscription.customer
              : fullSubscription.customer?.id || undefined,
        } as any);
      } else {
        // Create new subscription
        await this.subscriptionsService.create({
          userId,
          planId,
          status: this.mapStripeStatusToSubscriptionStatus(fullSubscription.status),
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId:
            typeof fullSubscription.customer === 'string'
              ? fullSubscription.customer
              : fullSubscription.customer?.id || undefined,
          currentPeriodStart,
          currentPeriodEnd,
          trialStart: this.stripeTimestampToISO(fullSubscription.trial_start),
          trialEnd: this.stripeTimestampToISO(fullSubscription.trial_end),
        });
      }

      this.logger.log(`Subscription created/updated: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error handling subscription.created: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const subscriptionId = subscription.id;

      // Retrieve full subscription to ensure we have all fields
      const fullSubscription = await this.stripeService.retrieveSubscription(subscriptionId);

      const existingSubscription =
        await this.subscriptionsService.findByStripeSubscriptionId(subscriptionId);

      if (!existingSubscription) {
        this.logger.warn(`Subscription not found for update: ${subscriptionId}`);
        return;
      }

      // Extract period dates from multiple possible sources
      const periodDates = await this.extractSubscriptionPeriodDates(fullSubscription);

      await this.subscriptionsService.updateByStripeSubscriptionId(subscriptionId, {
        status: this.mapStripeStatusToSubscriptionStatus(fullSubscription.status),
        currentPeriodStart: new Date(periodDates.start),
        currentPeriodEnd: new Date(periodDates.end),
        canceledAt: this.stripeTimestampToDate(fullSubscription.canceled_at),
      } as any);

      this.logger.log(`Subscription updated: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error handling subscription.updated: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const subscriptionId = subscription.id;

      const existingSubscription =
        await this.subscriptionsService.findByStripeSubscriptionId(subscriptionId);

      if (!existingSubscription) {
        this.logger.warn(`Subscription not found for deletion: ${subscriptionId}`);
        return;
      }

      await this.subscriptionsService.updateByStripeSubscriptionId(subscriptionId, {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      } as any);

      this.logger.log(`Subscription canceled: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error handling subscription.deleted: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) {
        this.logger.warn('Invoice does not have a subscription ID');
        return;
      }

      const existingSubscription =
        await this.subscriptionsService.findByStripeSubscriptionId(subscriptionId);

      if (!existingSubscription) {
        this.logger.warn(`Subscription not found for payment failure: ${subscriptionId}`);
        return;
      }

      await this.subscriptionsService.updateByStripeSubscriptionId(subscriptionId, {
        status: SubscriptionStatus.PAST_DUE,
      } as any);

      this.logger.warn(`Payment failed for subscription: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Error handling invoice.payment_failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapStripeStatusToSubscriptionStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      past_due: SubscriptionStatus.PAST_DUE,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }

  private async extractSubscriptionPeriodDates(
    subscription: Stripe.Subscription,
  ): Promise<{ start: string; end: string }> {
    if (subscription.current_period_start && subscription.current_period_end) {
      const start = this.stripeTimestampToISO(subscription.current_period_start);
      const end = this.stripeTimestampToISO(subscription.current_period_end);
      if (start && end) {
        return { start, end };
      }
    }

    if (subscription.latest_invoice) {
      let invoice: Stripe.Invoice;
      if (typeof subscription.latest_invoice === 'string') {
        invoice = await this.stripeService.retrieveInvoice(subscription.latest_invoice);
      } else {
        invoice = subscription.latest_invoice;
      }

      if (invoice.period_start && invoice.period_end) {
        const start = this.stripeTimestampToISO(invoice.period_start);
        const end = this.stripeTimestampToISO(invoice.period_end);
        if (start && end) {
          this.logger.log(
            `Using period dates from latest invoice for subscription ${subscription.id}`,
          );
          return { start, end };
        }
      }
    }

    if (subscription.start_date) {
      const startDate = new Date(subscription.start_date * 1000);
      let endDate: Date;

      const items = subscription.items?.data || [];
      if (items.length > 0 && items[0].price?.recurring) {
        const interval = items[0].price.recurring.interval;
        const intervalCount = items[0].price.recurring.interval_count || 1;

        endDate = new Date(startDate);
        if (interval === 'day') {
          endDate.setDate(endDate.getDate() + intervalCount);
        } else if (interval === 'week') {
          endDate.setDate(endDate.getDate() + intervalCount * 7);
        } else if (interval === 'month') {
          endDate.setMonth(endDate.getMonth() + intervalCount);
        } else if (interval === 'year') {
          endDate.setFullYear(endDate.getFullYear() + intervalCount);
        }

        this.logger.log(
          `Calculated period dates from start_date and billing interval for subscription ${subscription.id}`,
        );
        return {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };
      }
    }

    if (subscription.billing_cycle_anchor) {
      const anchorDate = new Date(subscription.billing_cycle_anchor * 1000);
      const endDate = new Date(anchorDate);
      endDate.setMonth(endDate.getMonth() + 1);

      this.logger.log(
        `Using billing_cycle_anchor for period dates for subscription ${subscription.id}`,
      );
      return {
        start: anchorDate.toISOString(),
        end: endDate.toISOString(),
      };
    }

    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    this.logger.warn(
      `Could not determine period dates for subscription ${subscription.id}, using current time + 1 month as fallback`,
    );
    return {
      start: now.toISOString(),
      end: oneMonthLater.toISOString(),
    };
  }

  private stripeTimestampToISO(timestamp: number | null | undefined): string | undefined {
    if (!timestamp || timestamp === 0) {
      return undefined;
    }
    try {
      const date = new Date(timestamp * 1000);
      if (isNaN(date.getTime())) {
        this.logger.warn(`Invalid timestamp: ${timestamp}`);
        return undefined;
      }
      return date.toISOString();
    } catch (error) {
      this.logger.error(`Error converting timestamp ${timestamp}: ${error.message}`);
      return undefined;
    }
  }

  private stripeTimestampToDate(timestamp: number | null | undefined): Date | undefined {
    if (!timestamp || timestamp === 0) {
      return undefined;
    }
    try {
      const date = new Date(timestamp * 1000);
      if (isNaN(date.getTime())) {
        this.logger.warn(`Invalid timestamp: ${timestamp}`);
        return undefined;
      }
      return date;
    } catch (error) {
      this.logger.error(`Error converting timestamp ${timestamp}: ${error.message}`);
      return undefined;
    }
  }
}
