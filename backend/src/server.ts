// Load env vars FIRST - before any imports that use process.env
import dotenv from 'dotenv';
import path from 'path';
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Now import everything else
import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import itemRoutes from './routes/itemRoutes';
import pipelineRoutes from './routes/pipelineRoutes';
import executionRoutes from './routes/executionRoutes';
import testExecutionRoutes from './routes/testExecutionRoutes';
import creRoutes from './routes/creRoutes';
import copilotRoutes from './routes/copilotRoutes';
import { errorHandler } from './middleware/errorHandler';
import { verifyEmailConnection } from './services/email.service';
import { checkRedisConnection } from './queues/config';
import { schedulerService } from './services/scheduler.service';
import { wsService } from './services/websocket.service';

// Connect to database
connectDB();

// Verify email service connection
verifyEmailConnection().catch((error) => {
  console.error('Warning: Email service initialization failed:', error.message);
  console.log('The application will continue, but OTP emails may not work correctly.');
});

const app: Application = express();

// CORS configuration - Allow all origins
app.use(cors());

// Body parser middleware with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/executions', testExecutionRoutes); // Test execution routes
app.use('/api/cre', creRoutes);
app.use('/api/copilot', copilotRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// Error handler middleware (should be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io support
const httpServer = http.createServer(app);

// Initialize WebSocket service
wsService.init(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log('WebSocket server attached');

  // Check Redis connection
  const redisConnected = await checkRedisConnection();
  if (redisConnected) {
    console.log('Redis connection successful');

    // Start workers
    console.log('Starting execution workers...');
    require('./workers/executionWorker');
    require('./workers/delayWorker');

    // Start scheduler service
    schedulerService.start();

    console.log('All workers and services started');
  } else {
    console.warn('Redis connection failed - workers will not start');
    console.warn('Pipeline executions and delayed tasks will not work');
  }
});
