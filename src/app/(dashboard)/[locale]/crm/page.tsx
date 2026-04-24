import { getSession, isFinanceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CrmKanban } from './CrmKanban';

export default async function CrmPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session || !isFinanceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  // Dashboard stats
  const [totalClients, activeDeals, completedThisMonth, totalVolume] = await Promise.all([
    prisma.crmClient.count(),
    prisma.crmDeal.count({ where: { stage: { notIn: ['completed', 'lost'] } } }),
    prisma.crmDeal.count({
      where: {
        stage: 'completed',
        closedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.crmClient.aggregate({ _sum: { totalVolume: true } }),
  ]);

  // Recent activities
  const recentActivity = await prisma.crmActivity.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      client: { include: { user: { select: { email: true, fullName: true } } } },
    },
  });

  // Deals for kanban
  const deals = await prisma.crmDeal.findMany({
    where: { stage: { notIn: ['completed', 'lost'] } },
    include: {
      client: { include: { user: { select: { email: true, fullName: true, phone: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const vol = Number(totalVolume._sum.totalVolume ?? 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM — ניהול לקוחות ועסקאות</h1>
          <p className="text-sm text-muted-foreground">מעקב עסקאות, לקוחות ותקשורת</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/${locale}/crm/clients`}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:border-white/20">
            כל הלקוחות
          </Link>
          <Link href={`/${locale}/crm/deals`}
            className="rounded-xl gradient-brand px-5 py-2 text-sm font-semibold text-white">
            + עסקה חדשה
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'סה"כ לקוחות', value: totalClients.toString(), icon: '👥', color: 'text-blue-400' },
          { label: 'עסקאות פעילות', value: activeDeals.toString(), icon: '⚡', color: 'text-amber-400' },
          { label: 'נסגרו החודש', value: completedThisMonth.toString(), icon: '✅', color: 'text-emerald-400' },
          { label: 'נפח כולל', value: `₪${(vol / 1000).toFixed(0)}K`, icon: '💰', color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="mb-8">
        <h2 className="mb-4 font-semibold text-lg">פייפליין עסקאות</h2>
        <CrmKanban deals={deals as never} locale={locale} />
      </div>

      {/* Recent activity */}
      <div className="glass rounded-2xl">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="font-semibold">פעילות אחרונה</h2>
        </div>
        <div className="divide-y divide-white/5">
          {recentActivity.map(act => (
            <div key={act.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <span className="mt-0.5 text-base">
                {act.type === 'note' ? '📝' : act.type === 'call' ? '📞' : act.type === 'order_completed' ? '✅' : act.type === 'kyc_approved' ? '🪪' : '📌'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{act.title}</p>
                <p className="text-xs text-muted-foreground">
                  {act.client.user.fullName ?? act.client.user.email} ·{' '}
                  {new Date(act.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <div className="p-10 text-center text-muted-foreground text-sm">אין פעילות עדיין</div>
          )}
        </div>
      </div>
    </div>
  );
}
