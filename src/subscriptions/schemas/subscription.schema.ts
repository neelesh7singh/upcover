import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Plan } from '../../plans/schemas/plan.schema';

export type SubscriptionDocument = Subscription &
  Document & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
}

@Schema({
  timestamps: true,
  collection: 'subscriptions',
})
export class Subscription {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Plan.name,
    required: true,
  })
  planId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    required: true,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @Prop({
    type: String,
    unique: true,
    sparse: true,
    index: true,
  })
  stripeSubscriptionId?: string;

  @Prop({
    type: String,
    index: true,
  })
  stripeCustomerId?: string;

  @Prop({
    type: Date,
    required: true,
  })
  currentPeriodStart: Date;

  @Prop({
    type: Date,
    required: true,
  })
  currentPeriodEnd: Date;

  @Prop({
    type: Date,
  })
  canceledAt?: Date;

  @Prop({
    type: Date,
  })
  trialStart?: Date;

  @Prop({
    type: Date,
  })
  trialEnd?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Create indexes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });
SubscriptionSchema.index({ stripeCustomerId: 1 });
