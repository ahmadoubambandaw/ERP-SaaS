import { Router } from 'express';
import { CrmController } from './crm.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';
import { requireModule } from '../../middleware/plan.middleware';

export const crmRouter = Router();
const ctrl = new CrmController();

crmRouter.use(authenticate, tenantMiddleware, subscriptionGuard, requireModule('crm'), authorize('ADMIN', 'DIRECTOR', 'SALES', 'PROJECT_MANAGER'));

crmRouter.get('/leads', ctrl.listLeads);
crmRouter.post('/leads', ctrl.createLead);
crmRouter.get('/leads/:id', ctrl.getLead);
crmRouter.patch('/leads/:id', ctrl.updateLead);
crmRouter.patch('/leads/:id/convert', ctrl.convertLead);

crmRouter.get('/opportunities', ctrl.listOpportunities);
crmRouter.post('/opportunities', ctrl.createOpportunity);
crmRouter.get('/opportunities/:id', ctrl.getOpportunity);
crmRouter.patch('/opportunities/:id', ctrl.updateOpportunity);

crmRouter.post('/activities', ctrl.createActivity);
