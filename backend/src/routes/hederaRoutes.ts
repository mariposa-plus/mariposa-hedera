import express from 'express';
import { protect } from '../middleware/auth';
import {
  createProject,
  listProjects,
  getProject,
  deleteProject,
  initProject,
  updateProjectConfig,
  generateWorkflow,
  generateWithDeploy,
  getWorkflowCode,
} from '../controllers/hederaController';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/projects', createProject);
router.get('/projects', listProjects);
router.get('/projects/:id', getProject);
router.delete('/projects/:id', deleteProject);
router.post('/projects/:id/init', initProject);
router.put('/projects/:id/config', updateProjectConfig);
router.post('/workflows/generate', generateWorkflow);
router.post('/workflows/generate-deploy', generateWithDeploy);
router.get('/workflows/:id/code', getWorkflowCode);

export default router;
