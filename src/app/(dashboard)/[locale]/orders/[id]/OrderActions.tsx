'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props { orderId: string; status: string; locale: string; }

export function OrderActions({ orderId, status, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const isRtl = locale === 'he';

  async function handleSubmit() {
    setLoading('submit'); setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/submit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (isRtl ? 'שגיאה' : 'Ошибка')); return; }
      router.refresh();
    } finally { setLoading(null); }
  }

  async function handleCancel() {
    if (!confirm(isRtl ? 'לבטל הזמנה זו?' : 'Отменить заявку?')) return;
    setLoading('cancel'); setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (isRtl ? 'שגיאה' : 'Ошибка')); return; }
      router.refresh();
    } finally { setLoading(null); }
  }

  const cancellable = ['draft', 'submitted', 'pending_review', 'on_hold', 'pending_kyc'].includes(status);
  const submittable = status === 'draft';

  if (!submittable && !cancellable) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', gap: 10, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
        {submittable && (
          <button
            onClick={handleSubmit}
            disabled={!!loading}
            style={{
              flex: 1, height: 50,
              background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading === 'submit' ? (isRtl ? 'שולח...' : 'Отправка...') : (isRtl ? 'הגש הזמנה' : 'Подать заявку')}
          </button>
        )}
        {cancellable && (
          <button
            onClick={handleCancel}
            disabled={!!loading}
            style={{
              height: 50, padding: '0 20px',
              background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 13, color: '#f87171', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading === 'cancel' ? (isRtl ? 'מבטל...' : 'Отмена...') : (isRtl ? 'בטל הזמנה' : 'Отменить заявку')}
          </button>
        )}
      </div>
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          color: '#fca5a5', fontSize: 13,
        }}>⚠️ {error}</div>
      )}
    </div>
  );
}
