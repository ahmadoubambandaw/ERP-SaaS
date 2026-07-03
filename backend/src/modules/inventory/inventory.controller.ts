import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { InventoryService } from './inventory.service';
import { sendSuccess } from '../../utils/response';

const service = new InventoryService();

export class InventoryController {
  listProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listProducts(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createProduct(req.user!.organizationId, req.body), 'Produit cree', 201); } catch (e) { next(e); }
  };
  getProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getProduct(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateProduct(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  listWarehouses = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listWarehouses(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createWarehouse = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createWarehouse(req.user!.organizationId, req.body), 'Entrepot cree', 201); } catch (e) { next(e); }
  };
  stockLevels = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.stockLevels(req.user!.organizationId)); } catch (e) { next(e); }
  };
  lowStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.lowStock(req.user!.organizationId)); } catch (e) { next(e); }
  };
  listMovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listMovements(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createMovement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createMovement(req.user!.organizationId, req.body), 'Mouvement enregistre', 201); } catch (e) { next(e); }
  };
  listPOs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listPOs(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createPO = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createPO(req.user!.organizationId, req.body), 'Bon de commande cree', 201); } catch (e) { next(e); }
  };
  confirmPO = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.confirmPO(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  cancelPO = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.cancelPO(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  receivePO = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.receivePO(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
}
