import { getSession, isFinanceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

export default async function CrmClientDetailPage({
  params
}: {
  params: { locale: string; id: string };
}) {
  const { locale, id } = params;
  const session = await getSession();

  if (!session || !isFinanceOrAdmin(session)) {
    redirect(`/${locale}/dashboard`);
  }

  const client = await prisma.crmClient.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          orders: { orderBy: { createdAt: 'desc' }, take: 5 },
          kycProfile: true
        }
      },
      deals: { orderBy: { updatedAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 15 }
    }
  });

  if (!client) notFound();

  const isRtl = locale === 'he';

  return (
    <div className={`p-6 lg:p-10 ${isRtl ? 'text-right' : ''}`}>
      {/* Client Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="h-20 w-20 rounded-3xl gradient-brand flex items-center justify-center text-3xl text-white font-black shadow-lg shadow-primary/20">
            {client.user.fullName?.[0].toUpperCase() || client.user.email[0].toUpperCase()}
          </div>
          <div>
            <div className={`flex items-center gap-3 mb-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h1 className="text-3xl font-black text-white">{client.user.fullName || client.user.email.split('@')[0]}</h1>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase text-muted-foreground">
                {client.status}
              </span>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="text-primary font-medium">{client.user.email}</span>
              {client.user.phone && <span className="opacity-50">|</span>}
              <span>{client.user.phone}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded-2xl glass px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
            {isRtl ? 'תיעוד שיחה' : 'Log Call'}
          </button>
          <button className="rounded-2xl gradient-brand px-8 py-3 text-sm font-bold text-white hover:opacity-90 shadow-lg shadow-primary/20 transition-all">
            {isRtl ? '+ עסקה חדשה' : '+ New Deal'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Stats & Deals */}
        <div className="xl:col-span-2 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {[
               { label: isRtl ? 'נפח כולל' : 'Total Volume', value: `₪${Number(client.totalVolume).toLocaleString()}`, icon: '💰' },
               { label: isRtl ? 'עסקאות' : 'Deals', value: client.deals.length.toString(), icon: '🤝' },
               { label: isRtl ? 'סטטוס KYC' : 'KYC Level', value: client.user.kycProfile?.level || 'NONE', icon: '🪪' },
             ].map((s, i) => (
               <div key={i} className="glass rounded-3xl p-6 flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
                   {s.icon}
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">{s.label}</p>
                   <p className="text-lg font-black text-white">{s.value}</p>
                 </div>
               </div>
             ))}
          </div>

          {/* Deals Section */}
          <div className="glass rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {isRtl ? 'עסקאות בצינור' : 'Deals Pipeline'}
            </h2>
            {client.deals.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground italic border-2 border-dashed border-white/5 rounded-2xl">
                {isRtl ? 'אין עסקאות פעילות' : 'No active deals'}
              </div>
            ) : (
              <div className="space-y-4">
                {client.deals.map((deal) => (
                  <div key={deal.id} className="glass bg-white/2 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white mb-1">{deal.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {deal.stage}
                        </span>
                        {deal.estimatedAmount && (
                          <span className="text-xs text-muted-foreground">
                            ₪{Number(deal.estimatedAmount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-muted-foreground mb-1">{isRtl ? 'סבירות' : 'Probability'}</p>
                       <p className="text-sm font-black text-white">{deal.probability}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders Section */}
          <div className="glass rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {isRtl ? 'עסקאות אחרונות במערכת' : 'Recent Crypto Orders'}
            </h2>
            {client.user.orders.length === 0 ? (
               <div className="py-10 text-center text-muted-foreground italic border-2 border-dashed border-white/5 rounded-2xl">
               {isRtl ? 'לא בוצעו עסקאות קריפטו עדיין' : 'No crypto orders yet'}
             </div>
            ) : (
              <div className="divide-y divide-white/5">
                {client.user.orders.map((order) => (
                  <Link key={order.id} href={`/${locale}/admin/orders/${order.id}`} className={`flex items-center justify-between py-4 transition hover:bg-white/2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${order.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {order.type === 'buy' ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{Number(order.cryptoAmount).toFixed(6)} {order.asset}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString(locale)}</p>
                      </div>
                    </div>
                    <div className={`text-right ${isRtl ? 'text-left' : ''}`}>
                      <p className="text-sm font-black text-white">₪{Number(order.fiatAmount).toLocaleString()}</p>
                      <p className={`text-[10px] font-black uppercase ${order.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>{order.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Timeline */}
        <div className="space-y-8">
          <div className="glass rounded-3xl p-8 flex flex-col h-full">
            <h2 className="text-xl font-bold text-white mb-6">
              {isRtl ? 'ציר זמן פעילות' : 'Activity Feedback'}
            </h2>
            
            {/* Simple Add Note Form placeholder */}
            <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 transition-all focus-within:border-primary/50">
              <textarea 
                placeholder={isRtl ? 'הוסף הערה...' : 'Add a note...'}
                className="w-full bg-transparent p-3 text-sm text-white outline-none"
                rows={3}
              />
              <div className="flex justify-end p-2">
                <button className="rounded-xl gradient-brand px-4 py-1.5 text-xs font-bold text-white hover:opacity-90">
                  {isRtl ? 'שמור' : 'Save'}
                </button>
              </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto max-h-[600px] no-scrollbar pr-2">
              {client.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-10">
                  {isRtl ? 'אין פעילות בתיק' : 'No activity logged'}
                </p>
              ) : (
                client.activities.map((act) => (
                  <div key={act.id} className={`relative pl-8 ${isRtl ? 'pl-0 pr-8' : ''}`}>
                    {/* Dot */}
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-primary/40 border-2 border-primary ${isRtl ? 'right-[-6px]' : 'left-[-6px]'}`}></div>
                    {/* Line */}
                    <div className={`absolute top-4 bottom-[-24px] w-[1px] bg-white/10 ${isRtl ? 'right-[-1px]' : 'left-[-1px]'}`}></div>
                    
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">
                      {new Date(act.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm font-bold text-white mb-1">{act.title}</p>
                    {act.body && <p className="text-xs text-muted-foreground leading-relaxed">{act.body}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
