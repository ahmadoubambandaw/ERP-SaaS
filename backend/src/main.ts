import 'dotenv/config';
import app from './app';
import { config } from './config';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`\n🚀 ERP SaaS API démarrée sur http://localhost:${PORT}`);
  console.log(`📊 Environnement : ${config.nodeEnv}`);
  console.log(`📡 API : http://localhost:${PORT}/api/v1\n`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
