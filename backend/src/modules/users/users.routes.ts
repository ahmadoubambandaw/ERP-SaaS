import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

export const usersRouter = Router();
const ctrl = new UsersController();

usersRouter.use(authenticate, tenantMiddleware);

usersRouter.get('/', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.list);
usersRouter.post('/', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.create);
usersRouter.get('/:id', ctrl.getOne);
usersRouter.patch('/:id', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.update);
usersRouter.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), ctrl.remove);
