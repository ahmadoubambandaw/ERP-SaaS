import { Router } from 'express';
import { AccountingController } from './accounting.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';

export const accountingRouter = Router();
const ctrl = new AccountingController();

accountingRouter.use(authenticate, tenantMiddleware, subscriptionGuard, authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'));

accountingRouter.get('/accounts', ctrl.listAccounts);
accountingRouter.post('/accounts', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.createAccount);
accountingRouter.post('/accounts/seed-syscohada', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.seedSyscohada);
accountingRouter.get('/accounts/:id', ctrl.getAccount);
accountingRouter.patch('/accounts/:id', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.updateAccount);

accountingRouter.get('/journals', ctrl.listJournals);
accountingRouter.post('/journals', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.createJournal);

accountingRouter.get('/entries', ctrl.listEntries);
accountingRouter.post('/entries', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.createEntry);
accountingRouter.get('/entries/:id', ctrl.getEntry);
accountingRouter.patch('/entries/:id/post', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.postEntry);
accountingRouter.delete('/entries/:id', authorize('ADMIN', 'DIRECTOR', 'ACCOUNTANT'), ctrl.deleteEntry);

accountingRouter.get('/reports/trial-balance', ctrl.trialBalance);
accountingRouter.get('/reports/balance-sheet', ctrl.balanceSheet);
accountingRouter.get('/reports/ledger/:accountCode', ctrl.ledger);
