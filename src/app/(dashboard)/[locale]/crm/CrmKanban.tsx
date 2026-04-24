'use client';

import Link from 'next/link';
import { useState } from 'react';

type Stage = 'new' | 'contacted' | 'quote_sent' | 'negotiating' | 'kyc_pending' | 'payment_pending';

interface Deal {
  id: string;
  title: string;
  stage: string;
  asset?: string | null;
  direction?: string | null;
  estimatedAmount?: number | null;
  currency?: string | null;
  probability: number;
  client: {
    user: { email: string; fullName?: string | null; phone?: string | null };
  };
}

interface Props {
  deals: Deal[];
  locale: string;
}

const STAGES: Array<{ id: Stage; label: string; color: string }> = [
  { id: 'new',             label: '🆕 חדש',          color: 'border-blue-500/30 bg-blue-500/5' },
  { id: 'contacted',       label: '📞 פנייה',         color: 'border-yellow-500/30 bg-yellow-500/5' },
  { id: 'quote_sent',      label: '📋 הצעה נשלחה',    color: 'border-orange-500/30 bg-orange-500/5' },
  { id: 'negotiating',     label: '🤝 משא ומתן',      color: 'border-purple-500/30 bg-purple-500/5' },
  { id: 'kyc_pending',     label: '🪪 ממתין KYC',     color: 'border-red-500/30 bg-red-500/5' },
  { id: 'payment_pending', label: '💳 ממתין תשלום',   color: 'border-emerald-500/30 bg-emerald-500/5' },
];

export function CrmKanban({ deals, locale }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage.id);
        const stageVolume = stageDeals.reduce((sum, d) => sum + (Number(d.estimatedAmount) || 0), 0);

        return (
          <div key={stage.id} className={`flex-shrink-0 w-72 rounded-2xl border ${stage.color} p-3`}>
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">{stage.label}</span>
                <p className="text-xs text-muted-foreground">{stageDeals.length} עסקאות</p>
              </div>
              {stageVolume > 0 && (
                <span className="text-xs font-mono text-muted-foreground">
                  ₪{(stageVolume / 1000).toFixed(0)}K
                </span>
              )}
            </div>

            {/* Deal cards */}
            <div className="space-y-2">
              {stageDeals.map(deal => (
                <div
                  key={deal.id}
                  onMouseEnter={() => setHovered(deal.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`rounded-xl border border-white/8 bg-card p-3 transition-all cursor-pointer ${hovered === deal.id ? 'border-white/20 shadow-lg' : ''}`}
                >
                  {/* Asset badge */}
                  {deal.asset && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        deal.direction === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {deal.direction === 'buy' ? '↓' : '↑'} {deal.asset}
                      </span>
                      {deal.estimatedAmount && (
                        <span className="text-xs font-mono text-muted-foreground">
                          ₪{Number(deal.estimatedAmount).toLocaleString('he-IL')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Deal title */}
                  <p className="text-sm font-medium leading-tight mb-1">{deal.title}</p>

                  {/* Client */}
                  <p className="text-xs text-muted-foreground">
                    👤 {deal.client.user.fullName ?? deal.client.user.email}
                  </p>
                  {deal.client.user.phone && (
                    <p className="text-xs text-muted-foreground">📱 {deal.client.user.phone}</p>
                  )}

                  {/* Probability bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>סבירות</span>
                      <span>{deal.probability}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/10">
                      <div
                        className="h-1 rounded-full bg-primary transition-all"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {stageDeals.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground/50">
                  אין עסקאות
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
