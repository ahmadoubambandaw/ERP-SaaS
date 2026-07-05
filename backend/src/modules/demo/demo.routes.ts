import { Router } from 'express';
import { DemoController } from './demo.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const demoRouter = Router();
const ctrl = new DemoController();

// Réservé au propriétaire de la plateforme (fonctionnalité de test uniquement).
// Pas de subscriptionGuard : utilisable pendant l'essai gratuit.
demoRouter.use(authenticate, tenantMiddleware, authorize('SUPER_ADMIN'));

demoRouter.get('/', ctrl.status);
demoRouter.post('/seed', ctrl.seed);
demoRouter.delete('/clear', ctrl.clear);
