import mongoose, { Document, Model, Schema } from 'mongoose';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  BROKERAGE = 'BROKERAGE',
  TRADE_PROFIT = 'TRADE_PROFIT',
  TRADE_LOSS = 'TRADE_LOSS',
}

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number; // Always positive, type defines addition or subtraction
  description: string;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    balanceAfter: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
