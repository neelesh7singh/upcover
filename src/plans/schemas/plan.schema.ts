import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlanDocument = Plan &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum PlanName {
  BASIC = 'Basic',
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
}

export enum PlanDuration {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Schema({
  timestamps: true,
  collection: 'plans',
})
export class Plan {
  @Prop({
    type: String,
    enum: Object.values(PlanName),
    required: true,
    unique: true,
  })
  name: PlanName;

  @Prop({
    type: Number,
    required: true,
    min: [0, 'Price must be a positive number'],
  })
  price: number;

  @Prop({
    type: String,
    default: 'usd',
    uppercase: true,
  })
  currency: string;

  @Prop({
    type: String,
    required: false,
    unique: true,
    sparse: true,
  })
  stripePriceId?: string;

  @Prop({
    type: [String],
    default: [],
  })
  features: string[];

  @Prop({
    type: String,
    enum: Object.values(PlanDuration),
    default: PlanDuration.MONTHLY,
  })
  duration: PlanDuration;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

// Create indexes
PlanSchema.index({ name: 1 }, { unique: true });
PlanSchema.index({ stripePriceId: 1 }, { unique: true, sparse: true });
