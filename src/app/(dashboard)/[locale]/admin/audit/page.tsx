import { getSession, isComplianceOrAdmin, isFinanceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const ACTION_COLORS: Record<string, string> = {
  'order.submitted': 'bg-blue-500/10 text-blue-400',
  'order.approved': 'bg-emerald-500/10 text-emerald-400',
  'order.rejected': 'bg-red-500/10 text-red-400',
  'kyc.approved': 'bg-emerald-500/10 text-emerald-400',
  'kyc.rejected': 'bg-red-500/10 text-red-400',
  'user.suspended': 'bg-orange-500/10 text-orange-400',
  'payment.confirmed': 'bg-lime-500/10 text-lime-400',
};

export default async function AuditLogViewerPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session) && !isFinanceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const auditLogs = await prisma.auditLog.findMany({
    include: {
      actorUser: { select: { email: true, fullName: true } },
      subjectUser: { select: { email: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const isRtl = locale === 'he';

  return (
    <div className={`p-4 lg:p-8 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`mb-6 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-xl lg:text-2xl font-bold">
          {isRtl ? '📋 לוג ביקורת' : '📋 Audit Log'}
        </h1>
        <div className="text-sm text-muted-foreground">
          {auditLogs.length} {isRtl ? 'פעולות' : 'actions'}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className={`px-4 py-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'פעולה' : 'Action'}
                </th>
                <th className={`px-4 py-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'בוצע על ידי' : 'By'}
                </th>
                <th className={`px-4 py-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'על' : 'Subject'}
                </th>
                <th className={`px-4 py-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'סוג' : 'Type'}
                </th>
                <th className={`px-4 py-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'תאריך' : 'Date'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/3 transition">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'text-muted-foreground'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">
                      {log.actorUser?.fullName || log.actorUser?.email || (log.actorRole ?? 'System')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">
                      {log.subjectUser?.fullName || log.subjectUser?.email || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{log.entityType || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
