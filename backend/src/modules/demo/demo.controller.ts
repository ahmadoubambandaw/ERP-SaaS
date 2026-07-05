import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { DemoService } from './demo.service';
import { sendSuccess } from '../../utils/response';

const service = new DemoService();

export class DemoController {
  status = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.status(req.user!.organizationId)); } catch (e) { next(e); }
  };
  seed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.seed(req.user!.organizationId, req.user!.id), 'Données de démonstration chargées'); } catch (e) { next(e); }
  };
  clear = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.clear(req.user!.organizationId), 'Données de démonstration supprimées'); } catch (e) { next(e); }
  };
}
