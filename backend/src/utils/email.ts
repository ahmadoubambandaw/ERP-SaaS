// Envoi d'emails transactionnels via Brevo (partagé par les modules).

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  senderName?: string;
  replyTo?: { email: string; name?: string };
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

/** Envoie un email via Brevo. Retourne true si l'envoi a réussi. */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  if (!apiKey || !fromEmail) {
    console.warn('sendEmail: Brevo non configuré (BREVO_API_KEY / EMAIL_FROM manquants)');
    return false;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: params.senderName || 'Naatal', email: fromEmail },
      to: [{ email: params.to }],
      replyTo: params.replyTo,
      subject: params.subject,
      htmlContent: params.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Brevo error:', res.status, detail);
    return false;
  }
  return true;
}

/** Gabarit HTML aux couleurs Naatal, réutilisable pour les emails système. */
export function naatalEmailShell(bodyHtml: string, footer = ''): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);border-radius:12px 12px 0 0;padding:22px 24px">
      <h2 style="margin:0;font-size:20px;color:#fff;letter-spacing:0.5px">Naatal</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#dbeafe">Faites prospérer votre activité</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      ${bodyHtml}
      ${footer ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/><p style="color:#9ca3af;font-size:12px">${footer}</p>` : ''}
    </div>
  </div>`;
}
