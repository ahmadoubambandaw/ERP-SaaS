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
import { organizationRouter } from './modules/organization/organization.routes';
import { subscriptionRouter } from './modules/subscription/subscription.routes';
import { billingRouter } from './modules/billing/billing.routes';
import { demoRouter } from './modules/demo/demo.routes';
import { posRouter } from './modules/pos/pos.routes';
import { companiesRouter } from './modules/companies/companies.routes';
import { prisma } from './utils/prisma';

const app = express();

// Derrière le proxy Railway : nécessaire pour que req.ip (et donc les limites
// par IP) corresponde au client réel et non au proxy.
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

// Uniquement les déploiements Vercel DU projet (production + previews),
// pas n'importe quel site *.vercel.app.
const VERCEL_PROJECT_RE = /^https:\/\/erp-saa-s[a-z0-9.-]*\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (VERCEL_PROJECT_RE.test(origin)) return callback(null, true);
    if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000') return callback(null, true);
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

// Anti force-brute : seules les tentatives de connexion ÉCHOUÉES comptent,
// les utilisateurs légitimes derrière une même IP ne sont donc pas bloqués.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de créations de compte depuis cette adresse. Réessayez plus tard.' },
});
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/register', registerLimiter);

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
app.use(`${api}/organization`, organizationRouter);
app.use(`${api}/subscription`, subscriptionRouter);
app.use(`${api}/billing`, billingRouter);
app.use(`${api}/demo`, demoRouter);
app.use(`${api}/pos`, posRouter);
app.use(`${api}/companies`, companiesRouter);

app.use(errorMiddleware);

export default app;
