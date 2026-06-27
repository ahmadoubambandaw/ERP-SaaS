import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { HrService } from './hr.service';
import { sendSuccess } from '../../utils/response';

const service = new HrService();

export class HrController {
  listEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listEmployees(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createEmployee(req.user!.organizationId, req.body), 'Employe cree', 201); } catch (e) { next(e); }
  };
  getEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getEmployee(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateEmployee(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  listPayslips = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listPayslips(req.user!.organizationId, req.query.period as string)); } catch (e) { next(e); }
  };
  generatePayslips = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.generatePayslips(req.user!.organizationId, req.body.period), 'Bulletins generes'); } catch (e) { next(e); }
  };
  approvePayslip = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.approvePayslip(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  listLeaves = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listLeaves(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createLeave(req.user!.organizationId, req.body), 'Demande creee', 201); } catch (e) { next(e); }
  };
  approveLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.approveLeave(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  rejectLeave = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.rejectLeave(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
}
