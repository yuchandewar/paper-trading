import mongoose, { Document, Model, Schema } from 'mongoose';
import { ProductType } from './Order';

export interface IPosition extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  product: ProductType;
  netQuantity: number; // positive = long, negative = short
  averagePrice: number;
  realizedPnL: number; // PnL from closed partial or full position
  stopLoss?: { type: string, value: number };
  target?: { type: string, value: number };
  createdAt: Date;
  updatedAt: Date;
}

const PositionSchema = new Schema<IPosition>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticker: { type: String, required: true },
    product: { type: String, enum: Object.values(ProductType), required: true },
    netQuantity: { type: Number, default: 0 },
    averagePrice: { type: Number, default: 0 },
    realizedPnL: { type: Number, default: 0 },
    stopLoss: { type: Object },
    target: { type: Object },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per user for a specific ticker and product type
PositionSchema.index({ user: 1, ticker: 1, product: 1 }, { unique: true });

// Delete model from cache to allow HMR updates to the schema
if (mongoose.models.Position) {
  delete mongoose.models.Position;
}

const Position: Model<IPosition> = mongoose.model<IPosition>('Position', PositionSchema);

export default Position;
