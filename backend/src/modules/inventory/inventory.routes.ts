import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';
import { requireModule } from '../../middleware/plan.middleware';

export const inventoryRouter = Router();
const ctrl = new InventoryController();

inventoryRouter.use(authenticate, tenantMiddleware, subscriptionGuard);

inventoryRouter.get('/products', ctrl.listProducts);
inventoryRouter.get('/categories', ctrl.listCategories);
inventoryRouter.put('/categories/image', authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.setCategoryImage);
inventoryRouter.post('/products', authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.createProduct);
inventoryRouter.get('/products/:id', ctrl.getProduct);
inventoryRouter.patch('/products/:id', authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.updateProduct);

inventoryRouter.get('/warehouses', ctrl.listWarehouses);
inventoryRouter.post('/warehouses', authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.createWarehouse);

inventoryRouter.get('/stock-levels', ctrl.stockLevels);
inventoryRouter.get('/low-stock', ctrl.lowStock);

inventoryRouter.get('/movements', ctrl.listMovements);
inventoryRouter.post('/movements', authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.createMovement);

// Bons de commande = module Achats (Professional+)
inventoryRouter.get('/purchase-orders', requireModule('purchasing'), ctrl.listPOs);
inventoryRouter.post('/purchase-orders', requireModule('purchasing'), authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.createPO);
inventoryRouter.patch('/purchase-orders/:id/confirm', requireModule('purchasing'), authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.confirmPO);
inventoryRouter.patch('/purchase-orders/:id/cancel', requireModule('purchasing'), authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.cancelPO);
inventoryRouter.patch('/purchase-orders/:id/receive', requireModule('purchasing'), authorize('ADMIN', 'DIRECTOR', 'INVENTORY_MANAGER'), ctrl.receivePO);
