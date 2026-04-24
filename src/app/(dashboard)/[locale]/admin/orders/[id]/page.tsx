'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type OrderDetail = {
  id: string;
  type: string;
  asset: string;
  fiatAmount: string | number;
  fiatCurrency: string;
  cryptoAmount: string | number;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
  rejectionReason: string | null;
  notes: string | null;
  user: { fullName: string | null; email: string; phone: string };
  wallet: { address: string; asset: string } | null;
  paymentRecords: Array<{ id: string; method: string; provider: string; amount: number; currency: string; status: string; createdAt: string }>;
};

const STATUS_HE: Record<string, string> = {
  submitted: 'הוגש', pending_review: 'בבדיקה', awaiting_payment: 'ממתין תשלום',
  payment_received: 'תשלום התקבל', awaiting_crypto: 'ממתין קריפטו',
  payout_in_progress: 'תשלום בתהליך', completed: 'הושלם',
  rejected: 'נדחה', cancelled: 'בוטל', on_hold: 'מעוכב', expired: 'פג תוקף',
};

const STATUS_ACTIONS: Record<string, Array<{ action: string; label: string; color: string }>> = {
  submitted:         [{ action: 'approve', label: 'אשר → בבדיקה', color: 'bg-blue-500' }],
  pending_review:    [
    { action: 'approve', label: 'אשר → ממתין תשלום', color: 'bg-emerald-500' },
    { action: 'reject', label: 'דחה', color: 'bg-red-500' },
    { action: 'hold', label: 'עכב', color: 'bg-orange-500' },
  ],
  awaiting_payment:  [{ action: 'mark_payment_received', label: '✅ תשלום התקבל', color: 'bg-lime-600' }],
  payment_received:  [{ action: 'mark_crypto_sent', label: '📤 קריפטו נשלח', color: 'bg-cyan-600' }],
  awaiting_crypto:   [{ action: 'complete', label: '🎉 השלם עסקה', color: 'bg-emerald-600' }],
  on_hold:           [
    { action: 'approve', label: 'שחרר → בדיקה', color: 'bg-blue-500' },
    { action: 'reject', label: 'דחה', color: 'bg-red-500' },
  ],
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then(r => r.json())
      .then(d => { setOrder(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function runAction(action: string) {
    setActionLoading(action);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'שגיאה'); return; }
      setOrder(data.data);
      setNotes('');
    } catch { setError('שגיאת רשת'); } finally { setActionLoading(''); }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">טוען...</div>;
  if (!order) return <div className="p-8 text-center text-muted-foreground">הזמנה לא נמצאה</div>;

  const actions = STATUS_ACTIONS[order.status] ?? [];

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center justify-between flex-row-reverse">
        <h1 className="text-lg font-bold">הזמנה #{order.id.slice(-8)}</h1>
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">← חזרה</button>
      </div>

      {/* Status badge */}
      <div className="mb-4 flex items-center gap-2 flex-row-reverse">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
          order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
          order.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
          order.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {STATUS_HE[order.status] ?? order.status}
        </span>
        <span className={`text-lg font-bold ${order.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
          {order.type === 'buy' ? '↓ קנייה' : '↑ מכירה'} {order.asset}
        </span>
      </div>

      {/* Details card */}
      <div className="glass rounded-2xl p-5 mb-4 space-y-3">
        {[
          { label: 'לקוח', value: order.user.fullName ?? order.user.email },
          { label: 'טלפון', value: order.user.phone },
          { label: 'אימייל', value: order.user.email },
          { label: 'סכום ILS', value: `₪${Number(order.fiatAmount).toLocaleString('he-IL')}` },
          { label: 'כמות קריפטו', value: `${Number(order.cryptoAmount).toFixed(8)} ${order.asset}` },
          { label: 'אמצעי תשלום', value: order.paymentMethod ?? 'לא נבחר' },
          { label: 'ארנק יעד', value: order.wallet?.address ?? 'לא הוגדר' },
          { label: 'נוצר', value: new Date(order.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
            <span className="text-sm font-medium text-right break-all">{value}</span>
          </div>
        ))}
        {order.notes && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">הערות</p>
            <p className="text-sm bg-white/5 rounded-xl p-3 text-right">{order.notes}</p>
          </div>
        )}
        {order.rejectionReason && (
          <div>
            <p className="text-xs text-red-400 mb-1">סיבת דחייה</p>
            <p className="text-sm text-red-300">{order.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Payment records */}
      {order.paymentRecords?.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-4">
          <h3 className="font-semibold mb-3 text-right">רשומות תשלום</h3>
          {order.paymentRecords.map(pr => (
            <div key={pr.id} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0 flex-row-reverse">
              <span className="text-muted-foreground">{pr.provider} / {pr.method}</span>
              <span className="font-mono">₪{Number(pr.amount).toLocaleString()}</span>
              <span className={pr.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}>{pr.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-4">
          <h3 className="font-semibold mb-3 text-right">פעולות</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הערות פנימיות (אופציונלי)..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary mb-3 h-20 text-right"
            dir="rtl"
          />
          {error && <p className="text-red-400 text-sm mb-3 text-right">{error}</p>}
          <div className="flex flex-col gap-2">
            {actions.map(a => (
              <button
                key={a.action}
                onClick={() => runAction(a.action)}
                disabled={!!actionLoading}
                className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition ${a.color} hover:opacity-90 disabled:opacity-50`}
              >
                {actionLoading === a.action ? 'מעבד...' : a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
