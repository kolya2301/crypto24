import { prisma } from '../prisma';
import { signToken } from '../auth';
import { audit, auditActions } from '../audit';
import type { OAuthProfile } from '../oauth';

type OAuthProviderName = 'google' | 'apple';

export async function loginOrRegisterViaOAuth(
  provider: OAuthProviderName,
  profile: OAuthProfile,
  ip: string,
  userAgent: string,
) {
  const providerField = provider === 'google' ? 'googleId' : 'appleId';
  const email = profile.email.toLowerCase().trim();

  let user = await prisma.user.findFirst({ where: { [providerField]: profile.providerId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    if (existingByEmail) {
      if (!profile.emailVerified) throw new Error('EMAIL_NOT_VERIFIED_BY_PROVIDER');
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { [providerField]: profile.providerId },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          fullName: profile.name,
          passwordHash: null,
          phone: null,
          isEmailVerified: profile.emailVerified,
          role: 'registered_user',
          status: 'pending_verification',
          [providerField]: profile.providerId,
          kycProfile: { create: {} },
        },
      });

      await audit({
        actorUserId: user.id, subjectUserId: user.id,
        entityType: 'user', entityId: user.id,
        action: auditActions.USER_REGISTERED,
        description: `New user registered via ${provider}: ${user.email}`,
        ipAddress: ip, userAgent,
      });
    }
  }

  if (user.status === 'suspended' || user.status === 'deactivated') {
    throw new Error('ACCOUNT_DISABLED');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  await prisma.sessionLog.create({
    data: { userId: user.id, ipAddress: ip, userAgent, action: 'login' },
  });

  await audit({
    actorUserId: user.id, subjectUserId: user.id,
    entityType: 'user', entityId: user.id,
    action: auditActions.USER_LOGIN,
    description: `Login via ${provider}`,
    ipAddress: ip, userAgent,
  });

  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  const needsProfileCompletion = !user.phone;

  return { token, needsProfileCompletion };
}
