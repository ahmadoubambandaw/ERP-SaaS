import cron from 'node-cron';
import { SubscriptionService } from '../modules/subscription/subscription.service';

// Planifie les tâches récurrentes (relances d'abonnement).
export function startSchedulers(): void {
  const subscriptionService = new SubscriptionService();

  // Tous les jours à 08:00 (heure du serveur) : relances J-3 et J-1
  cron.schedule('0 8 * * *', async () => {
    try {
      const result = await subscriptionService.runExpiryReminders();
      if (result.sent > 0) {
        console.log(`📧 Relances d'abonnement envoyées : ${result.sent}`);
      }
    } catch (e) {
      console.error('Scheduler runExpiryReminders error:', e);
    }
  });

  console.log('⏰ Planificateur démarré (relances quotidiennes 08:00)');
}
