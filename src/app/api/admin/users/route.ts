import { NextRequest } from 'next/server';
import { getSessionFromRequest, isComplianceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, forbidden } from '@/lib/api-response';
import { KycStatus, UserStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session)) return forbidden();

  const sp = req.nextUrl.searchParams;
  const kycStatus = sp.get('kycStatus') as KycStatus | undefined;
  const userStatus = sp.get('status') as UserStatus | undefined;
  const search = sp.get('search');
  const page = parseInt(sp.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);

  const where = {
    ...(kycStatus && { kycProfile: { status: kycStatus } }),
    ...(userStatus && { status: userStatus }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true, riskScore: true,
        lastLoginAt: true, createdAt: true,
        kycProfile: { select: { status: true, level: true, submittedAt: true, sanctionsFlag: true, pepFlag: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ users, total, page, limit, pages: Math.ceil(total / limit) });
}
