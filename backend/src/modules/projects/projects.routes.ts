import { Router } from 'express';
import { ProjectsController } from './projects.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';
import { requireModule } from '../../middleware/plan.middleware';

export const projectsRouter = Router();
const ctrl = new ProjectsController();

projectsRouter.use(authenticate, tenantMiddleware, subscriptionGuard, requireModule('projects'));

projectsRouter.get('/', ctrl.listProjects);
projectsRouter.post('/', ctrl.createProject);
projectsRouter.get('/:id', ctrl.getProject);
projectsRouter.patch('/:id', ctrl.updateProject);

projectsRouter.get('/:projectId/tasks', ctrl.listTasks);
projectsRouter.post('/:projectId/tasks', ctrl.createTask);
projectsRouter.patch('/:projectId/tasks/:id', ctrl.updateTask);

projectsRouter.get('/:projectId/milestones', ctrl.listMilestones);
projectsRouter.post('/:projectId/milestones', ctrl.createMilestone);
