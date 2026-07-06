import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { CompaniesService } from './companies.service';
import { sendSuccess } from '../../utils/response';

const service = new CompaniesService();

export class CompaniesController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.list(req.user!.organizationId, req.user!.email)); } catch (e) { next(e); }
  };
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await service.create(req.user!.organizationId, req.user!.id, req.user!.role, req.body), 'Entreprise créée');
    } catch (e) { next(e); }
  };
  switchCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.switchCompany(req.user!.organizationId, req.user!.email, req.params.id), 'Entreprise active mise à jour'); } catch (e) { next(e); }
  };
}
