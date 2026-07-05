import { Router } from 'express';
import { DemoController } from './demo.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const demoRouter = Router();
const ctrl = new DemoController();

// Pas de subscriptionGuard : utilisable pendant l'essai gratuit
demoRouter.use(authenticate, tenantMiddleware);

demoRouter.get('/', ctrl.status);
demoRouter.post('/seed', authorize('ADMIN'), ctrl.seed);
demoRouter.delete('/clear', authorize('ADMIN'), ctrl.clear);
