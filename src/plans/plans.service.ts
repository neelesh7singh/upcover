import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument, PlanName } from './schemas/plan.schema';

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(@InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>) {}

  async onModuleInit() {
    await this.initializePlans();
  }

  private async initializePlans(): Promise<void> {
    try {
      const existingPlans = await this.planModel.countDocuments();
      if (existingPlans > 0) {
        this.logger.log('Plans already exist, skipping initialization');
        return;
      }

      const plans = [
        {
          name: PlanName.BASIC,
          price: 9.99,
          currency: 'USD',
          features: ['Basic feature 1', 'Basic feature 2', 'Basic feature 3'],
          duration: 'monthly' as const,
          isActive: true,
        },
        {
          name: PlanName.STANDARD,
          price: 19.99,
          currency: 'USD',
          features: [
            'Standard feature 1',
            'Standard feature 2',
            'Standard feature 3',
            'Standard feature 4',
          ],
          duration: 'monthly' as const,
          isActive: true,
        },
        {
          name: PlanName.PREMIUM,
          price: 39.99,
          currency: 'USD',
          features: [
            'Premium feature 1',
            'Premium feature 2',
            'Premium feature 3',
            'Premium feature 4',
            'Premium feature 5',
            'Priority support',
          ],
          duration: 'monthly' as const,
          isActive: true,
        },
      ];

      await this.planModel.insertMany(plans);
      this.logger.log('Successfully initialized 3 default plans');
    } catch (error) {
      this.logger.error(`Error initializing plans: ${error.message}`, error.stack);
    }
  }

  async findAll(): Promise<PlanDocument[]> {
    return this.planModel.find({ isActive: true }).sort({ price: 1 }).exec();
  }

  async findById(id: string): Promise<PlanDocument> {
    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return plan;
  }

  async updateStripePriceId(planId: string, stripePriceId: string): Promise<PlanDocument> {
    const plan = await this.findById(planId);
    plan.stripePriceId = stripePriceId;
    return plan.save();
  }
}
