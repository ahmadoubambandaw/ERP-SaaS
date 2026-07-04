import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const billingRouter = Router();
const ctrl = new BillingController();

// Callback PayDunya : public (appelé par le serveur PayDunya)
billingRouter.post('/callback', ctrl.callback);

// Endpoints authentifiés — PAS de subscriptionGuard (doit rester joignable si expiré)
billingRouter.use(authenticate, tenantMiddleware);
billingRouter.post('/checkout', ctrl.checkout);
billingRouter.post('/verify', ctrl.verify);
