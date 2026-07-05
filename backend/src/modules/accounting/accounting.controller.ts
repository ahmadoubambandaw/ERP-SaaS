import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AccountingService } from './accounting.service';
import { sendSuccess, sendPaginated } from '../../utils/response';

const service = new AccountingService();

export class AccountingController {
  listAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.listAccounts(req.user!.organizationId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  createAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.createAccount(req.user!.organizationId, req.body);
      sendSuccess(res, data, 'Compte cree', 201);
    } catch (err) { next(err); }
  };

  getAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.getAccount(req.user!.organizationId, req.params.id);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  updateAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.updateAccount(req.user!.organizationId, req.params.id, req.body);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  listJournals = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.listJournals(req.user!.organizationId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  createJournal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.createJournal(req.user!.organizationId, req.body);
      sendSuccess(res, data, 'Journal cree', 201);
    } catch (err) { next(err); }
  };

  listEntries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entries, total, page, limit } = await service.listEntries(req.user!.organizationId, req.query as Record<string, string>);
      sendPaginated(res, entries, total, page, limit);
    } catch (err) { next(err); }
  };

  createEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.createEntry(req.user!.organizationId, req.body);
      sendSuccess(res, data, 'Ecriture creee', 201);
    } catch (err) { next(err); }
  };

  getEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.getEntry(req.user!.organizationId, req.params.id);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  postEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.postEntry(req.user!.organizationId, req.params.id);
      sendSuccess(res, data, 'Ecriture comptabilisee');
    } catch (err) { next(err); }
  };

  deleteEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await service.deleteEntry(req.user!.organizationId, req.params.id);
      sendSuccess(res, null, 'Ecriture supprimee');
    } catch (err) { next(err); }
  };

  trialBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.trialBalance(req.user!.organizationId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  ledger = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.ledger(req.user!.organizationId, req.params.accountCode);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  seedSyscohada = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.seedSyscohadaChart(req.user!.organizationId);
      sendSuccess(res, data, 'Plan comptable SYSCOHADA chargé');
    } catch (err) { next(err); }
  };

  balanceSheet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await service.balanceSheet(req.user!.organizationId);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };
}
