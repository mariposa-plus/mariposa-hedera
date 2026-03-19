import mongoose, { Document, Schema } from 'mongoose';

export type DeployStatus = 'pending' | 'installing' | 'registering' | 'starting' | 'running' | 'stopped' | 'failed';
export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface IDeployStep {
  name: 'install' | 'register-agent' | 'start';
  status: StepStatus;
  command: string;
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
}

export interface IDeployment extends Document {
  projectId: mongoose.Types.ObjectId;
  workflowId: mongoose.Types.ObjectId;
  pipelineId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  status: DeployStatus;
  steps: IDeployStep[];
  logs: string[];
  pid?: number;
  projectDir: string;

  hcs10Enabled: boolean;
  mcpEnabled: boolean;

  startedAt?: Date;
  finishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const deployStepSchema = new Schema({
  name: { type: String, enum: ['install', 'register-agent', 'start'], required: true },
  status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'], default: 'pending' },
  command: { type: String, required: true },
  startedAt: Date,
  finishedAt: Date,
  exitCode: Number,
}, { _id: false });

const deploymentSchema = new Schema<IDeployment>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'HederaProject', required: true },
    workflowId: { type: Schema.Types.ObjectId, ref: 'HederaWorkflow', required: true },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'installing', 'registering', 'starting', 'running', 'stopped', 'failed'],
      default: 'pending',
      index: true,
    },
    steps: [deployStepSchema],
    logs: { type: [String], default: [] },
    pid: Number,
    projectDir: { type: String, required: true },

    hcs10Enabled: { type: Boolean, default: false },
    mcpEnabled: { type: Boolean, default: false },

    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

deploymentSchema.index({ pipelineId: 1, createdAt: -1 });

export default mongoose.model<IDeployment>('Deployment', deploymentSchema);
