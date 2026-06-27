import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { CrmService } from './crm.service';
import { sendSuccess } from '../../utils/response';

const service = new CrmService();

export class CrmController {
  listLeads = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listLeads(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createLead(req.user!.organizationId, req.body), 'Prospect cree', 201); } catch (e) { next(e); }
  };
  getLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getLead(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateLead(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  convertLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.convertLead(req.user!.organizationId, req.params.id), 'Prospect converti en client'); } catch (e) { next(e); }
  };
  listOpportunities = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listOpportunities(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createOpportunity(req.user!.organizationId, req.body), 'Opportunite creee', 201); } catch (e) { next(e); }
  };
  getOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getOpportunity(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateOpportunity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateOpportunity(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  createActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createActivity(req.body), 'Activite creee', 201); } catch (e) { next(e); }
  };
}
