// ─── SMS.to sender ──────────────────────────────────────────────────────────

export async function sendSms(toPhone: string, body: string): Promise<void> {
  const apiKey = process.env.SMSTO_API_KEY;
  const senderId = process.env.SMSTO_SENDER_ID; // optional, falls back to SMS.to default

  if (!apiKey) {
    throw new Error('SMSTO_NOT_CONFIGURED');
  }

  const res = await fetch('https://api.sms.to/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: toPhone,
      message: body,
      ...(senderId && { sender_id: senderId }),
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    throw new Error(`SMSTO_SEND_FAILED: ${JSON.stringify(data) ?? res.statusText}`);
  }
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
