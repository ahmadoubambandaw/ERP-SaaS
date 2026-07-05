import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { SubscriptionService } from './subscription.service';
import { sendSuccess } from '../../utils/response';

const service = new SubscriptionService();

export class SubscriptionController {
  getMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getMine(req.user!.organizationId)); } catch (e) { next(e); }
  };
  listOrganizations = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listOrganizations()); } catch (e) { next(e); }
  };
  platformStats = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.platformStats()); } catch (e) { next(e); }
  };
  organizationDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getOrganizationDetails(req.params.id)); } catch (e) { next(e); }
  };
  runReminders = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.runExpiryReminders(), 'Relances traitées'); } catch (e) { next(e); }
  };
  updateOrganization = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateOrganization(req.params.id, req.body), 'Abonnement mis a jour'); } catch (e) { next(e); }
  };
}
