import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';

const service = new AuthService();

export class AuthController {
  register = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.register(req.body);
      sendSuccess(res, result, 'Compte cree avec succes', 201);
    } catch (err) { next(err); }
  };

  login = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.login(req.body);
      sendSuccess(res, result, 'Connexion reussie');
    } catch (err) { next(err); }
  };

  refresh = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await service.refresh(refreshToken);
      sendSuccess(res, tokens);
    } catch (err) { next(err); }
  };

  logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      await service.logout(req.user!.id, refreshToken);
      sendSuccess(res, null, 'Deconnexion reussie');
    } catch (err) { next(err); }
  };

  me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await service.getProfile(req.user!.id);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await service.changePassword(req.user!.id, currentPassword, newPassword);
      sendSuccess(res, null, 'Mot de passe modifie');
    } catch (err) { next(err); }
  };
}
