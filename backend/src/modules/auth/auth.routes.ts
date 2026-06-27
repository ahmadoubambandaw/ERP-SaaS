import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

export const authRouter = Router();
const ctrl = new AuthController();

authRouter.post('/register', ctrl.register);
authRouter.post('/login', ctrl.login);
authRouter.post('/refresh', ctrl.refresh);
authRouter.post('/logout', authenticate, ctrl.logout);
authRouter.get('/me', authenticate, ctrl.me);
authRouter.patch('/me/password', authenticate, ctrl.changePassword);
