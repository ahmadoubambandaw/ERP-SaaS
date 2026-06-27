import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { UsersService } from './users.service';
import { sendSuccess } from '../../utils/response';

const service = new UsersService();

export class UsersController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const users = await service.list(req.user!.organizationId);
      sendSuccess(res, users);
    } catch (err) { next(err); }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await service.create(req.user!.organizationId, req.body);
      sendSuccess(res, user, 'Utilisateur cree', 201);
    } catch (err) { next(err); }
  };

  getOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await service.getOne(req.user!.organizationId, req.params.id);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await service.update(req.user!.organizationId, req.params.id, req.body);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await service.remove(req.user!.organizationId, req.params.id);
      sendSuccess(res, null, 'Utilisateur supprime');
    } catch (err) { next(err); }
  };
}
