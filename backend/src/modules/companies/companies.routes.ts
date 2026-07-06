import { Router } from 'express';
import { CompaniesController } from './companies.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const companiesRouter = Router();
const ctrl = new CompaniesController();

// Gestion multi-entreprises : réservée aux administrateurs / directeurs / fondateur.
// Pas de subscriptionGuard sur le switch pour pouvoir naviguer même en essai.
companiesRouter.use(authenticate, tenantMiddleware);

companiesRouter.get('/', ctrl.list);
companiesRouter.post('/', authorize('ADMIN', 'DIRECTOR'), ctrl.create);
companiesRouter.post('/:id/switch', ctrl.switchCompany);
