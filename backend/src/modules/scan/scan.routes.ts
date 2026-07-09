import { Router } from 'express';
import { ScanController } from './scan.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { subscriptionGuard } from '../../middleware/subscription.middleware';

export const scanRouter = Router();
const ctrl = new ScanController();

// Lecture IA de photo de cahier — pour tous les modules d'import.
scanRouter.use(authenticate, tenantMiddleware, subscriptionGuard);
scanRouter.post('/table', ctrl.extract);
