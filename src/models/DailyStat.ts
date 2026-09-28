import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDailyStat extends Document {
  user: mongoose.Types.ObjectId;
  dateString: string; // "YYYY-MM-DD"
  startOfDayEquity: number; 
  endOfDayEquity: number; 
  marginUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyStatSchema = new Schema<IDailyStat>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateString: { type: String, required: true },
    startOfDayEquity: { type: Number, required: true },
    endOfDayEquity: { type: Number, required: true },
    marginUsed: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

DailyStatSchema.index({ user: 1, dateString: 1 }, { unique: true });

if (mongoose.models.DailyStat) {
  delete mongoose.models.DailyStat;
}

const DailyStat: Model<IDailyStat> = mongoose.model<IDailyStat>('DailyStat', DailyStatSchema);

export default DailyStat;
