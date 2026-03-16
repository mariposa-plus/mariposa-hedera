import mongoose, { Document, Schema } from 'mongoose';

export interface IHederaWorkflow extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pipelineId: mongoose.Types.ObjectId;
  generatedCode?: string;
  generatedAt?: Date;
  status: 'pending' | 'generated' | 'valid' | 'invalid';
  validationErrors?: string[];
  deployConfig?: {
    hcs10Enabled: boolean;
    mcpEnabled: boolean;
    network: string;
    agentName: string;
  };
  generatedFiles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const hederaWorkflowSchema = new Schema<IHederaWorkflow>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'HederaProject', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline', required: true },
    generatedCode: { type: String },
    generatedAt: { type: Date },
    status: { type: String, enum: ['pending', 'generated', 'valid', 'invalid'], default: 'pending' },
    validationErrors: [{ type: String }],
    deployConfig: {
      hcs10Enabled: { type: Boolean },
      mcpEnabled: { type: Boolean },
      network: { type: String },
      agentName: { type: String },
    },
    generatedFiles: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IHederaWorkflow>('HederaWorkflow', hederaWorkflowSchema);
