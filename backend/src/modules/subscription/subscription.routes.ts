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
subscriptionRouter.get('/platform-stats', authorize('SUPER_ADMIN'), ctrl.platformStats);
subscriptionRouter.post('/run-reminders', authorize('SUPER_ADMIN'), ctrl.runReminders);
subscriptionRouter.get('/organizations', authorize('SUPER_ADMIN'), ctrl.listOrganizations);
subscriptionRouter.get('/organizations/:id/details', authorize('SUPER_ADMIN'), ctrl.organizationDetails);
subscriptionRouter.patch('/organizations/:id', authorize('SUPER_ADMIN'), ctrl.updateOrganization);
