import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const subscriptionRouter = Router();
const ctrl = new SubscriptionController();

subscriptionRouter.use(authenticate, tenantMiddleware);

// NOT protected by subscriptionGuard: must stay reachable when expired
subscriptionRouter.get('/', ctrl.getMine);

// Platform administration (cross-tenant)
subscriptionRouter.get('/organizations', authorize('SUPER_ADMIN'), ctrl.listOrganizations);
subscriptionRouter.patch('/organizations/:id', authorize('SUPER_ADMIN'), ctrl.updateOrganization);
