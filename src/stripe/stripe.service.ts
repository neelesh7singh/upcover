import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const apiVersion = this.configService.get<string>(
      'STRIPE_API_VERSION',
      '2023-10-16',
    ) as Stripe.LatestApiVersion;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion,
    });

    this.logger.log('Stripe service initialized');
  }

  async createCheckoutSession(params: {
    customerEmail: string;
    priceId: string;
    userId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: params.customerEmail,
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          userId: params.userId,
          planId: params.planId,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
            planId: params.planId,
          },
        },
      });

      this.logger.log(`Checkout session created: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create checkout session: ${error.message}`);
    }
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'items.data.price', 'latest_invoice'],
      });
      return subscription;
    } catch (error) {
      this.logger.error(`Error retrieving subscription: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve subscription: ${error.message}`);
    }
  }

  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      this.logger.error(`Error retrieving invoice: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve invoice: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Subscription canceled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Error canceling subscription: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined in environment variables');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });
      return session;
    } catch (error) {
      this.logger.error(`Error retrieving checkout session: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to retrieve checkout session: ${error.message}`);
    }
  }
}
