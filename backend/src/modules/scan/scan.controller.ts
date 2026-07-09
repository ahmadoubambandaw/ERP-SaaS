import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ScanService } from './scan.service';
import { sendSuccess } from '../../utils/response';

const service = new ScanService();

export class ScanController {
  extract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.extractTable(req.body)); } catch (e) { next(e); }
  };
}
