import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { OrganizationService } from './organization.service';
import { sendSuccess } from '../../utils/response';

const service = new OrganizationService();

export class OrganizationController {
  get = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.get(req.user!.organizationId)); } catch (e) { next(e); }
  };
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.update(req.user!.organizationId, req.body), 'Organisation mise a jour'); } catch (e) { next(e); }
  };
}
