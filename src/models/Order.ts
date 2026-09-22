import mongoose, { Document, Model, Schema } from 'mongoose';

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum ProductType {
  MIS = 'MIS', // Margin Intraday Squareoff
  CNC = 'CNC', // Cash n Carry (Delivery)
}

export enum OrderStatus {
  PENDING = 'PENDING',
  EXECUTED = 'EXECUTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  ticker: string;
  type: TradeType;
  product: ProductType;
  orderType: OrderType;
  quantity: number;
  price?: number; // Target price for limit orders
  executionPrice?: number; // Actual price at which it was executed
  status: OrderStatus;
  marginBlocked: number; // Margin blocked for this order
  brokeragePaid: number; // Commission paid for this order
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticker: { type: String, required: true },
    type: { type: String, enum: Object.values(TradeType), required: true },
    product: { type: String, enum: Object.values(ProductType), required: true },
    orderType: { type: String, enum: Object.values(OrderType), required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: false },
    executionPrice: { type: Number, required: false },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
    marginBlocked: { type: Number, required: true },
    brokeragePaid: { type: Number, default: 0 },
    rejectReason: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
