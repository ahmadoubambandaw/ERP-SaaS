import { Router } from 'express';
import { HrController } from './hr.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';
import { requireModule } from '../../middleware/plan.middleware';

export const hrRouter = Router();
const ctrl = new HrController();

hrRouter.use(authenticate, tenantMiddleware, subscriptionGuard, requireModule('hr'), authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'));

hrRouter.get('/employees', ctrl.listEmployees);
hrRouter.post('/employees', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.createEmployee);
hrRouter.get('/employees/:id', ctrl.getEmployee);
hrRouter.patch('/employees/:id', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.updateEmployee);

hrRouter.get('/payslips', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.listPayslips);
hrRouter.post('/payslips/generate', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.generatePayslips);
hrRouter.patch('/payslips/:id/approve', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.approvePayslip);

hrRouter.get('/leaves', ctrl.listLeaves);
hrRouter.post('/leaves', ctrl.createLeave);
hrRouter.patch('/leaves/:id/approve', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.approveLeave);
hrRouter.patch('/leaves/:id/reject', authorize('ADMIN', 'DIRECTOR', 'HR_MANAGER'), ctrl.rejectLeave);
