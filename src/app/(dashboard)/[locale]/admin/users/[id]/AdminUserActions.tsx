'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  kycStatus: string;
  locale: string;
}

export function AdminUserActions({ userId, kycStatus, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  async function runKycAction(action: 'approve' | 'reject') {
    setLoading(action);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'שגיאה'); return; }
      router.refresh();
    } catch { setError('שגיאת רשת'); } finally { setLoading(''); }
  }

  if (!['pending_review', 'under_review'].includes(kycStatus)) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/8">
      <h4 className="text-sm font-semibold mb-2 text-right">פעולות KYC</h4>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="הערות לבדיקה (אופציונלי)..."
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary mb-3 h-16 text-right"
        dir="rtl"
      />
      {error && <p className="text-red-400 text-xs mb-2 text-right">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => runKycAction('approve')}
          disabled={!!loading}
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading === 'approve' ? '...' : '✅ אשר KYC'}
        </button>
        <button
          onClick={() => runKycAction('reject')}
          disabled={!!loading}
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading === 'reject' ? '...' : '❌ דחה KYC'}
        </button>
      </div>
    </div>
  );
}
