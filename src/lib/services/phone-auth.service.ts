import { prisma } from '../prisma';
import { signToken } from '../auth';
import { audit, auditActions } from '../audit';
import { checkRateLimit, redisGet, redisSet, redisDel } from '../redis';
import { sendSms, generateOtpCode } from '../sms';

const OTP_TTL_SECONDS = 300; // 5 min
const OTP_MAX_VERIFY_ATTEMPTS = 5;
export const PLACEHOLDER_EMAIL_DOMAIN = '@phone.crypto24.internal';

function otpKey(phone: string) {
  return `phone_otp:${phone}`;
}

function placeholderEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export class PhoneAuthService {
  async requestOtp(phone: string, ip: string): Promise<void> {
    const rlIp = await checkRateLimit(`phone_otp_ip:${ip}`, 5, 900);
    if (!rlIp.allowed) throw new Error('RATE_LIMITED');

    const rlPhone = await checkRateLimit(`phone_otp_phone:${phone}`, 3, 300);
    if (!rlPhone.allowed) throw new Error('RATE_LIMITED');

    const code = generateOtpCode();
    await redisSet(otpKey(phone), { code, attempts: 0 }, OTP_TTL_SECONDS);
    await sendSms(phone, `crypto24: код подтверждения ${code}. Действителен 5 минут.`);
  }

  async verifyOtp(phone: string, code: string, ip: string, userAgent: string) {
    const rlIp = await checkRateLimit(`phone_verify_ip:${ip}`, 20, 900);
    if (!rlIp.allowed) throw new Error('RATE_LIMITED');

    const stored = await redisGet<{ code: string; attempts: number }>(otpKey(phone));
    if (!stored) throw new Error('OTP_EXPIRED');

    if (stored.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      await redisDel(otpKey(phone));
      throw new Error('OTP_TOO_MANY_ATTEMPTS');
    }

    if (stored.code !== code) {
      await redisSet(otpKey(phone), { ...stored, attempts: stored.attempts + 1 }, OTP_TTL_SECONDS);
      throw new Error('OTP_INVALID');
    }

    await redisDel(otpKey(phone));

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: placeholderEmail(phone),
          phone,
          fullName: phone,
          isPhoneVerified: true,
          role: 'registered_user',
          status: 'pending_verification',
          kycProfile: { create: {} },
        },
      });

      await audit({
        actorUserId: user.id, subjectUserId: user.id,
        entityType: 'user', entityId: user.id,
        action: auditActions.USER_REGISTERED,
        description: `New user registered via phone: ${phone}`,
        ipAddress: ip, userAgent,
      });
    } else if (!user.isPhoneVerified) {
      user = await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });
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
      description: 'Login via phone OTP',
      ipAddress: ip, userAgent,
    });

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const needsProfileCompletion = user.email.endsWith(PLACEHOLDER_EMAIL_DOMAIN);
    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser, needsProfileCompletion };
  }
}

export const phoneAuthService = new PhoneAuthService();
