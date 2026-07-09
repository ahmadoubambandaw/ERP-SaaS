import { Request, Response, NextFunction } from 'express';
import { AssistantService } from './assistant.service';
import { sendSuccess } from '../../utils/response';

const service = new AssistantService();

export class AssistantController {
  chat = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.chat(req.body)); } catch (e) { next(e); }
  };
}
