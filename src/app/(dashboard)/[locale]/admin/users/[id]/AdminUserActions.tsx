'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  { value: 'registered_user', label: '👤 משתמש רגיל' },
  { value: 'compliance_officer', label: '🛡 Compliance Officer' },
  { value: 'finance_operator', label: '💼 Finance Operator' },
  { value: 'admin', label: '👑 Admin' },
];

const STATUSES = [
  { value: 'active', label: '✅ פעיל' },
  { value: 'suspended', label: '🚫 מושהה' },
  { value: 'pending_verification', label: '⏳ ממתין אימות' },
  { value: 'deactivated', label: '⛔ מבוטל' },
];

interface Props {
  userId: string;
  currentRole: string;
  currentStatus: string;
  currentRiskScore: number;
  kycStatus: string;
  locale: string;
}

export function AdminUserActions({ userId, currentRole, currentStatus, currentRiskScore, kycStatus, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [riskScore, setRiskScore] = useState(String(currentRiskScore));
  const [noteText, setNoteText] = useState('');

  async function runAction(action: string, value?: string) {
    setLoading(action);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value: value ?? '', notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'שגיאה'); return; }
      setSuccess('✅ עודכן בהצלחה');
      setTimeout(() => { setSuccess(''); router.refresh(); }, 1000);
    } catch { setError('שגיאת רשת'); } finally { setLoading(''); }
  }

  async function runKycAction(action: 'approve' | 'reject') {
    setLoading('kyc_' + action);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'שגיאה'); return; }
      setSuccess('✅ KYC עודכן');
      setTimeout(() => { setSuccess(''); router.refresh(); }, 1000);
    } catch { setError('שגיאת רשת'); } finally { setLoading(''); }
  }

  const btn = (label: string, action: string, color: string, value?: string, disabled = false) => (
    <button
      onClick={() => runAction(action, value)}
      disabled={!!loading || disabled}
      style={{
        padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? 'rgba(255,255,255,0.05)' : color,
        color: 'white', opacity: loading === action ? 0.7 : 1,
      }}
    >
      {loading === action ? '...' : label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>⚠️ {error}</p>}
      {success && <p style={{ color: '#34d399', fontSize: 12, margin: 0 }}>{success}</p>}

      {/* Notes field */}
      <div>
        <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 6 }}>הערה לפעולה (אופציונלי)</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="הוסף הסבר לפעולה..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 9,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontSize: 12, outline: 'none', boxSizing: 'border-box', textAlign: 'right',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Role change */}
        <div>
          <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 6 }}>שינוי תפקיד</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 9,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: 12, outline: 'none',
              }}
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {btn('עדכן', 'set_role', '#7c3aed', selectedRole, selectedRole === currentRole)}
          </div>
        </div>

        {/* Status change */}
        <div>
          <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 6 }}>שינוי סטטוס חשבון</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 9,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: 12, outline: 'none',
              }}
            >
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {btn('עדכן', 'set_status', '#0284c7', selectedStatus, selectedStatus === currentStatus)}
          </div>
        </div>

        {/* Risk score */}
        <div>
          <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 6 }}>ציון סיכון (0–100)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" min="0" max="100"
              value={riskScore}
              onChange={e => setRiskScore(e.target.value)}
              style={{
                width: 80, padding: '8px 10px', borderRadius: 9,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: 13, outline: 'none', textAlign: 'center',
              }}
            />
            <div style={{
              flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${riskScore}%`, borderRadius: 3,
                background: Number(riskScore) > 70 ? '#f87171' : Number(riskScore) > 40 ? '#fbbf24' : '#34d399',
                transition: 'width 0.2s',
              }} />
            </div>
            {btn('שמור', 'set_risk_score', '#d97706', riskScore, String(currentRiskScore) === riskScore)}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <label style={{ color: '#64748b', fontSize: 11, display: 'block', marginBottom: 6 }}>פעולות מהירות</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentStatus === 'active'
              ? btn('🚫 השהה', 'set_status', '#dc2626', 'suspended')
              : btn('✅ הפעל', 'set_status', '#16a34a', 'active')
            }
          </div>
        </div>
      </div>

      {/* KYC actions */}
      {['pending_review', 'more_info_required'].includes(kycStatus) && (
        <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 10px', fontWeight: 600 }}>פעולות KYC</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => runKycAction('approve')}
              disabled={!!loading}
              style={{ flex: 1, padding: '9px', borderRadius: 9, background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              {loading === 'kyc_approve' ? '...' : '✅ אשר KYC'}
            </button>
            <button
              onClick={() => runKycAction('reject')}
              disabled={!!loading}
              style={{ flex: 1, padding: '9px', borderRadius: 9, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              {loading === 'kyc_reject' ? '...' : '❌ דחה KYC'}
            </button>
          </div>
        </div>
      )}

      {/* Add note */}
      <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px', fontWeight: 600 }}>הוסף הערה פנימית</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="הערה לצוות..."
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', fontSize: 12, outline: 'none', textAlign: 'right',
            }}
          />
          <button
            onClick={() => { runAction('add_note', noteText); setNoteText(''); }}
            disabled={!noteText || !!loading}
            style={{ padding: '8px 16px', borderRadius: 9, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}
