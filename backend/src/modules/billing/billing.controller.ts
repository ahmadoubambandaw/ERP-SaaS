import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { BillingService } from './billing.service';
import { sendSuccess } from '../../utils/response';

const service = new BillingService();

export class BillingController {
  checkout = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createCheckout(req.user!.organizationId)); } catch (e) { next(e); }
  };
  verify = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.verify(req.user!.organizationId)); } catch (e) { next(e); }
  };
  // Public IPN — répond toujours 200 pour PayDunya
  callback = async (req: Request, res: Response) => {
    try { await service.handleCallback(req.body); } catch (e) { console.error(e); }
    res.status(200).json({ received: true });
  };
}
