import mongoose, { Document, Schema } from 'mongoose';

interface NodeData {
  id: string;
  type: string;
  componentType?: 'hedera' | 'defi' | 'ai' | 'logic' | 'trigger' | 'output';
  state?: 'draft' | 'configured' | 'ready' | 'error';
  entityId?: string;
  position: { x: number; y: number };
  data: any;
}

interface EdgeCondition {
  type: 'immediate' | 'delay' | 'event' | 'approval';
  delayMs?: number;
  delayUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  delayValue?: number;
  eventType?: string;
  eventConfig?: any;
  approvalConfig?: {
    required: boolean;
    approvers?: string[];
    minApprovals?: number;
    message?: string;
  };
}

interface EdgeData {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  condition?: EdgeCondition;
  animated?: boolean;
  style?: any;
}

export interface IPipeline extends Document {
  userId: mongoose.Types.ObjectId;
  hederaProjectId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  nodes: NodeData[];
  edges: EdgeData[];
  isActive: boolean;
  status: 'stopped' | 'activating' | 'active' | 'executing' | 'error';
  lastActivatedAt?: Date;
  lastDeactivatedAt?: Date;
  lastExecutedAt?: Date;
  executionCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define Node schema separately to avoid casting issues
const NodeSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  componentType: {
    type: String,
    enum: ['hedera', 'defi', 'ai', 'logic', 'trigger', 'output'],
  },
  state: {
    type: String,
    enum: ['draft', 'configured', 'ready', 'error'],
  },
  entityId: String,
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  data: { type: Schema.Types.Mixed, default: {} },
}, { _id: false }); // Disable _id for subdocuments

// Define Edge schema separately
const EdgeSchema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  sourceHandle: String,
  target: { type: String, required: true },
  targetHandle: String,
  condition: {
    type: {
      type: String,
      enum: ['immediate', 'delay', 'event', 'approval'],
      default: 'immediate',
    },
    delayMs: Number,
    delayUnit: {
      type: String,
      enum: ['seconds', 'minutes', 'hours', 'days'],
    },
    delayValue: Number,
    eventType: String,
    eventConfig: Schema.Types.Mixed,
    approvalConfig: {
      required: Boolean,
      approvers: [String],
      minApprovals: Number,
      message: String,
    },
  },
  animated: Boolean,
  style: Schema.Types.Mixed,
}, { _id: false }); // Disable _id for subdocuments

const pipelineSchema = new Schema<IPipeline>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hederaProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'HederaProject',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    nodes: [NodeSchema],
    edges: [EdgeSchema],
    isActive: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['stopped', 'activating', 'active', 'executing', 'error'],
      default: 'stopped',
    },
    lastActivatedAt: {
      type: Date,
    },
    lastDeactivatedAt: {
      type: Date,
    },
    lastExecutedAt: {
      type: Date,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPipeline>('Pipeline', pipelineSchema);
