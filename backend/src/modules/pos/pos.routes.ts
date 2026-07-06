import { Router } from 'express';
import { PosController } from './pos.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';
import { requireModule } from '../../middleware/plan.middleware';

export const posRouter = Router();
const ctrl = new PosController();

// La caisse est incluse dès la formule Starter (module 'pos').
posRouter.use(authenticate, tenantMiddleware, subscriptionGuard, requireModule('pos'));

posRouter.get('/catalog', ctrl.catalog);
posRouter.get('/summary', ctrl.summary);
posRouter.post('/sale', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'SALES', 'CASHIER'), ctrl.sale);
