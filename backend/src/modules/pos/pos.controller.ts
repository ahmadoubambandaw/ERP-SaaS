import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { PosService } from './pos.service';
import { sendSuccess } from '../../utils/response';

const service = new PosService();

export class PosController {
  catalog = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.catalog(req.user!.organizationId)); } catch (e) { next(e); }
  };
  sale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.sale(req.user!.organizationId, req.user!.id, req.body), 'Vente enregistrée'); } catch (e) { next(e); }
  };
  summary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.todaySummary(req.user!.organizationId)); } catch (e) { next(e); }
  };
}
