import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { OrderActions } from './OrderActions';

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', submitted: '#60a5fa', pending_review: '#fbbf24',
  awaiting_payment: '#f59e0b', payment_received: '#a3e635', awaiting_crypto: '#22d3ee',
  payout_in_progress: '#a78bfa', completed: '#34d399',
  rejected: '#f87171', cancelled: '#475569', on_hold: '#fb923c',
};
const STATUS_BG: Record<string, string> = {
  draft: 'rgba(100,116,139,0.1)', submitted: 'rgba(96,165,250,0.1)', pending_review: 'rgba(251,191,36,0.1)',
  awaiting_payment: 'rgba(245,158,11,0.1)', payment_received: 'rgba(163,230,53,0.1)',
  awaiting_crypto: 'rgba(34,211,238,0.1)', payout_in_progress: 'rgba(167,139,250,0.1)',
  completed: 'rgba(52,211,153,0.1)', rejected: 'rgba(248,113,113,0.1)',
  cancelled: 'rgba(71,85,105,0.1)', on_hold: 'rgba(251,146,60,0.1)',
};

const PAYMENT_INSTRUCTIONS = {
  BIT: { he: 'שלם דרך אפליקציית ביט. לאחר שולח, צור קשר עם הצוות שלנו לאישור.', ru: 'Оплатите через приложение Bit. После отправки свяжитесь с командой.' },
  PAYBOX: { he: 'תשלום בכרטיס אשראי דרך PayBox. תקבל קישור לתשלום בקרוב. לאחר התשלום המתן לאישור הצוות.', ru: 'Оплата картой через PayBox. Скоро получите ссылку для оплаты. После оплаты ожидайте подтверждения.' },
  CRYPTO_ONLY: { he: 'שלח את הקריפטו לכתובת הארנק של החברה. המתן לאישור הצוות.', ru: 'Отправьте криптовалюту на адрес кошелька компании.' },
};

const COMPLIANCE_ERRORS: Record<string, Record<string, string>> = {
  kyc_not_approved:                    { he: 'הזהות שלך טרם אומתה — נא להשלים את תהליך KYC', ru: 'Личность не верифицирована — пройдите процесс KYC' },
  sanctions_check_required:            { he: 'נדרשת בדיקת ציות — צור קשר עם התמיכה', ru: 'Требуется проверка санкций — обратитесь в поддержку' },
  business_integration_not_configured: { he: 'השירות אינו זמין כרגע — נסה שוב מאוחר יותר', ru: 'Сервис временно недоступен — попробуйте позже' },
  kyc_level_insufficient:              { he: 'רמת האימות אינה מספקת לסכום זה', ru: 'Уровень верификации недостаточен для этой суммы' },
  payment_provider_unavailable:        { he: 'ספק התשלום אינו זמין כרגע — נסה אמצעי תשלום אחר', ru: 'Платёжный провайдер недоступен — попробуйте другой способ' },
  payment_method_disabled_by_admin:    { he: 'אמצעי התשלום הזה אינו זמין כרגע', ru: 'Этот способ оплаты сейчас недоступен' },
  kyc_pending_review:                  { he: 'הבקשה שלך נמצאת בבדיקה — המתן לאישור', ru: 'Ваша заявка на проверке — ожидайте подтверждения' },
};

function parseRejectionReason(reason: string | null, locale: string): { codes: string[]; raw: string | null } {
  if (!reason) return { codes: [], raw: null };
  const knownCodes = Object.keys(COMPLIANCE_ERRORS);
  const found = knownCodes.filter(code => reason.includes(code));
  return { codes: found, raw: found.length === 0 ? reason : null };
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '22px 24px',
};

export default async function OrderDetailPage({ params }: { params: { locale: string; id: string } }) {
  const { locale, id } = params;
  const session = await getSession();
  if (!session) return null;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.sub },
    include: { wallet: true, paymentRecords: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) notFound();

  const isRtl = locale === 'he';

  const statusFlow = ['draft', 'pending_review', 'awaiting_payment', 'payment_received', 'awaiting_crypto', 'completed'];
  const currentIdx = statusFlow.indexOf(order.status);

  const statusLabels: Record<string, Record<string, string>> = {
    he: { draft: 'טיוטה', pending_review: 'בבדיקה', awaiting_payment: 'ממתין לתשלום', payment_received: 'תשלום התקבל', awaiting_crypto: 'ממתין לקריפטו', completed: 'הושלם' },
    ru: { draft: 'Черновик', pending_review: 'На проверке', awaiting_payment: 'Ожидает оплаты', payment_received: 'Оплата получена', awaiting_crypto: 'Ожидает крипто', completed: 'Завершено' },
  };
  const sl = statusLabels[locale] ?? statusLabels.he;
  const paymentInstr = PAYMENT_INSTRUCTIONS[order.paymentMethodRequested as keyof typeof PAYMENT_INSTRUCTIONS];

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 720, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      {/* Back link */}
      <Link href={`/${locale}/orders`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#64748b', fontSize: 13, fontWeight: 600, marginBottom: 20,
        flexDirection: isRtl ? 'row-reverse' : 'row',
      }}>
        <span>{isRtl ? '→' : '←'}</span>
        <span>{locale === 'he' ? 'חזרה להזמנות' : 'Назад к заявкам'}</span>
      </Link>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 24,
      }}>
        <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
            <span style={{ color: order.type === 'buy' ? '#34d399' : '#f87171' }}>
              {order.type === 'buy' ? (locale === 'he' ? 'קנייה' : 'Покупка') : (locale === 'he' ? 'מכירה' : 'Продажа')}
            </span>{' '}{order.asset}
          </h1>
          <p style={{ color: '#475569', fontSize: 12, margin: '6px 0 0', fontFamily: 'monospace' }}>
            #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span style={{
          padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, flexShrink: 0,
          background: STATUS_BG[order.status] ?? 'rgba(100,116,139,0.1)',
          color: STATUS_COLORS[order.status] ?? '#64748b',
          border: `1px solid ${STATUS_COLORS[order.status] ?? '#475569'}30`,
        }}>
          {sl[order.status] ?? order.status}
        </span>
      </div>

      {/* Progress stepper */}
      {!['rejected', 'cancelled', 'on_hold', 'expired'].includes(order.status) && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute', top: 14, left: 14, right: 14, height: 2,
              background: 'rgba(255,255,255,0.08)', zIndex: 0,
            }} />
            {currentIdx > 0 && (
              <div style={{
                position: 'absolute', top: 14, left: 14, height: 2, zIndex: 1,
                width: `${Math.max(0, (currentIdx / (statusFlow.length - 1)) * 100)}%`,
                background: '#34d399',
              }} />
            )}
            {statusFlow.map((s, idx) => {
              const done = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, zIndex: 2 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    background: done ? '#34d399' : active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                    color: done || active ? 'white' : '#475569',
                    border: done || active ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                    boxShadow: active ? '0 0 12px rgba(59,130,246,0.4)' : 'none',
                  }}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 500, textAlign: 'center', maxWidth: 70,
                    color: done ? '#34d399' : active ? '#93c5fd' : '#475569',
                    lineHeight: 1.3,
                  }}>
                    {sl[s] ?? s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rejection notice */}
      {order.status === 'rejected' && (() => {
        const { codes, raw } = parseRejectionReason(order.rejectionReason, locale);
        const loc = locale as 'he' | 'ru';
        return (
          <div style={{
            ...card, marginBottom: 20,
            background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
          }}>
            <h3 style={{ color: '#f87171', fontWeight: 700, fontSize: 15, margin: '0 0 12px' }}>
              {locale === 'he' ? '❌ ההזמנה נדחתה' : '❌ Заявка отклонена'}
            </h3>
            {codes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {codes.map(code => (
                  <div key={code} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    flexDirection: isRtl ? 'row-reverse' : 'row',
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)',
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
                    <span style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.5, textAlign: isRtl ? 'right' : 'left' }}>
                      {COMPLIANCE_ERRORS[code]?.[loc] ?? COMPLIANCE_ERRORS[code]?.he ?? code}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{raw ?? '—'}</p>
            )}
          </div>
        );
      })()}

      {/* Transaction details */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 18px' }}>
          {locale === 'he' ? '📋 פרטי עסקה' : '📋 Детали сделки'}
        </h2>
        {[
          { label: locale === 'he' ? 'סכום פיאט' : 'Сумма фиат', value: `${Number(order.fiatAmount).toLocaleString()} ${order.fiatCurrency}`, big: true },
          { label: locale === 'he' ? 'כמות קריפטו' : 'Количество крипто', value: `${Number(order.cryptoAmount).toFixed(8)} ${order.asset}`, big: true },
          { label: locale === 'he' ? 'שער' : 'Курс', value: `${Number(order.rate).toLocaleString()} ${order.fiatCurrency}` },
          { label: locale === 'he' ? 'עמלה' : 'Комиссия', value: `${Number(order.feeAmount).toFixed(2)} ${order.fiatCurrency}` },
          { label: locale === 'he' ? 'אמצעי תשלום' : 'Способ оплаты', value: order.paymentMethodRequested },
          ...(order.wallet ? [{ label: locale === 'he' ? 'ארנק יעד' : 'Адрес кошелька', value: order.wallet.address, mono: true }] : []),
        ].map((row, i, arr) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexDirection: isRtl ? 'row-reverse' : 'row',
            padding: '10px 0',
            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>{row.label}</span>
            <span style={{
              color: 'white', fontSize: row.big ? 15 : 13, fontWeight: row.big ? 700 : 500,
              fontFamily: row.mono ? 'monospace' : 'inherit',
              wordBreak: 'break-all', textAlign: isRtl ? 'left' : 'right', maxWidth: '55%',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Payment instructions */}
      {order.status === 'awaiting_payment' && paymentInstr && (
        <div style={{
          ...card, marginBottom: 20,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <h2 style={{ color: '#fbbf24', fontWeight: 700, fontSize: 15, margin: '0 0 10px' }}>
            💳 {locale === 'he' ? 'הוראות תשלום' : 'Инструкции по оплате'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            {paymentInstr[locale as 'he' | 'ru'] ?? paymentInstr.he}
          </p>
          {order.paymentRecords[0]?.notes && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>
                {order.paymentRecords[0].notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment records */}
      {order.paymentRecords.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            {locale === 'he' ? '💰 רשומות תשלום' : '💰 Записи платежей'}
          </h2>
          {order.paymentRecords.map((rec, i) => (
            <div key={rec.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexDirection: isRtl ? 'row-reverse' : 'row',
              padding: '10px 0',
              borderBottom: i < order.paymentRecords.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{rec.provider}</span>
                {rec.providerReference && (
                  <p style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace', margin: '3px 0 0' }}>
                    {rec.providerReference.slice(0, 20)}...
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{Number(rec.amount).toFixed(2)} {rec.currency}</span>
                <span style={{
                  padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: rec.status === 'confirmed' ? 'rgba(52,211,153,0.1)' : rec.status === 'failed' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                  color: rec.status === 'confirmed' ? '#34d399' : rec.status === 'failed' ? '#f87171' : '#fbbf24',
                }}>
                  {rec.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderActions orderId={order.id} status={order.status} locale={locale} />
    </div>
  );
}
