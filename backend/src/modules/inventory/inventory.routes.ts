import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const inventoryRouter = Router();
const ctrl = new InventoryController();

inventoryRouter.use(authenticate, tenantMiddleware);

inventoryRouter.get('/products', ctrl.listProducts);
inventoryRouter.post('/products', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.createProduct);
inventoryRouter.get('/products/:id', ctrl.getProduct);
inventoryRouter.patch('/products/:id', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.updateProduct);

inventoryRouter.get('/warehouses', ctrl.listWarehouses);
inventoryRouter.post('/warehouses', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.createWarehouse);

inventoryRouter.get('/stock-levels', ctrl.stockLevels);
inventoryRouter.get('/low-stock', ctrl.lowStock);

inventoryRouter.get('/movements', ctrl.listMovements);
inventoryRouter.post('/movements', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.createMovement);

inventoryRouter.get('/purchase-orders', ctrl.listPOs);
inventoryRouter.post('/purchase-orders', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.createPO);
inventoryRouter.patch('/purchase-orders/:id/confirm', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.confirmPO);
inventoryRouter.patch('/purchase-orders/:id/cancel', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.cancelPO);
inventoryRouter.patch('/purchase-orders/:id/receive', authorize('ADMIN', 'INVENTORY_MANAGER'), ctrl.receivePO);
