import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  balance: number;
  watchlist: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
    },
    balance: {
      type: Number,
      default: 1000000, // 10 Lakh INR default virtual cash
    },
    watchlist: {
      type: [String],
      default: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
