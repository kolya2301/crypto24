import { getSession } from '@/lib/auth';
import { ExchangeWidget } from '@/components/exchange/ExchangeWidget';
import Link from 'next/link';

type Locale = 'he' | 'ru' | 'en' | 'ar';

const copy: Record<Locale, {
  badge: string; h1a: string; h1b: string; h1c: string; sub: string;
  s1v: string; s1l: string; s2v: string; s2l: string; s3v: string; s3l: string;
  howTitle: string; how1t: string; how1d: string; how2t: string; how2d: string; how3t: string; how3d: string; how4t: string; how4d: string;
  assetsTitle: string; assetsSub: string; buyBtn: string;
  whyTitle: string; w1t: string; w1d: string; w2t: string; w2d: string; w3t: string; w3d: string; w4t: string; w4d: string;
  ctaH: string; ctaSub: string; ctaBtn: string;
  footerRights: string; footerSub: string;
}> = {
  he: {
    badge: '🇮🇱 עסק מוסדר ומורשה בישראל',
    h1a: 'קנה ומכור', h1b: 'קריפטו', h1c: 'בצורה חוקית ובטוחה',
    sub: 'פלטפורמה מוסדרת לקנייה ומכירה של ביטקוין, אתריום, USDT ועוד — עם אימות זהות מלא ועמלות שקופות.',
    s1v: '₪14M+', s1l: 'נפח מסחר', s2v: '1,200+', s2l: 'לקוחות מאומתים', s3v: '5', s3l: 'מטבעות',
    howTitle: 'איך זה עובד',
    how1t: 'הרשמה', how1d: 'צור חשבון ועבור KYC תוך דקות',
    how2t: 'הצעת מחיר', how2d: 'קבל שער חי עם עמלות שקופות — תקף 5 דקות',
    how3t: 'תשלום', how3d: 'שלם דרך Bit, PayBox או העברת קריפטו',
    how4t: 'קבלה', how4d: 'המטבעות מגיעים לארנק שלך תוך שעות',
    assetsTitle: 'נכסים נתמכים', assetsSub: 'Bitcoin, Ethereum, USDT, Solana, Litecoin', buyBtn: 'קנה',
    whyTitle: 'למה crypto24',
    w1t: '🏛️ רגולציה מלאה', w1d: 'עסק רשום רשמית בישראל עם ציות מלא לחוקי AML/KYC',
    w2t: '⚡ מהירות שיא', w2d: 'עסקאות מאושרות תוך שעות, לא ימים',
    w3t: '💡 מחירים שקופים', w3d: 'אין עמלות נסתרות — הכל גלוי לפני הביצוע',
    w4t: '🔒 אבטחה מקסימלית', w4d: 'הצפנת AES-256, 2FA ואחסון קר לכל הנכסים',
    ctaH: 'מוכן להתחיל?', ctaSub: 'הרשמה חינמית — KYC פשוט ומהיר', ctaBtn: 'פתח חשבון עכשיו',
    footerRights: 'כל הזכויות שמורות', footerSub: 'פלטפורמה מוסדרת לפי חוק שירותי תשלום, ישראל | AML/KYC מלא',
  },
  ru: {
    badge: '🇮🇱 Лицензированный бизнес в Израиле',
    h1a: 'Покупайте и продавайте', h1b: 'криптовалюту', h1c: 'легально и безопасно',
    sub: 'Регулируемая платформа для покупки и продажи Bitcoin, Ethereum, USDT и других — с полной верификацией и прозрачными комиссиями.',
    s1v: '₪14M+', s1l: 'Объём торгов', s2v: '1 200+', s2l: 'Верифицированных клиентов', s3v: '5', s3l: 'Монет',
    howTitle: 'Как это работает',
    how1t: 'Регистрация', how1d: 'Создайте аккаунт и пройдите KYC за несколько минут',
    how2t: 'Котировка', how2d: 'Получите живой курс с прозрачными комиссиями — действует 5 минут',
    how3t: 'Оплата', how3d: 'Оплатите через Bit, PayBox или крипто-переводом',
    how4t: 'Получение', how4d: 'Монеты поступят на ваш кошелёк в течение нескольких часов',
    assetsTitle: 'Поддерживаемые активы', assetsSub: 'Bitcoin, Ethereum, USDT, Solana, Litecoin', buyBtn: 'Купить',
    whyTitle: 'Почему crypto24',
    w1t: '🏛️ Полная регуляция', w1d: 'Официально зарегистрированный бизнес в Израиле с соответствием AML/KYC',
    w2t: '⚡ Максимальная скорость', w2d: 'Сделки одобряются за часы, не за дни',
    w3t: '💡 Прозрачные цены', w3d: 'Никаких скрытых комиссий — всё видно до исполнения',
    w4t: '🔒 Высокая безопасность', w4d: 'Шифрование AES-256, 2FA и холодное хранение активов',
    ctaH: 'Готовы начать?', ctaSub: 'Бесплатная регистрация — быстрая KYC-верификация', ctaBtn: 'Открыть счёт сейчас',
    footerRights: 'Все права защищены', footerSub: 'Регулируемая платформа по законодательству Израиля | AML/KYC',
  },
  en: {
    badge: '🇮🇱 Licensed Business in Israel',
    h1a: 'Buy and sell', h1b: 'crypto', h1c: 'legally and securely',
    sub: 'A regulated platform for buying and selling Bitcoin, Ethereum, USDT and more — with full KYC and transparent fees.',
    s1v: '₪14M+', s1l: 'Trading Volume', s2v: '1,200+', s2l: 'Verified Clients', s3v: '5', s3l: 'Coins',
    howTitle: 'How It Works',
    how1t: 'Register', how1d: 'Create your account and complete KYC in minutes',
    how2t: 'Get Quote', how2d: 'Receive a live rate with transparent fees — valid 5 minutes',
    how3t: 'Pay', how3d: 'Pay via Bit, PayBox or direct crypto transfer',
    how4t: 'Receive', how4d: 'Coins arrive in your wallet within hours',
    assetsTitle: 'Supported Assets', assetsSub: 'Bitcoin, Ethereum, USDT, Solana, Litecoin', buyBtn: 'Buy',
    whyTitle: 'Why crypto24',
    w1t: '🏛️ Full Regulation', w1d: 'Officially registered in Israel with full AML/KYC compliance',
    w2t: '⚡ Top Speed', w2d: 'Trades approved in hours, not days',
    w3t: '💡 Transparent Pricing', w3d: 'No hidden fees — everything visible before execution',
    w4t: '🔒 Max Security', w4d: 'AES-256 encryption, 2FA and cold storage for all assets',
    ctaH: 'Ready to Start?', ctaSub: 'Free registration — simple and fast KYC', ctaBtn: 'Open Account Now',
    footerRights: 'All rights reserved', footerSub: 'Regulated platform under Israeli Payment Services Law | AML/KYC',
  },
  ar: {
    badge: '🇮🇱 شركة مرخّصة في إسرائيل',
    h1a: 'اشترِ وبِع', h1b: 'العملات الرقمية', h1c: 'بشكل قانوني وآمن',
    sub: 'منصة منظّمة لشراء وبيع البيتكوين والإيثيريوم و USDT والمزيد — مع التحقق الكامل من الهوية ورسوم شفافة.',
    s1v: '₪14M+', s1l: 'حجم التداول', s2v: '1,200+', s2l: 'عملاء موثّقون', s3v: '5', s3l: 'عملات',
    howTitle: 'كيف يعمل',
    how1t: 'التسجيل', how1d: 'أنشئ حسابك وأكمل KYC في دقائق',
    how2t: 'الحصول على سعر', how2d: 'احصل على سعر لحظي مع رسوم شفافة — صالح 5 دقائق',
    how3t: 'الدفع', how3d: 'ادفع عبر Bit أو PayBox أو تحويل مباشر',
    how4t: 'الاستلام', how4d: 'تصل العملات إلى محفظتك خلال ساعات',
    assetsTitle: 'الأصول المدعومة', assetsSub: 'Bitcoin, Ethereum, USDT, Solana, Litecoin', buyBtn: 'اشترِ',
    whyTitle: 'لماذا crypto24',
    w1t: '🏛️ تنظيم كامل', w1d: 'شركة مسجلة رسمياً في إسرائيل مع الامتثال الكامل لمعايير AML/KYC',
    w2t: '⚡ سرعة قصوى', w2d: 'الصفقات معتمدة خلال ساعات، وليس أياماً',
    w3t: '💡 أسعار شفافة', w3d: 'لا رسوم خفية — كل شيء واضح قبل التنفيذ',
    w4t: '🔒 أمان أقصى', w4d: 'تشفير AES-256، مصادقة ثنائية وتخزين بارد',
    ctaH: 'هل أنت مستعد؟', ctaSub: 'تسجيل مجاني — KYC سريع وسهل', ctaBtn: 'افتح حساباً الآن',
    footerRights: 'جميع الحقوق محفوظة', footerSub: 'منصة منظَّمة بموجب قانون خدمات الدفع الإسرائيلي | AML/KYC',
  },
};

const ASSETS = [
  { id: 'BTC',  ticker: 'BTC',  name: 'Bitcoin',  icon: '₿', color: '#f97316' },
  { id: 'ETH',  ticker: 'ETH',  name: 'Ethereum', icon: 'Ξ', color: '#6366f1' },
  { id: 'USDT', ticker: 'USDT', name: 'Tether',   icon: '₮', color: '#10b981' },
  { id: 'SOL',  ticker: 'SOL',  name: 'Solana',   icon: '◎', color: '#a855f7' },
  { id: 'LTC',  ticker: 'LTC',  name: 'Litecoin', icon: 'Ł', color: '#94a3b8' },
];

const STEPS = [
  { icon: '📱', grad: 'linear-gradient(135deg,#3b82f6,#60a5fa)', glow: 'rgba(59,130,246,0.3)' },
  { icon: '💹', grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)', glow: 'rgba(124,58,237,0.3)' },
  { icon: '💳', grad: 'linear-gradient(135deg,#059669,#34d399)', glow: 'rgba(5,150,105,0.3)' },
  { icon: '🎉', grad: 'linear-gradient(135deg,#d97706,#fbbf24)', glow: 'rgba(217,119,6,0.3)' },
];

export default async function HomePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  const c = copy[locale as Locale] ?? copy.he;
  const isRtl = locale === 'he' || locale === 'ar';

  const steps = [
    { title: c.how1t, desc: c.how1d, ...STEPS[0] },
    { title: c.how2t, desc: c.how2d, ...STEPS[1] },
    { title: c.how3t, desc: c.how3d, ...STEPS[2] },
    { title: c.how4t, desc: c.how4d, ...STEPS[3] },
  ];

  const why = [
    { title: c.w1t, desc: c.w1d, border: 'rgba(59,130,246,0.2)', bg: 'rgba(59,130,246,0.06)' },
    { title: c.w2t, desc: c.w2d, border: 'rgba(16,185,129,0.2)', bg: 'rgba(16,185,129,0.06)' },
    { title: c.w3t, desc: c.w3d, border: 'rgba(168,85,247,0.2)', bg: 'rgba(168,85,247,0.06)' },
    { title: c.w4t, desc: c.w4d, border: 'rgba(245,158,11,0.2)', bg: 'rgba(245,158,11,0.06)' },
  ];

  return (
    <div dir="ltr" style={{ overflowX: 'hidden' }}>
      <style>{`
        .hero-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
        @media (min-width: 768px) { .hero-grid { grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; } }
        .steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 768px) { .steps-grid { grid-template-columns: repeat(4,1fr); } }
        .assets-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        @media (min-width: 480px) { .assets-grid { grid-template-columns: repeat(4,1fr); } }
        .why-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 768px) { .why-grid { grid-template-columns: repeat(4,1fr); } }
        .ticker-wrap { overflow: hidden; }
        .ticker { display: flex; width: max-content; animation: ticker 32s linear infinite; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        .stat-item { text-align: ${isRtl ? 'right' : 'left'}; }
        .section-title { text-align: ${isRtl ? 'right' : 'center'}; }
        .hero-text { direction: ${isRtl ? 'rtl' : 'ltr'}; text-align: ${isRtl ? 'right' : 'left'}; }
        .hero-badges { display: flex; flex-wrap: wrap; gap: 8px; justify-content: ${isRtl ? 'flex-end' : 'flex-start'}; }
        .step-card { direction: ${isRtl ? 'rtl' : 'ltr'}; }
        .why-card { direction: ${isRtl ? 'rtl' : 'ltr'}; }
        .footer-inner { display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 640px) { .footer-inner { flex-direction: row; align-items: center; justify-content: space-between; } }
        .cta-notes { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse 100% 70% at 15% -10%, rgba(30,127,255,0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 85% 100%, rgba(107,63,255,0.14) 0%, transparent 55%), #050c18',
        minHeight: '90vh', display: 'flex', alignItems: 'center',
      }}>
        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -100, left: -50, width: 500, height: 500, borderRadius: '50%', background: 'rgba(30,127,255,0.08)', filter: 'blur(100px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -40, width: 400, height: 400, borderRadius: '50%', background: 'rgba(107,63,255,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '64px 20px', width: '100%' }}>
          <div className="hero-grid">
            {/* Text — first on mobile, left on desktop */}
            <div className="hero-text" style={{ order: isRtl ? 1 : 0 }}>
              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid rgba(30,127,255,0.25)', background: 'rgba(30,127,255,0.08)', padding: '6px 16px', fontSize: 13, color: '#93c5fd', marginBottom: 24, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                {c.badge}
              </div>

              {/* H1 */}
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20, color: '#fff' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>{c.h1a} </span>
                <span style={{ background: 'linear-gradient(135deg,#1e7fff,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{c.h1b}</span>
                <br />
                <span>{c.h1c}</span>
              </h1>

              <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 32, maxWidth: 480 }}>
                {c.sub}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 28 }}>
                {[{ v: c.s1v, l: c.s1l }, { v: c.s2v, l: c.s2l }, { v: c.s3v, l: c.s3l }].map(s => (
                  <div key={s.l} className="stat-item">
                    <div style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 500 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Trust badges */}
              <div className="hero-badges">
                {[
                  { text: isRtl ? '🏛️ רגולציה ישראלית' : '🏛️ IL Regulated', color: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', fg: '#93c5fd' },
                  { text: '✅ KYC / AML', color: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', fg: '#6ee7b7' },
                  { text: '🔒 AES-256', color: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', fg: '#d8b4fe' },
                ].map(b => (
                  <span key={b.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: b.color, border: `1px solid ${b.border}`, fontSize: 12, fontWeight: 600, color: b.fg }}>
                    {b.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Widget — second on mobile, right on desktop */}
            <div style={{ display: 'flex', justifyContent: 'center', order: isRtl ? 0 : 1 }}>
              <ExchangeWidget locale={locale} isLoggedIn={!!session} />
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ───────────────────────────────────────────────────────────── */}
      <div className="ticker-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: '14px 0' }}>
        <div className="ticker">
          {[...ASSETS, ...ASSETS, ...ASSETS].map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}22`, border: `1px solid ${a.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: a.color, fontWeight: 700 }}>
                {a.icon}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{a.ticker}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(60px, 8vw, 100px) 20px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="section-title" style={{ marginBottom: 48, direction: isRtl ? 'rtl' : 'ltr' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(30,127,255,0.7)', marginBottom: 8 }}>
              {isRtl ? 'תהליך' : 'Process'}
            </p>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: 0 }}>{c.howTitle}</h2>
          </div>

          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={i} className="step-card" style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: 'clamp(16px, 3vw, 24px)',
                boxShadow: `0 0 40px ${step.glow}`,
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: step.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: `0 4px 14px ${step.glow}` }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(255,255,255,0.06)', lineHeight: 1 }}>0{i + 1}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ASSETS ───────────────────────────────────────────────────────────── */}
      <section id="assets" style={{ padding: 'clamp(60px, 8vw, 100px) 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="section-title" style={{ marginBottom: 40, direction: isRtl ? 'rtl' : 'ltr' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>{c.assetsTitle}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0 }}>{c.assetsSub}</p>
          </div>

          <div className="assets-grid">
            {ASSETS.map(a => (
              <div key={a.id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
                transition: 'all 0.2s',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${a.color}20`, border: `1px solid ${a.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: a.color, boxShadow: `0 8px 20px ${a.color}30` }}>
                  {a.icon}
                </div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14, color: '#fff', margin: '0 0 3px' }}>{a.ticker}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{a.name}</p>
                </div>
                <Link href={`/${locale}/orders/new`} style={{
                  width: '100%', padding: '9px 0', borderRadius: 12, textAlign: 'center', textDecoration: 'none',
                  fontSize: 13, fontWeight: 700, color: a.color,
                  background: `${a.color}18`, border: `1px solid ${a.color}35`,
                  display: 'block',
                }}>
                  {c.buyBtn}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ───────────────────────────────────────────────────────────── */}
      <section id="about" style={{ padding: 'clamp(60px, 8vw, 100px) 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="section-title" style={{ marginBottom: 40, direction: isRtl ? 'rtl' : 'ltr' }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: 0 }}>{c.whyTitle}</h2>
          </div>
          <div className="why-grid">
            {why.map((item, i) => (
              <div key={i} className="why-card" style={{
                background: item.bg, border: `1px solid ${item.border}`,
                borderRadius: 20, padding: 'clamp(16px, 3vw, 24px)',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8, marginTop: 0 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      {!session && (
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{
              position: 'relative', overflow: 'hidden', borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(145deg, rgba(30,127,255,0.1), rgba(107,63,255,0.08), rgba(255,255,255,0.02))',
              padding: 'clamp(32px, 6vw, 56px) clamp(24px, 5vw, 48px)',
              textAlign: 'center',
            }}>
              <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'rgba(30,127,255,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
                <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#fff', marginBottom: 12 }}>{c.ctaH}</h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>{c.ctaSub}</p>
                <Link href={`/${locale}/register`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '16px 36px', borderRadius: 16, textDecoration: 'none',
                  fontSize: 16, fontWeight: 800, color: '#fff',
                  background: 'linear-gradient(135deg,#1e7fff,#6b3fff)',
                  boxShadow: '0 12px 32px rgba(30,127,255,0.4)',
                }}>
                  {c.ctaBtn}
                  <span style={{ fontSize: 20 }}>{isRtl ? '←' : '→'}</span>
                </Link>
                <div className="cta-notes" style={{ marginTop: 20 }}>
                  {['✅ ' + (isRtl ? 'חינם' : 'Бесплатно'), '🔒 ' + (isRtl ? 'מאובטח' : 'Безопасно'), '⚡ ' + (isRtl ? 'אישור מהיר' : 'Быстрое одобрение')].map(n => (
                    <span key={n} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(32px, 5vw, 48px) 20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="footer-inner">
            {/* Logo */}
            <Link href={`/${locale}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#1e7fff,#6b3fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(30,127,255,0.3)' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>24</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>
                crypto<span style={{ background: 'linear-gradient(135deg,#1e7fff,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24</span>
              </span>
            </Link>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, textAlign: isRtl ? 'left' : 'right' }}>
              <p style={{ margin: '0 0 4px' }}>© {new Date().getFullYear()} crypto24. {c.footerRights}.</p>
              <p style={{ margin: 0, opacity: 0.7 }}>{c.footerSub}.</p>
            </div>
          </div>
        </div>
      </footer>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
