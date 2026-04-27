import { NextRequest } from 'next/server';
import { getSessionFromRequest, isComplianceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, forbidden, badRequest, notFound } from '@/lib/api-response';
import { UserRole, UserStatus } from '@prisma/client';
import { audit, auditActions } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session)) return forbidden();

  const { id } = params;
  const body = await req.json();
  const { action, value, notes } = body as { action: string; value: string; notes?: string };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFound('User not found');

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  switch (action) {
    case 'set_role': {
      if (!Object.values(UserRole).includes(value as UserRole)) return badRequest('Invalid role');
      // Only admin can set admin role
      if (value === UserRole.admin && session.role !== UserRole.admin) return forbidden('Only admins can assign admin role');
      const updated = await prisma.user.update({ where: { id }, data: { role: value as UserRole } });
      await audit({
        actorUserId: session.sub, actorRole: session.role,
        subjectUserId: id, entityType: 'user', entityId: id,
        action: 'user.role_changed',
        description: `Role changed from ${user.role} to ${value}. ${notes ?? ''}`,
        beforeJson: { role: user.role }, afterJson: { role: value },
        ipAddress: ip,
      });
      return ok({ user: updated });
    }

    case 'set_status': {
      if (!Object.values(UserStatus).includes(value as UserStatus)) return badRequest('Invalid status');
      const updated = await prisma.user.update({ where: { id }, data: { status: value as UserStatus } });
      await audit({
        actorUserId: session.sub, actorRole: session.role,
        subjectUserId: id, entityType: 'user', entityId: id,
        action: 'user.status_changed',
        description: `Status changed from ${user.status} to ${value}. ${notes ?? ''}`,
        beforeJson: { status: user.status }, afterJson: { status: value },
        ipAddress: ip,
      });
      return ok({ user: updated });
    }

    case 'set_risk_score': {
      const score = parseInt(value, 10);
      if (isNaN(score) || score < 0 || score > 100) return badRequest('Risk score must be 0–100');
      const updated = await prisma.user.update({ where: { id }, data: { riskScore: score } });
      await audit({
        actorUserId: session.sub, actorRole: session.role,
        subjectUserId: id, entityType: 'user', entityId: id,
        action: 'user.risk_score_changed',
        description: `Risk score changed from ${user.riskScore} to ${score}. ${notes ?? ''}`,
        beforeJson: { riskScore: user.riskScore }, afterJson: { riskScore: score },
        ipAddress: ip,
      });
      return ok({ user: updated });
    }

    case 'add_note': {
      if (!notes) return badRequest('Note required');
      await audit({
        actorUserId: session.sub, actorRole: session.role,
        subjectUserId: id, entityType: 'user', entityId: id,
        action: 'user.note_added',
        description: notes,
        ipAddress: ip,
      });
      return ok({ ok: true });
    }

    default:
      return badRequest('Unknown action');
  }
}
