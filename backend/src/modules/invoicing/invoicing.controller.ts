import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { InvoicingService } from './invoicing.service';
import { sendSuccess, sendPaginated } from '../../utils/response';

const service = new InvoicingService();

export class InvoicingController {
  listCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listCustomers(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createCustomer(req.user!.organizationId, req.body), 'Client cree', 201); } catch (e) { next(e); }
  };
  getCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getCustomer(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateCustomer(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  listSuppliers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listSuppliers(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createSupplier(req.user!.organizationId, req.body), 'Fournisseur cree', 201); } catch (e) { next(e); }
  };
  listInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { invoices, total, page, limit } = await service.listInvoices(req.user!.organizationId, req.query as Record<string, string>);
      sendPaginated(res, invoices, total, page, limit);
    } catch (e) { next(e); }
  };
  createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createInvoice(req.user!.organizationId, req.user!.id, req.body), 'Facture creee', 201); } catch (e) { next(e); }
  };
  getInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getInvoice(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateInvoice(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  sendInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.sendInvoice(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  addPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.addPayment(req.user!.organizationId, req.params.id, req.body), 'Paiement enregistre', 201); } catch (e) { next(e); }
  };
  deleteInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { await service.deleteInvoice(req.user!.organizationId, req.params.id); sendSuccess(res, null, 'Facture supprimee'); } catch (e) { next(e); }
  };
}
