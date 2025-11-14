import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  let service: StripeService;
  let configService: ConfigService;

  const mockStripeInstance = {
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      cancel: jest.fn(),
    },
    invoices: {
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_123';
              if (key === 'STRIPE_API_VERSION') return '2023-10-16';
              return undefined;
            }),
          },
        },
        {
          provide: StripeService,
          useFactory: (configService: ConfigService) => {
            const stripeService = new StripeService(configService);
            (stripeService as any).stripe = mockStripeInstance;
            return stripeService;
          },
          inject: [ConfigService],
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    const params = {
      customerEmail: 'test@example.com',
      priceId: 'price_123',
      userId: '507f1f77bcf86cd799439011',
      planId: '507f1f77bcf86cd799439012',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    };

    it('should create checkout session', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      (mockStripeInstance.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const result = await service.createCheckoutSession(params);

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        customer_email: params.customerEmail,
        line_items: [{ price: params.priceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: { userId: params.userId, planId: params.planId },
        subscription_data: {
          metadata: { userId: params.userId, planId: params.planId },
        },
      });
      expect(result).toBe(mockSession);
    });

    it('should throw BadRequestException on error', async () => {
      (mockStripeInstance.checkout.sessions.create as jest.Mock).mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(service.createCheckoutSession(params)).rejects.toThrow(BadRequestException);
    });
  });

  describe('retrieveSubscription', () => {
    it('should retrieve subscription', async () => {
      const mockSubscription = { id: 'sub_123', status: 'active' };
      (mockStripeInstance.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.retrieveSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123', {
        expand: ['customer', 'items.data.price', 'latest_invoice'],
      });
      expect(result).toBe(mockSubscription);
    });

    it('should throw BadRequestException on error', async () => {
      (mockStripeInstance.subscriptions.retrieve as jest.Mock).mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(service.retrieveSubscription('sub_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('retrieveInvoice', () => {
    it('should retrieve invoice', async () => {
      const mockInvoice = { id: 'in_123', amount: 1000 };
      (mockStripeInstance.invoices.retrieve as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.retrieveInvoice('in_123');

      expect(mockStripeInstance.invoices.retrieve).toHaveBeenCalledWith('in_123');
      expect(result).toBe(mockInvoice);
    });

    it('should throw BadRequestException on error', async () => {
      (mockStripeInstance.invoices.retrieve as jest.Mock).mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(service.retrieveInvoice('in_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const mockSubscription = { id: 'sub_123', status: 'canceled' };
      (mockStripeInstance.subscriptions.cancel as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.cancelSubscription('sub_123');

      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
      expect(result).toBe(mockSubscription);
    });

    it('should throw BadRequestException on error', async () => {
      (mockStripeInstance.subscriptions.cancel as jest.Mock).mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(service.cancelSubscription('sub_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event', async () => {
      const mockEvent = { id: 'evt_123', type: 'checkout.session.completed' };
      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const result = await service.constructWebhookEvent('payload', 'signature');

      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'whsec_123',
      );
      expect(result).toBe(mockEvent);
    });

    it('should throw BadRequestException on error', async () => {
      (mockStripeInstance.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.constructWebhookEvent('payload', 'signature')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('retrieveCheckoutSession', () => {
    it('should retrieve checkout session', async () => {
      const mockSession = { id: 'cs_test_123', mode: 'subscription' };
      (mockStripeInstance.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(mockSession);

      const result = await service.retrieveCheckoutSession('cs_test_123');

      expect(mockStripeInstance.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_123', {
        expand: ['subscription', 'customer'],
      });
      expect(result).toBe(mockSession);
    });

    it('should throw BadRequestException on error', async () => {
      (mockStripeInstance.checkout.sessions.retrieve as jest.Mock).mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(service.retrieveCheckoutSession('cs_test_123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
