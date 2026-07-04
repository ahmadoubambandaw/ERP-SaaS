import { Router } from 'express';
import { HrController } from './hr.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';

export const hrRouter = Router();
const ctrl = new HrController();

hrRouter.use(authenticate, tenantMiddleware, subscriptionGuard);

hrRouter.get('/employees', ctrl.listEmployees);
hrRouter.post('/employees', authorize('ADMIN', 'HR_MANAGER'), ctrl.createEmployee);
hrRouter.get('/employees/:id', ctrl.getEmployee);
hrRouter.patch('/employees/:id', authorize('ADMIN', 'HR_MANAGER'), ctrl.updateEmployee);

hrRouter.get('/payslips', authorize('ADMIN', 'HR_MANAGER'), ctrl.listPayslips);
hrRouter.post('/payslips/generate', authorize('ADMIN', 'HR_MANAGER'), ctrl.generatePayslips);
hrRouter.patch('/payslips/:id/approve', authorize('ADMIN', 'HR_MANAGER'), ctrl.approvePayslip);

hrRouter.get('/leaves', ctrl.listLeaves);
hrRouter.post('/leaves', ctrl.createLeave);
hrRouter.patch('/leaves/:id/approve', authorize('ADMIN', 'HR_MANAGER'), ctrl.approveLeave);
hrRouter.patch('/leaves/:id/reject', authorize('ADMIN', 'HR_MANAGER'), ctrl.rejectLeave);
