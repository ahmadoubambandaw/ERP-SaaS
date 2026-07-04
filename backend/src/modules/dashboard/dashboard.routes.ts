import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';

export const dashboardRouter = Router();
const ctrl = new DashboardController();

dashboardRouter.use(authenticate, tenantMiddleware, subscriptionGuard);

dashboardRouter.get('/kpis', ctrl.kpis);
dashboardRouter.get('/revenue-chart', ctrl.revenueChart);
dashboardRouter.get('/recent-invoices', ctrl.recentInvoices);
dashboardRouter.get('/recent-activities', ctrl.recentActivities);
dashboardRouter.get('/search', ctrl.search);
dashboardRouter.get('/alerts', ctrl.alerts);
