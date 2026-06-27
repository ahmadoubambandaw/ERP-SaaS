import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';

const service = new DashboardService();

export class DashboardController {
  kpis = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.kpis(req.user!.organizationId)); } catch (e) { next(e); }
  };
  revenueChart = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.revenueChart(req.user!.organizationId)); } catch (e) { next(e); }
  };
  recentInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.recentInvoices(req.user!.organizationId)); } catch (e) { next(e); }
  };
  recentActivities = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.recentActivities(req.user!.organizationId)); } catch (e) { next(e); }
  };
}
