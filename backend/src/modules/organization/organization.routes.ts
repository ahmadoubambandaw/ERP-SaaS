import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const organizationRouter = Router();
const ctrl = new OrganizationController();

organizationRouter.use(authenticate, tenantMiddleware);

organizationRouter.get('/', ctrl.get);
organizationRouter.patch('/', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.update);
