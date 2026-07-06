import 'dotenv/config';
import app from './app';
import { config } from './config';
import { startSchedulers } from './utils/scheduler';
import { ensureSchema } from './utils/ensureSchema';

const PORT = config.port;

async function bootstrap() {
  // Applique les migrations légères avant d'accepter du trafic
  await ensureSchema();

  app.listen(PORT, () => {
    console.log(`\n🚀 ERP SaaS API démarrée sur http://localhost:${PORT}`);
    console.log(`📊 Environnement : ${config.nodeEnv}`);
    console.log(`📡 API : http://localhost:${PORT}/api/v1\n`);
    startSchedulers();
  });
}

bootstrap().catch((e) => {
  console.error('Échec du démarrage:', e);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
