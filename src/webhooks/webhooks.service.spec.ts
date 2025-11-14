import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';
import Stripe from 'stripe';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let stripeService: any;
  let subscriptionsService: any;

  const mockSubscription = {
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 2592000,
    metadata: { userId: '507f1f77bcf86cd799439011', planId: '507f1f77bcf86cd799439012' },
  } as any;

  const mockCheckoutSession = {
    id: 'cs_test_123',
    mode: 'subscription',
    subscription: 'sub_123',
    metadata: { userId: '507f1f77bcf86cd799439011', planId: '507f1f77bcf86cd799439012' },
  } as any;

  const mockInvoice = {
    id: 'in_123',
    subscription: 'sub_123',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: StripeService,
          useValue: {
            retrieveSubscription: jest.fn(),
            retrieveInvoice: jest.fn(),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            create: jest.fn(),
            findByStripeSubscriptionId: jest.fn(),
            updateByStripeSubscriptionId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    stripeService = module.get<StripeService>(StripeService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);

    jest.clearAllMocks();
  });

  describe('handleEvent', () => {
    it('should handle checkout.session.completed event', async () => {
      const event = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: { object: mockCheckoutSession },
      } as Stripe.Event;

      stripeService.retrieveSubscription.mockResolvedValue(mockSubscription);
      subscriptionsService.findByStripeSubscriptionId.mockResolvedValue(null);
      subscriptionsService.create.mockResolvedValue({} as any);

      await service.handleEvent(event);

      expect(stripeService.retrieveSubscription).toHaveBeenCalled();
    });

    it('should handle customer.subscription.created event', async () => {
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: { object: mockSubscription },
      } as Stripe.Event;

      stripeService.retrieveSubscription.mockResolvedValue(mockSubscription);
      subscriptionsService.findByStripeSubscriptionId.mockResolvedValue(null);
      subscriptionsService.create.mockResolvedValue({} as any);

      await service.handleEvent(event);

      expect(stripeService.retrieveSubscription).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated event', async () => {
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      } as Stripe.Event;

      stripeService.retrieveSubscription.mockResolvedValue(mockSubscription);
      subscriptionsService.findByStripeSubscriptionId.mockResolvedValue({} as any);
      subscriptionsService.updateByStripeSubscriptionId.mockResolvedValue({} as any);

      await service.handleEvent(event);

      expect(stripeService.retrieveSubscription).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted event', async () => {
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      } as Stripe.Event;

      subscriptionsService.findByStripeSubscriptionId.mockResolvedValue({} as any);
      subscriptionsService.updateByStripeSubscriptionId.mockResolvedValue({} as any);

      await service.handleEvent(event);

      expect(subscriptionsService.updateByStripeSubscriptionId).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          status: SubscriptionStatus.CANCELED,
        }),
      );
    });

    it('should handle invoice.payment_failed event', async () => {
      const event = {
        id: 'evt_123',
        type: 'invoice.payment_failed',
        data: { object: mockInvoice },
      } as Stripe.Event;

      subscriptionsService.findByStripeSubscriptionId.mockResolvedValue({} as any);
      subscriptionsService.updateByStripeSubscriptionId.mockResolvedValue({} as any);

      await service.handleEvent(event);

      expect(subscriptionsService.updateByStripeSubscriptionId).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          status: SubscriptionStatus.PAST_DUE,
        }),
      );
    });

    it('should log warning for unhandled event types', async () => {
      const event = {
        id: 'evt_123',
        type: 'customer.created',
        data: { object: {} },
      } as Stripe.Event;

      await service.handleEvent(event);

      expect(subscriptionsService.create).not.toHaveBeenCalled();
    });

    it('should handle errors and rethrow', async () => {
      const event = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: { object: mockCheckoutSession },
      } as Stripe.Event;

      stripeService.retrieveSubscription.mockRejectedValue(new Error('Stripe error'));

      await expect(service.handleEvent(event)).rejects.toThrow('Stripe error');
    });
  });

  describe('extractSubscriptionPeriodDates', () => {
    it('should extract dates from current_period_start and current_period_end', async () => {
      const subscription = {
        id: 'sub_123',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      } as any;

      const result = await (service as any).extractSubscriptionPeriodDates(subscription);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should extract dates from latest invoice', async () => {
      const subscription = {
        id: 'sub_123',
        current_period_start: null,
        current_period_end: null,
        latest_invoice: {
          id: 'in_123',
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 2592000,
        },
      } as any;

      const result = await (service as any).extractSubscriptionPeriodDates(subscription);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should calculate dates from start_date and billing interval', async () => {
      const subscription = {
        id: 'sub_123',
        current_period_start: null,
        current_period_end: null,
        latest_invoice: null,
        start_date: Math.floor(Date.now() / 1000),
        items: {
          data: [
            {
              price: {
                recurring: {
                  interval: 'month',
                  interval_count: 1,
                },
              },
            },
          ],
        },
      } as any;

      const result = await (service as any).extractSubscriptionPeriodDates(subscription);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });
  });
});
