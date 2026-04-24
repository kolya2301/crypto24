import { getSession, isComplianceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AdminUserActions } from './AdminUserActions';

export default async function AdminUserDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale, id } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      kycProfile: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, asset: true, fiatAmount: true, fiatCurrency: true, status: true, createdAt: true },
      },
    },
  });

  if (!user) notFound();

  const kyc = user.kycProfile;

  const STATUS_HE: Record<string, string> = {
    completed: 'הושלם', pending_review: 'בבדיקה', awaiting_payment: 'ממתין תשלום',
    rejected: 'נדחה', cancelled: 'בוטל', submitted: 'הוגש', on_hold: 'מעוכב',
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-center justify-between flex-row-reverse">
        <h1 className="text-lg font-bold">פרופיל לקוח</h1>
        <Link href={`/${locale}/admin/users`} className="text-sm text-muted-foreground hover:text-foreground">← חזרה</Link>
      </div>

      {/* User info */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4 flex-row-reverse">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
            {(user.fullName ?? user.email)[0].toUpperCase()}
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        {[
          { label: 'טלפון', value: user.phone },
          { label: 'תפקיד', value: user.role },
          { label: 'סטטוס חשבון', value: user.status },
          { label: 'ציון סיכון', value: `${user.riskScore}/100` },
          { label: 'כניסה אחרונה', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('he-IL') : 'מעולם' },
          { label: 'נרשם', value: new Date(user.createdAt).toLocaleDateString('he-IL') },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-1.5 border-b border-white/5 last:border-0 flex-row-reverse">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm">{value}</span>
          </div>
        ))}
      </div>

      {/* KYC info */}
      {kyc && (
        <div className="glass rounded-2xl p-5 mb-4">
          <h3 className="font-semibold mb-3 text-right">אימות זהות (KYC)</h3>
          <div className="space-y-1.5">
            {[
              { label: 'סטטוס', value: kyc.status },
              { label: 'רמה', value: kyc.level },
              { label: 'תאריך לידה', value: kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString('he-IL') : '—' },
              { label: 'מספר ת"ז', value: kyc.idNumber ?? '—' },
              { label: 'עיר', value: kyc.city ?? '—' },
              { label: 'דגל Sanctions', value: kyc.sanctionsFlag ? '⚠️ כן' : 'לא' },
              { label: 'דגל PEP', value: kyc.pepFlag ? '⚠️ כן' : 'לא' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between flex-row-reverse">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-sm ${value.includes('⚠️') ? 'text-red-400' : ''}`}>{value}</span>
              </div>
            ))}
          </div>
          <AdminUserActions userId={id} kycStatus={kyc.status} locale={locale} />
        </div>
      )}

      {/* Recent orders */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="border-b border-white/8 px-5 py-3">
          <h3 className="font-semibold text-right">הזמנות אחרונות ({user.orders.length})</h3>
        </div>
        <div className="divide-y divide-white/5">
          {user.orders.map(order => (
            <Link
              key={order.id}
              href={`/${locale}/admin/orders/${order.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition flex-row-reverse"
            >
              <span className={`font-semibold text-sm ${order.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                {order.type === 'buy' ? '↓' : '↑'} {order.asset}
              </span>
              <span className="flex-1 text-sm text-right">₪{Number(order.fiatAmount).toLocaleString('he-IL')}</span>
              <span className="text-xs text-muted-foreground">{STATUS_HE[order.status] ?? order.status}</span>
            </Link>
          ))}
          {user.orders.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">אין הזמנות</div>
          )}
        </div>
      </div>
    </div>
  );
}
