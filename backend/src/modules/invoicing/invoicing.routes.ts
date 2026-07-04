import { Router } from 'express';
import { InvoicingController } from './invoicing.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';
import { requireModule } from '../../middleware/plan.middleware';

export const invoicingRouter = Router();
const ctrl = new InvoicingController();

invoicingRouter.use(authenticate, tenantMiddleware, subscriptionGuard);

invoicingRouter.get('/customers', ctrl.listCustomers);
invoicingRouter.post('/customers', ctrl.createCustomer);
invoicingRouter.get('/customers/:id', ctrl.getCustomer);
invoicingRouter.patch('/customers/:id', ctrl.updateCustomer);

// Fournisseurs = module Achats (Professional+)
invoicingRouter.get('/suppliers', requireModule('purchasing'), ctrl.listSuppliers);
invoicingRouter.post('/suppliers', requireModule('purchasing'), ctrl.createSupplier);

invoicingRouter.get('/', ctrl.listInvoices);
invoicingRouter.post('/', authorize('ADMIN', 'ACCOUNTANT', 'SALES'), ctrl.createInvoice);
invoicingRouter.get('/:id', ctrl.getInvoice);
invoicingRouter.patch('/:id', authorize('ADMIN', 'ACCOUNTANT', 'SALES'), ctrl.updateInvoice);
invoicingRouter.patch('/:id/send', authorize('ADMIN', 'ACCOUNTANT', 'SALES'), ctrl.sendInvoice);
invoicingRouter.post('/:id/email', authorize('ADMIN', 'ACCOUNTANT', 'SALES'), ctrl.emailInvoice);
invoicingRouter.post('/:id/payments', authorize('ADMIN', 'ACCOUNTANT'), ctrl.addPayment);
invoicingRouter.delete('/:id', authorize('ADMIN', 'ACCOUNTANT'), ctrl.deleteInvoice);
