'use client';

import { useState } from 'react';
import Link from 'next/link';

const fmt = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(n);

const fmtNum = (n: number, decimals = 4) =>
  new Intl.NumberFormat('he-IL', { maximumFractionDigits: decimals }).format(n);

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  padding: '20px 24px',
} as const;

const STATUS_HE: Record<string, string> = {
  open: 'פתוח',
  locked: 'נעול',
  filed: 'הוגש',
};

const STATUS_COLOR: Record<string, string> = {
  open: '#22d3ee',
  locked: '#fbbf24',
  filed: '#34d399',
};

interface Props {
  data: {
    currentPeriod: {
      id: string;
      label: string;
      startDate: string;
      endDate: string;
      status: string;
      vatReport: {
        grossRevenueIls: number;
        spreadRevenueIls: number;
        vatOnRevenueIls: number;
        vatPayableIls: number;
        totalOrders: number;
        buyOrders: number;
        sellOrders: number;
        generatedAt: string;
      } | null;
    };
    periods: {
      id: string;
      label: string;
      status: string;
      startDate: string;
      endDate: string;
      vatReport: {
        grossRevenueIls: number;
        spreadRevenueIls: number;
        vatPayableIls: number;
        totalOrders: number;
      } | null;
    }[];
    annual: {
      year: number;
      totalOrders: number;
      grossRevenueIls: number;
      spreadRevenueIls: number;
      vatOnRevenueIls: number;
      totalVatPaidIls: number;
      realizedGainIls: number;
      realizedLossIls: number;
      netRealizedIls: number;
      estimatedCapGainsTaxIls: number;
      byAsset: { asset: string; buyOrders: number; sellOrders: number; totalBoughtIls: number; totalSoldIls: number; totalSpreadIls: number }[];
      vatBreakdown: { period: string; grossRevenue: number; spreadRevenue: number; vatPayable: number }[];
    };
    unrealized: {
      asset: string;
      inventoryAmount: number;
      avgCostPerUnit: number;
      currentPriceIls: number;
      currentValueIls: number;
      costBasisIls: number;
      unrealizedGainLossIls: number;
    }[];
    recentPrices: { id: string; asset: string; priceIls: number; source: string; snapshotAt: string }[];
    exportStart: string;
    exportEnd: string;
    locale: string;
  };
}

export default function AccountingClient({ data }: Props) {
  const { currentPeriod, periods, annual, unrealized, recentPrices, locale } = data;

  const [exportStart, setExportStart] = useState(data.exportStart);
  const [exportEnd, setExportEnd] = useState(data.exportEnd);
  const [activeTab, setActiveTab] = useState<'overview' | 'vat' | 'crypto' | 'export'>('overview');

  const [priceAsset, setPriceAsset] = useState('BTC');
  const [priceValue, setPriceValue] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceMsg, setPriceMsg] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  const totalUnrealized = unrealized.reduce((s, p) => s + p.unrealizedGainLossIls, 0);

  async function handleRefreshVat() {
    setRefreshing(true);
    try {
      await fetch('/api/admin/accounting/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: currentPeriod.id }),
      });
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrice(true);
    setPriceMsg('');
    try {
      const res = await fetch('/api/admin/accounting/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset: priceAsset, priceIls: parseFloat(priceValue) }),
      });
      if (res.ok) {
        setPriceMsg('✅ שער נשמר');
        setPriceValue('');
        setTimeout(() => window.location.reload(), 800);
      } else {
        setPriceMsg('❌ שגיאה בשמירה');
      }
    } finally {
      setSavingPrice(false);
    }
  }

  const exportUrl = (format: 'csv' | 'json') =>
    `/api/admin/accounting/export?start=${exportStart}&end=${exportEnd}&format=${format}`;

  const tabStyle = (t: string) => ({
    padding: '8px 18px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    background: activeTab === t ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.07)',
    color: activeTab === t ? 'white' : '#94a3b8',
  } as const);

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto', fontFamily: "'Inter', -apple-system, sans-serif", direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>📊 חשבונאות ורגולציה</h1>
        <Link href={`/${locale}/admin`} style={{ color: '#94a3b8', fontSize: 13 }}>← חזרה לניהול</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: '📋 סיכום שנתי' },
          { key: 'vat', label: '🧾 מע"מ' },
          { key: 'crypto', label: '₿ קריפטו P&L' },
          { key: 'export', label: '📤 ייצוא לרואה חשבון' },
        ].map(tab => (
          <button key={tab.key} style={tabStyle(tab.key)} onClick={() => setActiveTab(tab.key as typeof activeTab)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, marginTop: -8 }}>
            שנה {annual.year} · {annual.totalOrders} עסקאות הושלמו
          </p>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'מחזור כולל', value: fmt(annual.grossRevenueIls), color: '#60a5fa', note: 'סך עסקאות שהושלמו' },
              { label: 'הכנסה מספרד/עמלה', value: fmt(annual.spreadRevenueIls), color: '#34d399', note: 'הכנסה נטו של העסק' },
              { label: 'מע"מ לתשלום (שנתי)', value: fmt(annual.vatOnRevenueIls), color: '#fbbf24', note: '17% מהכנסת ספרד' },
              { label: 'רווח הון ממומש נטו', value: fmt(annual.netRealizedIls), color: annual.netRealizedIls >= 0 ? '#34d399' : '#f87171', note: 'על מכירות מטבע' },
              { label: 'הערכת מס רווח הון', value: fmt(annual.estimatedCapGainsTaxIls), color: '#fb923c', note: '25% מרווח ממומש' },
              { label: 'רווח/הפסד לא ממומש', value: fmt(totalUnrealized), color: totalUnrealized >= 0 ? '#a3e635' : '#f87171', note: 'שווי שוק vs עלות' },
            ].map(k => (
              <div key={k.label} style={{ ...card }}>
                <p style={{ color: '#64748b', fontSize: 11, margin: 0, marginBottom: 6 }}>{k.label}</p>
                <p style={{ color: k.color, fontSize: 22, fontWeight: 800, margin: 0 }}>{k.value}</p>
                <p style={{ color: '#475569', fontSize: 11, margin: 0, marginTop: 4 }}>{k.note}</p>
              </div>
            ))}
          </div>

          {/* VAT note */}
          <div style={{ ...card, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 20 }}>
            <p style={{ color: '#fbbf24', fontWeight: 700, margin: 0, marginBottom: 6, fontSize: 14 }}>💡 הסבר — מע"מ על קריפטו בישראל</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.8 }}>
              המע"מ (17%) חל על <strong style={{ color: 'white' }}>עמלת הספרד/שירות שהעסק גובה</strong> — לא על ערך המטבע עצמו.
              הגשת דוח מע"מ מתבצעת כל <strong style={{ color: 'white' }}>חודשיים</strong> עד ה-15 לחודש השלישי.
            </p>
          </div>

          {/* Capital gains note */}
          <div style={{ ...card, background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.2)', marginBottom: 28 }}>
            <p style={{ color: '#fb923c', fontWeight: 700, margin: 0, marginBottom: 6, fontSize: 14 }}>💡 הסבר — רווח הון על קריפטו בישראל</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.8 }}>
              <strong style={{ color: 'white' }}>רווח ממומש</strong> (realized): מתרחש רק כשמוכרים קריפטו — חייב ב-<strong style={{ color: 'white' }}>25% מס רווח הון</strong>.{' '}
              <strong style={{ color: 'white' }}>רווח לא ממומש</strong> (unrealized): שינוי ערך בלי מכירה — לא חייב במס, אך יש לדווח עליו בדוח שנתי (טופס 1301).
              כאשר BTC יורד לאחר קנייה — זה <strong style={{ color: 'white' }}>הפסד לא ממומש</strong>, ניתן לקיזוז רק אחרי מכירה.
            </p>
          </div>

          {/* Per-asset breakdown */}
          {annual.byAsset.length > 0 && (
            <div style={{ ...card }}>
              <p style={{ color: 'white', fontWeight: 700, margin: '0 0 16px', fontSize: 15 }}>פירוט לפי מטבע</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['מטבע', 'קניות', 'מכירות', 'סה"כ נרכש ₪', 'סה"כ נמכר ₪', 'ספרד/עמלה ₪'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {annual.byAsset.map(row => (
                      <tr key={row.asset}>
                        <td style={{ padding: '10px 12px', color: '#60a5fa', fontWeight: 700 }}>{row.asset}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{row.buyOrders}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{row.sellOrders}</td>
                        <td style={{ padding: '10px 12px', color: 'white' }}>{fmt(row.totalBoughtIls)}</td>
                        <td style={{ padding: '10px 12px', color: 'white' }}>{fmt(row.totalSoldIls)}</td>
                        <td style={{ padding: '10px 12px', color: '#34d399' }}>{fmt(row.totalSpreadIls)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VAT TAB ── */}
      {activeTab === 'vat' && (
        <div>
          {/* Current period */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>תקופה נוכחית: {currentPeriod.label}</p>
                <span style={{ fontSize: 11, color: STATUS_COLOR[currentPeriod.status], fontWeight: 600 }}>
                  {STATUS_HE[currentPeriod.status]}
                </span>
              </div>
              <button
                onClick={handleRefreshVat}
                disabled={refreshing}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                {refreshing ? 'מרענן...' : '🔄 רענן דוח'}
              </button>
            </div>

            {currentPeriod.vatReport ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'מחזור עסקאות', value: fmt(currentPeriod.vatReport.grossRevenueIls) },
                  { label: 'הכנסת ספרד/עמלה', value: fmt(currentPeriod.vatReport.spreadRevenueIls), color: '#34d399' },
                  { label: 'מע"מ על הכנסה (17%)', value: fmt(currentPeriod.vatReport.vatOnRevenueIls), color: '#fbbf24' },
                  { label: 'מע"מ לתשלום', value: fmt(currentPeriod.vatReport.vatPayableIls), color: '#f87171' },
                  { label: 'סה"כ הזמנות', value: String(currentPeriod.vatReport.totalOrders) },
                  { label: 'קניות / מכירות', value: `${currentPeriod.vatReport.buyOrders} / ${currentPeriod.vatReport.sellOrders}` },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ color: '#64748b', fontSize: 11, margin: 0, marginBottom: 4 }}>{item.label}</p>
                    <p style={{ color: item.color ?? 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 13 }}>אין נתונים לתקופה זו</p>
            )}
          </div>

          {/* Previous periods */}
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>תקופות קודמות</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {periods.map(p => (
              <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{p.label}</span>
                  {' '}
                  <span style={{ fontSize: 11, color: STATUS_COLOR[p.status] }}>{STATUS_HE[p.status]}</span>
                </div>
                {p.vatReport ? (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>מחזור</p>
                      <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>{fmt(p.vatReport.grossRevenueIls)}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>מע"מ לתשלום</p>
                      <p style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700, margin: 0 }}>{fmt(p.vatReport.vatPayableIls)}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>עסקאות</p>
                      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{p.vatReport.totalOrders}</p>
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#475569', fontSize: 12 }}>לא נוצר</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CRYPTO P&L TAB ── */}
      {activeTab === 'crypto' && (
        <div>
          {/* Price input */}
          <div style={{ ...card, marginBottom: 24 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0, marginBottom: 12 }}>
              📥 עדכון שער יומי (לחישוב unrealized)
            </p>
            <p style={{ color: '#64748b', fontSize: 12, marginBottom: 14, marginTop: -4 }}>
              הזן שערים ידניים לחישוב רווח/הפסד לא ממומש — כנדרש לדוח השנתי (טופס 1301)
            </p>
            <form onSubmit={handleSavePrice} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>מטבע</label>
                <select
                  value={priceAsset}
                  onChange={e => setPriceAsset(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 13 }}
                >
                  {['BTC', 'ETH', 'USDT', 'USDT_TRC20', 'USDC', 'SOL', 'LTC', 'XMR'].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>שער ₪</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceValue}
                  onChange={e => setPriceValue(e.target.value)}
                  placeholder="לדוגמה: 325000"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 13, width: 160 }}
                />
              </div>
              <button
                type="submit"
                disabled={savingPrice || !priceValue}
                style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {savingPrice ? 'שומר...' : 'שמור שער'}
              </button>
              {priceMsg && <span style={{ color: '#34d399', fontSize: 13, alignSelf: 'center' }}>{priceMsg}</span>}
            </form>
          </div>

          {/* Unrealized positions */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>פוזיציות לא ממומשות (מלאי חברה)</p>
              <span style={{ color: totalUnrealized >= 0 ? '#34d399' : '#f87171', fontWeight: 700, fontSize: 16 }}>
                {totalUnrealized >= 0 ? '+' : ''}{fmt(totalUnrealized)}
              </span>
            </div>
            {unrealized.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>
                אין מלאי פתוח. הרשומות יתמלאו אוטומטית ממצב הזמנות שהושלמו.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['מטבע', 'כמות', 'עלות ממוצעת/יחידה', 'שער נוכחי', 'שווי שוק', 'עלות בסיס', 'רווח/הפסד לא ממומש'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unrealized.map(pos => (
                      <tr key={pos.asset}>
                        <td style={{ padding: '10px', color: '#60a5fa', fontWeight: 700 }}>{pos.asset}</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{fmtNum(pos.inventoryAmount, 6)}</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{fmt(pos.avgCostPerUnit)}</td>
                        <td style={{ padding: '10px', color: pos.currentPriceIls > 0 ? 'white' : '#475569' }}>
                          {pos.currentPriceIls > 0 ? fmt(pos.currentPriceIls) : '—'}
                        </td>
                        <td style={{ padding: '10px', color: 'white' }}>{pos.currentPriceIls > 0 ? fmt(pos.currentValueIls) : '—'}</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{fmt(pos.costBasisIls)}</td>
                        <td style={{ padding: '10px', color: pos.unrealizedGainLossIls >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {pos.currentPriceIls > 0 ? (pos.unrealizedGainLossIls >= 0 ? '+' : '') + fmt(pos.unrealizedGainLossIls) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent price snapshots */}
          {recentPrices.length > 0 && (
            <div style={{ ...card }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0, marginBottom: 12 }}>שערים אחרונים שנרשמו</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentPrices.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: 13 }}>{p.asset}</span>
                    <span style={{ color: 'white', fontSize: 13 }}>{fmt(p.priceIls)}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(p.snapshotAt).toLocaleDateString('he-IL')}</span>
                    <span style={{ color: '#475569', fontSize: 11 }}>{p.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EXPORT TAB ── */}
      {activeTab === 'export' && (
        <div>
          <div style={{ ...card, marginBottom: 24 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0, marginBottom: 6 }}>📤 ייצוא דוח לרואה חשבון</p>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, marginTop: 4 }}>
              מייצא את כל העסקאות עם חישוב מע"מ, ספרד, ורווח/הפסד ממומש לקובץ CSV או JSON
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>מתאריך</label>
                <input
                  type="date"
                  value={exportStart}
                  onChange={e => setExportStart(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>עד תאריך</label>
                <input
                  type="date"
                  value={exportEnd}
                  onChange={e => setExportEnd(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'white', padding: '8px 12px', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <a
                href={exportUrl('csv')}
                download
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                ⬇️ הורד CSV (לאקסל)
              </a>
              <a
                href={exportUrl('json')}
                download
                style={{ padding: '10px 24px', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
              >
                ⬇️ הורד JSON
              </a>
            </div>
          </div>

          {/* Column explanation */}
          <div style={{ ...card }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0, marginBottom: 12 }}>הסבר עמודות הדוח לרואה חשבון</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { col: 'תאריך', desc: 'תאריך השלמת העסקה' },
                { col: 'מזהה הזמנה', desc: 'מספר ייחודי לעסקה' },
                { col: 'סוג', desc: 'קנייה / מכירה' },
                { col: 'מטבע', desc: 'BTC / ETH וכו\'' },
                { col: 'כמות קריפטו', desc: 'מספר המטבעות בעסקה' },
                { col: 'שער ₪', desc: 'שערת ההמרה ₪ למטבע' },
                { col: 'סכום ₪', desc: 'סכום ₪ שהתקבל/שולם (בסיס מע"מ)' },
                { col: 'עמלה ₪', desc: 'עמלת ספרד — הכנסה של העסק' },
                { col: 'ספרד %', desc: 'אחוז הרווח שגבינו' },
                { col: 'מע"מ ₪', desc: '17% מהעמלה — לשלם למס הכנסה' },
                { col: 'רווח/הפסד ממומש ₪', desc: 'רק למכירות — חישוב FIFO בין מחיר קנייה לשער מכירה' },
                { col: 'לקוח', desc: 'שם ומייל הלקוח (לצרכי ביקורת)' },
              ].map(item => (
                <div key={item.col} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                  <span style={{ color: '#60a5fa', fontWeight: 600, minWidth: 160 }}>{item.col}</span>
                  <span style={{ color: '#94a3b8' }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
