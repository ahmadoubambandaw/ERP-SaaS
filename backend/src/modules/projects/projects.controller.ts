import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ProjectsService } from './projects.service';
import { sendSuccess } from '../../utils/response';

const service = new ProjectsService();

export class ProjectsController {
  listProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listProjects(req.user!.organizationId)); } catch (e) { next(e); }
  };
  createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createProject(req.user!.organizationId, req.body), 'Projet cree', 201); } catch (e) { next(e); }
  };
  getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.getProject(req.user!.organizationId, req.params.id)); } catch (e) { next(e); }
  };
  updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateProject(req.user!.organizationId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  listTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listTasks(req.user!.organizationId, req.params.projectId)); } catch (e) { next(e); }
  };
  createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createTask(req.user!.organizationId, req.params.projectId, req.body), 'Tache creee', 201); } catch (e) { next(e); }
  };
  updateTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.updateTask(req.user!.organizationId, req.params.projectId, req.params.id, req.body)); } catch (e) { next(e); }
  };
  listMilestones = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.listMilestones(req.user!.organizationId, req.params.projectId)); } catch (e) { next(e); }
  };
  createMilestone = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await service.createMilestone(req.user!.organizationId, req.params.projectId, req.body), 'Jalon cree', 201); } catch (e) { next(e); }
  };
}
