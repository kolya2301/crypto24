import { getSession, isFinanceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CrmClientsPage({
  params,
  searchParams
}: {
  params: { locale: string };
  searchParams: { search?: string; status?: string };
}) {
  const { locale } = params;
  const session = await getSession();

  if (!session || !isFinanceOrAdmin(session)) {
    redirect(`/${locale}/dashboard`);
  }

  const searchQuery = searchParams.search;
  const selectedStatus = searchParams.status;

  const where: any = {};
  if (searchQuery) {
    where.OR = [
      { user: { email: { contains: searchQuery, mode: 'insensitive' } } },
      { user: { fullName: { contains: searchQuery, mode: 'insensitive' } } },
      { user: { phone: { contains: searchQuery, mode: 'insensitive' } } },
    ];
  }
  if (selectedStatus && selectedStatus !== 'all') {
    where.status = selectedStatus;
  }

  const clients = await prisma.crmClient.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      _count: { select: { deals: true } }
    },
    take: 50
  });

  const isRtl = locale === 'he';

  return (
    <div className={`p-6 lg:p-10 ${isRtl ? 'text-right' : ''}`}>
      <div className={`flex items-center justify-between mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-black text-white mb-2">
            {locale === 'he' ? 'מאגר לקוחות 🤝' : 'База клиентов 🤝'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'he' ? 'ניהול קשרי לקוחות ומעקב עסקאות' : 'Управление отношениями с клиентами и сделками'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 glass rounded-2xl p-2 flex items-center">
          <form className="flex w-full" action="">
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder={locale === 'he' ? 'חפש לקוח...' : 'Поиск клиента...'}
              className="w-full bg-transparent border-none outline-none px-4 text-white text-sm"
            />
            <button className="rounded-xl gradient-brand px-6 py-2 text-sm font-bold text-white shrink-0">
              {locale === 'he' ? 'חפש' : 'Найти'}
            </button>
          </form>
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'lead', 'vip'].map((s) => (
            <Link
              key={s}
              href={`?status=${s}${searchQuery ? `&search=${searchQuery}` : ''}`}
              className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                (selectedStatus || 'all') === s
                  ? 'bg-primary text-white'
                  : 'glass text-muted-foreground hover:text-white'
              }`}
            >
              {s.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              <th className={`p-5 text-xs font-bold text-muted-foreground uppercase ${isRtl ? 'text-right' : ''}`}>{locale === 'he' ? 'שם לקוח' : 'Имя клиента'}</th>
              <th className={`p-5 text-xs font-bold text-muted-foreground uppercase ${isRtl ? 'text-right' : ''}`}>{locale === 'he' ? 'סטטוס' : 'Статус'}</th>
              <th className={`p-5 text-xs font-bold text-muted-foreground uppercase ${isRtl ? 'text-right' : ''}`}>{locale === 'he' ? 'נפח עסקאות' : 'Объем'}</th>
              <th className={`p-5 text-xs font-bold text-muted-foreground uppercase ${isRtl ? 'text-right' : ''}`}>{locale === 'he' ? 'עסקאות פתוחות' : 'Сделки'}</th>
              <th className={`p-5 text-xs font-bold text-muted-foreground uppercase ${isRtl ? 'text-right' : ''}`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clients.map((client) => (
              <tr key={client.id} className="transition hover:bg-white/2">
                <td className={`p-5 ${isRtl ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black shadow-inner">
                      {client.user.fullName?.[0].toUpperCase() || client.user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{client.user.fullName || '—'}</p>
                      <p className="text-xs text-muted-foreground">{client.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className={`p-5 ${isRtl ? 'text-right' : ''}`}>
                  <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full border ${
                    client.status === 'vip' ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' :
                    client.status === 'active' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' :
                    'border-white/10 text-muted-foreground'
                  }`}>
                    {client.status}
                  </span>
                </td>
                <td className={`p-5 ${isRtl ? 'text-right' : ''}`}>
                  <p className="font-mono text-sm text-white font-bold">₪{Number(client.totalVolume).toLocaleString()}</p>
                </td>
                <td className={`p-5 ${isRtl ? 'text-right' : ''}`}>
                  <p className="text-sm font-bold text-white">{client._count.deals}</p>
                </td>
                <td className={`p-5 text-right ${isRtl ? 'text-left' : ''}`}>
                   <Link
                      href={`/${locale}/crm/clients/${client.id}`}
                      className="rounded-xl gradient-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                    >
                      {locale === 'he' ? 'ניהול לקוח' : 'Управление'}
                    </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
