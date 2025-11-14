import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { PlansService } from './plans.service';
import { Plan, PlanDocument, PlanName } from './schemas/plan.schema';

describe('PlansService', () => {
  let service: PlansService;
  let model: jest.Mocked<Model<PlanDocument>>;

  const mockPlan = {
    _id: '507f1f77bcf86cd799439011',
    name: PlanName.BASIC,
    price: 9.99,
    currency: 'USD',
    features: ['Feature 1', 'Feature 2'],
    duration: 'monthly',
    isActive: true,
    stripePriceId: 'price_123',
    save: jest.fn(),
  } as any;

  const mockPlanModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    insertMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: getModelToken(Plan.name),
          useValue: mockPlanModel,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    model = module.get<Model<PlanDocument>>(getModelToken(Plan.name)) as jest.Mocked<
      Model<PlanDocument>
    >;

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active plans sorted by price', async () => {
      const mockPlans = [mockPlan, { ...mockPlan, _id: '507f1f77bcf86cd799439012', price: 19.99 }];
      (model.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPlans),
        }),
      });

      const result = await service.findAll();

      expect(model.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toBe(mockPlans);
    });
  });

  describe('findById', () => {
    it('should return plan by id', async () => {
      (model.findById as jest.Mock).mockResolvedValue(mockPlan);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(model.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(mockPlan);
    });

    it('should throw NotFoundException if plan not found', async () => {
      (model.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStripePriceId', () => {
    it('should update stripe price id', async () => {
      (model.findById as jest.Mock).mockResolvedValue(mockPlan);
      mockPlan.save.mockResolvedValue({ ...mockPlan, stripePriceId: 'price_456' });

      const result = await service.updateStripePriceId('507f1f77bcf86cd799439011', 'price_456');

      expect(model.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockPlan.stripePriceId).toBe('price_456');
      expect(mockPlan.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if plan not found', async () => {
      (model.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStripePriceId('507f1f77bcf86cd799439011', 'price_456'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
