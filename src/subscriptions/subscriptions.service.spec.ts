import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from '../stripe/stripe.service';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let model: jest.Mocked<Model<SubscriptionDocument>>;
  let stripeService: StripeService;

  const mockSubscription = {
    _id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    planId: '507f1f77bcf86cd799439013',
    status: SubscriptionStatus.ACTIVE,
    stripeSubscriptionId: 'sub_123',
    stripeCustomerId: 'cus_123',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    save: jest.fn(),
    populate: jest.fn(),
  } as any;

  const mockSubscriptionModel: any = jest.fn().mockImplementation((data) => {
    const subscription = {
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: mockSubscription._id }),
    };
    return subscription;
  });

  beforeEach(async () => {
    mockSubscriptionModel.findOne = jest.fn();
    mockSubscriptionModel.findById = jest.fn();
    mockSubscriptionModel.find = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: StripeService,
          useValue: {
            cancelSubscription: jest.fn().mockResolvedValue({} as any),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    model = module.get<Model<SubscriptionDocument>>(
      getModelToken(Subscription.name),
    ) as jest.Mocked<Model<SubscriptionDocument>>;
    stripeService = module.get<StripeService>(StripeService) as any;

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateSubscriptionDto = {
      userId: '507f1f77bcf86cd799439012',
      planId: '507f1f77bcf86cd799439013',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      status: SubscriptionStatus.ACTIVE,
    };

    it('should create a subscription', async () => {
      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockSubscriptionModel).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should find active subscription by user id', async () => {
      (mockSubscriptionModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSubscription),
        }),
      });

      const result = await service.findByUserId('507f1f77bcf86cd799439012');

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
        userId: '507f1f77bcf86cd799439012',
        status: SubscriptionStatus.ACTIVE,
      });
      expect(result).toBe(mockSubscription);
    });
  });

  describe('findByStripeSubscriptionId', () => {
    it('should find subscription by stripe subscription id', async () => {
      (mockSubscriptionModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSubscription),
        }),
      });

      const result = await service.findByStripeSubscriptionId('sub_123');

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
        stripeSubscriptionId: 'sub_123',
      });
      expect(result).toBe(mockSubscription);
    });
  });

  describe('updateByStripeSubscriptionId', () => {
    it('should update subscription by stripe subscription id', async () => {
      (mockSubscriptionModel.findOne as jest.Mock).mockResolvedValue(mockSubscription);
      mockSubscription.save.mockResolvedValue(mockSubscription);

      const updateData = { status: SubscriptionStatus.CANCELED };
      const result = await service.updateByStripeSubscriptionId('sub_123', updateData);

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
        stripeSubscriptionId: 'sub_123',
      });
      expect(mockSubscription.save).toHaveBeenCalled();
      expect(result).toBe(mockSubscription);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      (mockSubscriptionModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateByStripeSubscriptionId('sub_123', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllByUserId', () => {
    it('should find all subscriptions by user id', async () => {
      const mockSubscriptions = [mockSubscription];
      (mockSubscriptionModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSubscriptions),
          }),
        }),
      });

      const result = await service.findAllByUserId('507f1f77bcf86cd799439012');

      expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
        userId: '507f1f77bcf86cd799439012',
      });
      expect(result).toBe(mockSubscriptions);
    });
  });

  describe('findAll', () => {
    it('should find all subscriptions', async () => {
      const mockSubscriptions = [mockSubscription];
      (mockSubscriptionModel.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockSubscriptions),
            }),
          }),
        }),
      });

      const result = await service.findAll();

      expect(mockSubscriptionModel.find).toHaveBeenCalled();
      expect(result).toBe(mockSubscriptions);
    });
  });

  describe('getActiveSubscription', () => {
    it('should get active subscription for user', async () => {
      (mockSubscriptionModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockSubscription),
          }),
        }),
      });

      const result = await service.getActiveSubscription('507f1f77bcf86cd799439012');

      expect(mockSubscriptionModel.findOne).toHaveBeenCalled();
      expect(result).toBe(mockSubscription);
    });
  });

  describe('cancel', () => {
    it('should cancel subscription', async () => {
      (stripeService.cancelSubscription as jest.Mock).mockResolvedValue({} as any);
      (mockSubscriptionModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockSubscription),
      });
      mockSubscription.save.mockResolvedValue(mockSubscription);
      mockSubscription.populate.mockResolvedValue(mockSubscription);

      const result = await service.cancel('507f1f77bcf86cd799439011', 'sub_123');

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_123');
      expect(mockSubscriptionModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockSubscription.status).toBe(SubscriptionStatus.CANCELED);
      expect(mockSubscription.save).toHaveBeenCalled();
      expect(result).toBe(mockSubscription);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      (stripeService.cancelSubscription as jest.Mock).mockResolvedValue({} as any);
      (mockSubscriptionModel.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cancel('507f1f77bcf86cd799439011', 'sub_123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
