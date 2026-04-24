import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';

const METHOD_ICONS: Record<PaymentMethod, string> = {
  BIT: '🏦', PAYBOX: '📱', CRYPTO_ONLY: '₿',
  MANUAL_BANK_OPTION_DISABLED_BY_DEFAULT: '🔒',
};
const METHOD_COLORS: Record<PaymentMethod, string> = {
  BIT: 'rgba(52,211,153,0.12)', PAYBOX: 'rgba(96,165,250,0.12)',
  CRYPTO_ONLY: 'rgba(251,191,36,0.12)',
  MANUAL_BANK_OPTION_DISABLED_BY_DEFAULT: 'rgba(100,116,139,0.12)',
};
const METHOD_BORDER: Record<PaymentMethod, string> = {
  BIT: 'rgba(52,211,153,0.25)', PAYBOX: 'rgba(96,165,250,0.25)',
  CRYPTO_ONLY: 'rgba(251,191,36,0.25)',
  MANUAL_BANK_OPTION_DISABLED_BY_DEFAULT: 'rgba(100,116,139,0.2)',
};

export default async function PaymentMethodsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const methods = await prisma.paymentMethodConfig.findMany({ where: { status: 'active' } });
  const isRtl = locale === 'he';

  const L = locale === 'he' ? {
    title: 'שיטות תשלום זמינות',
    minAmount: 'סכום מינימום', maxAmount: 'סכום מקסימום',
    forBuy: 'קנייה', forSell: 'מכירה', selectMethod: 'בחר שיטה',
    description: 'בחר שיטת תשלום מועדפת בעת יצירת הזמנה',
  } : {
    title: 'Методы оплаты',
    minAmount: 'Минимум', maxAmount: 'Максимум',
    forBuy: 'Покупка', forSell: 'Продажа', selectMethod: 'Выбрать',
    description: 'Выберите предпочтительный метод оплаты при создании заявки',
  };

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 800, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
          💳 {L.title}
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0' }}>{L.description}</p>
      </div>

      {methods.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20, padding: '64px 20px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>💳</p>
          <p style={{ color: '#64748b', fontSize: 15 }}>
            {locale === 'he' ? 'אין שיטות תשלום זמינות' : 'Нет доступных методов оплаты'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {methods.map(method => {
            const bg = METHOD_COLORS[method.method] ?? 'rgba(255,255,255,0.05)';
            const border = METHOD_BORDER[method.method] ?? 'rgba(255,255,255,0.09)';

            return (
              <div
                key={method.id}
                style={{
                  background: bg, border: `1px solid ${border}`,
                  borderRadius: 20, padding: '24px',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 18 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {METHOD_ICONS[method.method] ?? '💰'}
                  </div>
                  <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                    <h3 style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>
                      {isRtl ? method.displayNameHe : method.displayNameRu}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0' }}>
                      {method.method}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, flex: 1 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{L.minAmount}</span>
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>₪{Number(method.minAmountIls).toLocaleString()}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{L.maxAmount}</span>
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>₪{Number(method.maxAmountIls).toLocaleString()}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    {method.allowedForBuy && (
                      <span style={{
                        padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
                        color: '#34d399',
                      }}>{L.forBuy}</span>
                    )}
                    {method.allowedForSell && (
                      <span style={{
                        padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)',
                        color: '#60a5fa',
                      }}>{L.forSell}</span>
                    )}
                  </div>
                </div>

                <button style={{
                  width: '100%', height: 44,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  border: 'none', borderRadius: 12,
                  color: 'white', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {L.selectMethod}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
