import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { signToken } from '../auth';
import { audit, auditActions } from '../audit';
import { checkRateLimit } from '../redis';

export interface RegisterInput {
  email: string;
  password: string;
  phone: string;
  fullName: string;
  residencyCountry?: string;
}

export class AuthService {
  async register(input: RegisterInput, ip: string, userAgent: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new Error('EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        phone: input.phone,
        passwordHash,
        fullName: input.fullName,
        residencyCountry: input.residencyCountry ?? 'IL',
        role: 'registered_user',
        status: 'pending_verification',
        kycProfile: { create: {} },
      },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true, createdAt: true,
      },
    });

    await audit({
      actorUserId: user.id,
      subjectUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: auditActions.USER_REGISTERED,
      description: `New user registered: ${user.email}`,
      ipAddress: ip,
      userAgent,
    });

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    return { user, token };
  }

  async login(email: string, password: string, ip: string, userAgent: string) {
    // Rate limit: 10 attempts per 15 min per IP
    const rl = await checkRateLimit(`login:${ip}`, 10, 900);
    if (!rl.allowed) throw new Error('RATE_LIMITED');

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      await audit({
        action: auditActions.USER_LOGIN_FAILED,
        description: `Failed login attempt for ${email}`,
        ipAddress: ip, userAgent,
        afterJson: { email, reason: 'invalid_credentials' },
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    if (user.status === 'suspended' || user.status === 'deactivated') {
      await audit({
        actorUserId: user.id, subjectUserId: user.id,
        action: auditActions.USER_LOGIN_FAILED,
        description: `Login blocked — account ${user.status}`,
        ipAddress: ip, userAgent,
      });
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
      ipAddress: ip, userAgent,
    });

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true, residencyCountry: true,
        isEmailVerified: true, isPhoneVerified: true,
        lastLoginAt: true, createdAt: true,
        kycProfile: {
          select: { status: true, level: true, submittedAt: true, reviewedAt: true, expiresAt: true },
        },
      },
    });
    return user;
  }
}

export const authService = new AuthService();
