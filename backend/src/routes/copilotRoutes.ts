import { Router } from 'express';
import { protect } from '../middleware/auth';
import { chat } from '../controllers/copilotController';

const router = Router();

// All copilot routes require authentication
router.use(protect);

// POST /api/copilot/chat
router.post('/chat', chat);

export default router;
