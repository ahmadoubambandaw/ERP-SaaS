import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorMiddleware } from './middleware/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { accountingRouter } from './modules/accounting/accounting.routes';
import { invoicingRouter } from './modules/invoicing/invoicing.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { hrRouter } from './modules/hr/hr.routes';
import { crmRouter } from './modules/crm/crm.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(compression() as express.RequestHandler);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
});
app.use('/api', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

const api = '/api/v1';
app.use(`${api}/auth`, authRouter);
app.use(`${api}/users`, usersRouter);
app.use(`${api}/accounting`, accountingRouter);
app.use(`${api}/invoicing`, invoicingRouter);
app.use(`${api}/inventory`, inventoryRouter);
app.use(`${api}/hr`, hrRouter);
app.use(`${api}/crm`, crmRouter);
app.use(`${api}/projects`, projectsRouter);
app.use(`${api}/dashboard`, dashboardRouter);

app.use(errorMiddleware);

export default app;
