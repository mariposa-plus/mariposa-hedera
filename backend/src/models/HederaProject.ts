import mongoose, { Document, Schema } from 'mongoose';

export interface IHederaProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  workspacePath: string;
  hederaNetwork: 'mainnet' | 'testnet';
  status: 'created' | 'ready' | 'deploying' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hederaProjectSchema = new Schema<IHederaProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    workspacePath: { type: String, required: true },
    hederaNetwork: { type: String, enum: ['mainnet', 'testnet'], default: 'testnet' },
    status: { type: String, enum: ['created', 'ready', 'deploying', 'error'], default: 'created' },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IHederaProject>('HederaProject', hederaProjectSchema);
