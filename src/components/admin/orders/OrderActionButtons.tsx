'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  currentStatus: string;
  locale: string;
}

export function OrderActionButtons({ orderId, currentStatus, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const t = {
    he: {
      approve: 'אשר הזמנה',
      reject: 'דחה הזמנה',
      hold: 'הקפא',
      complete: 'סיים עסקה',
      payment: 'סמן כתשלום התקבל',
      crypto: 'סמן כקריפטו נשלח',
      notes: 'הערות מנהל...',
      confirm: 'האם אתה בטוח?',
    },
    ru: {
      approve: 'Одобрить',
      reject: 'Отклонить',
      hold: 'Удержать',
      complete: 'Завершить',
      payment: 'Оплата получена',
      crypto: 'Крипто отправлено',
      notes: 'Заметки администратора...',
      confirm: 'Вы уверены?',
    }
  }[locale] ?? {
    approve: 'Approve',
    reject: 'Reject',
    hold: 'Hold',
    complete: 'Complete',
    payment: 'Payment Received',
    crypto: 'Crypto Sent',
    notes: 'Admin notes...',
    confirm: 'Are you sure?',
  };

  async function handleAction(action: string) {
    if (!confirm(t.confirm)) return;
    
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (res.ok) {
        router.refresh();
        setNotes('');
      } else {
        const data = await res.json();
        alert(data.error || 'Error performing action');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">
        {locale === 'he' ? 'פעולות מנהל' : 'Действия администратора'}
      </h3>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t.notes}
        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm mb-6 outline-none focus:border-primary/50 transition-colors"
        rows={3}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentStatus === 'pending_review' && (
          <>
            <button
              onClick={() => handleAction('approve')}
              disabled={!!loading}
              className="rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {loading === 'approve' ? '...' : t.approve}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={!!loading}
              className="rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {loading === 'reject' ? '...' : t.reject}
            </button>
          </>
        )}

        {currentStatus === 'awaiting_payment' && (
          <button
            onClick={() => handleAction('mark_payment_received')}
            disabled={!!loading}
            className="rounded-xl bg-blue-500 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors sm:col-span-2"
          >
            {loading === 'mark_payment_received' ? '...' : t.payment}
          </button>
        )}

        {currentStatus === 'awaiting_crypto' && (
          <button
            onClick={() => handleAction('mark_crypto_sent')}
            disabled={!!loading}
            className="rounded-xl bg-purple-500 py-3 text-sm font-bold text-white hover:bg-purple-600 disabled:opacity-50 transition-colors sm:col-span-2"
          >
            {loading === 'mark_crypto_sent' ? '...' : t.crypto}
          </button>
        )}

        {currentStatus === 'payout_in_progress' && (
          <button
            onClick={() => handleAction('complete')}
            disabled={!!loading}
            className="rounded-xl gradient-buy py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all sm:col-span-2"
          >
            {loading === 'complete' ? '...' : t.complete}
          </button>
        )}

        {['pending_review', 'awaiting_payment', 'awaiting_crypto'].includes(currentStatus) && (
          <button
            onClick={() => handleAction('hold')}
            disabled={!!loading}
            className="rounded-xl glass py-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50 transition-colors sm:col-span-2"
          >
            {loading === 'hold' ? '...' : t.hold}
          </button>
        )}
      </div>
    </div>
  );
}
