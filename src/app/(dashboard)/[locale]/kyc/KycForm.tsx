'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AiVerifyResult {
  passed: boolean;
  idNumberMatch: boolean;
  dobMatch: boolean;
  isValidDocument: boolean;
  notes: string;
}

interface Props {
  locale: string;
  existingProfile?: {
    dateOfBirth: string;
    city: string;
    country: string;
    sourceOfFunds: string;
  };
}

const SOURCE_OPTIONS = {
  he: ['שכר', 'עסקים', 'השקעות', 'חסכונות', 'אחר'],
  ru: ['Зарплата', 'Бизнес', 'Инвестиции', 'Накопления', 'Другое'],
};
const SOURCE_VALUES = ['salary', 'business', 'investment', 'savings', 'other'];

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const RU_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const L = {
  he: {
    title: 'הגשת בקשת KYC',
    idType: 'סוג מסמך זהות', idTypeIL: 'ת.ז. ישראלית', idTypePassport: 'דרכון',
    idNumber: 'מספר ת.ז./דרכון',
    address: 'כתובת', city: 'עיר', postalCode: 'מיקוד', country: 'מדינה',
    sourceOfFunds: 'מקור הכנסה', sourceNote: 'פרט מקור הכנסה',
    docsTitle: 'העלאת מסמך זהות',
    docsFront: 'צד קדמי של ת.ז.', docsBack: 'צד אחורי של ת.ז.', docsPassport: 'עמוד ראשי של דרכון',
    docsHint: 'לחץ להעלאה — JPG, PNG עד 10MB',
    aiVerifying: '🔍 בודק מסמכים עם AI...',
    aiPassed: '✓ המסמכים אומתו בהצלחה על ידי AI',
    aiFailed: '⚠ לא הצלחנו לאמת את הנתונים. ודא שהמסמך ברור וקריא.',
    aiSkipped: '',
    submit: 'הגש לבדיקה', loading: 'שולח...',
    success: 'הבקשה הוגשה בהצלחה!',
    error: 'שגיאה. נסה שוב.',
    docNote: 'הגשת הבקשה תישלח לצוות לאימות. תקבל עדכון תוך 1-3 ימי עסקים.',
  },
  ru: {
    title: 'Подача заявки KYC',
    idType: 'Тип документа', idTypeIL: 'Израильское удостоверение (Теудат Зеут)', idTypePassport: 'Паспорт',
    idNumber: 'Номер удостоверения / паспорта',
    address: 'Адрес', city: 'Город', postalCode: 'Почтовый индекс', country: 'Страна',
    sourceOfFunds: 'Источник доходов', sourceNote: 'Укажите источник',
    docsTitle: 'Загрузка документов',
    docsFront: 'Лицевая сторона удостоверения', docsBack: 'Обратная сторона удостоверения', docsPassport: 'Главная страница паспорта',
    docsHint: 'Нажмите для загрузки — JPG, PNG до 10MB',
    aiVerifying: '🔍 Проверка документов AI...',
    aiPassed: '✓ Документы успешно верифицированы AI',
    aiFailed: '⚠ Не удалось верифицировать данные. Убедитесь, что документ чёткий и читаемый.',
    aiSkipped: '',
    submit: 'Подать на проверку', loading: 'Отправка...',
    success: 'Заявка успешно подана!',
    error: 'Ошибка. Попробуйте снова.',
    docNote: 'Заявка будет отправлена команде на проверку. Вы получите ответ в течение 1-3 рабочих дней.',
  },
};

const inp: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: 'white', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const lbl: React.CSSProperties = {
  display: 'block', color: '#94a3b8',
  fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
  marginBottom: 8, textTransform: 'uppercase',
};

function FileZone({ label, file, onChange, hint }: {
  label: string; file: File | null;
  onChange: (f: File | null) => void; hint: string;
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, cursor: 'pointer', padding: '14px',
        background: file ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)',
        border: `1.5px dashed ${file ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 10, color: file ? '#34d399' : '#64748b', fontSize: 13,
        textAlign: 'center', minHeight: 52, transition: 'all 0.2s',
      }}>
        <input type="file" accept="image/jpeg,image/png,image/webp"
          onChange={e => onChange(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }} />
        {file ? `✓ ${file.name}` : hint}
      </label>
    </div>
  );
}

export function KycForm({ locale, existingProfile }: Props) {
  const t = L[locale as 'he' | 'ru'] ?? L.he;
  const router = useRouter();
  const isRtl = locale === 'he';
  const months = locale === 'he' ? HE_MONTHS : RU_MONTHS;
  const sourceOpts = SOURCE_OPTIONS[locale as 'he' | 'ru'] ?? SOURCE_OPTIONS.he;

  const [form, setForm] = useState({
    dateOfBirth: existingProfile?.dateOfBirth ?? '',
    idType: 'il_id',
    idNumber: '',
    address: '',
    city: existingProfile?.city ?? '',
    postalCode: '',
    country: existingProfile?.country ?? 'IL',
    sourceOfFunds: existingProfile?.sourceOfFunds ?? 'salary',
    sourceOfFundsNote: '',
  });
  const [docs, setDocs] = useState<{ front: File | null; back: File | null }>({ front: null, back: null });
  const [loading, setLoading] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiResult, setAiResult] = useState<AiVerifyResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateDob(part: 'y' | 'm' | 'd', value: string) {
    const [y, m, d] = form.dateOfBirth.split('-');
    const next = {
      y: part === 'y' ? value : (y || '2000'),
      m: part === 'm' ? value : (m || '01'),
      d: part === 'd' ? value : (d || '01'),
    };
    if (next.y && next.m && next.d) {
      update('dateOfBirth', `${next.y}-${next.m}-${next.d}`);
    } else if (part === 'y') {
      update('dateOfBirth', `${value}-${m || '01'}-${d || '01'}`);
    }
  }

  async function uploadDoc(file: File, docType: string) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', docType);
    await fetch('/api/kyc/documents', { method: 'POST', body: fd });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAiResult(null);

    try {
      // 1. Upload documents
      if (docs.front) {
        await uploadDoc(docs.front, form.idType === 'il_id' ? 'id_front' : 'passport');
      }
      if (docs.back && form.idType === 'il_id') {
        await uploadDoc(docs.back, 'id_back');
      }

      // 2. Submit form data
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t.error); return; }

      // 3. AI verify if documents uploaded
      if (docs.front) {
        setAiVerifying(true);
        const fd = new FormData();
        fd.append('idFront', docs.front);
        if (docs.back) fd.append('idBack', docs.back);
        fd.append('idNumber', form.idNumber);
        fd.append('dateOfBirth', form.dateOfBirth);
        try {
          const aiRes = await fetch('/api/kyc/ai-verify', { method: 'POST', body: fd });
          if (aiRes.ok) setAiResult(await aiRes.json());
        } catch {
          // AI verify failure is non-critical — form is already submitted
        } finally {
          setAiVerifying(false);
        }
      }

      setSuccess(true);
      setTimeout(() => router.refresh(), 2000);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
      setAiVerifying(false);
    }
  }

  if (success) {
    return (
      <div style={{
        background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)',
        borderRadius: 20, padding: '48px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ color: '#34d399', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{t.success}</p>
        {aiResult && (
          <p style={{
            fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 8,
            background: aiResult.passed ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
            color: aiResult.passed ? '#34d399' : '#fbbf24',
            border: `1px solid ${aiResult.passed ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}`,
          }}>
            {aiResult.passed ? t.aiPassed : t.aiFailed}
          </p>
        )}
      </div>
    );
  }

  const [dobY, dobM, dobD] = form.dateOfBirth.split('-');
  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <form onSubmit={handleSubmit} dir={dir} style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20, padding: '24px',
      display: 'flex', flexDirection: 'column', gap: 18,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>{t.title}</h2>

      {/* Date of birth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.2fr', gap: 12 }}>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{locale === 'he' ? 'יום' : 'День'}</label>
          <select value={dobD || ''} onChange={e => updateDob('d', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">{locale === 'he' ? 'יום' : 'День'}</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={String(d).padStart(2, '0')} style={{ background: '#0f172a' }}>
                {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{locale === 'he' ? 'חודש' : 'Месяц'}</label>
          <select value={dobM || ''} onChange={e => updateDob('m', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">{locale === 'he' ? 'חודש' : 'Месяц'}</option>
            {months.map((m, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')} style={{ background: '#0f172a' }}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{locale === 'he' ? 'שנה' : 'Год'}</label>
          <select value={dobY || ''} onChange={e => updateDob('y', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">{locale === 'he' ? 'שנה' : 'Год'}</option>
            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map(y => (
              <option key={y} value={y} style={{ background: '#0f172a' }}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ID type + number */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.idType}</label>
          <select value={form.idType} onChange={e => update('idType', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="il_id" style={{ background: '#0f172a' }}>{t.idTypeIL}</option>
            <option value="passport" style={{ background: '#0f172a' }}>{t.idTypePassport}</option>
          </select>
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.idNumber}</label>
          <input type="text" value={form.idNumber} onChange={e => update('idNumber', e.target.value)}
            required style={inp} placeholder="000000000" />
        </div>
      </div>

      {/* Address */}
      <div>
        <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.address}</label>
        <input type="text" value={form.address} onChange={e => update('address', e.target.value)}
          required style={inp} placeholder={locale === 'he' ? 'רחוב ומספר' : 'Улица и номер'} />
      </div>

      {/* City / Postal / Country */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.5fr', gap: 12 }}>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.city}</label>
          <input type="text" value={form.city} onChange={e => update('city', e.target.value)} required style={inp} />
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.postalCode}</label>
          <input type="text" value={form.postalCode} onChange={e => update('postalCode', e.target.value)}
            required style={inp} placeholder="0000000" />
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.country}</label>
          <input type="text" value={form.country} onChange={e => update('country', e.target.value)}
            required maxLength={2} style={inp} />
        </div>
      </div>

      {/* Source of funds */}
      <div>
        <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.sourceOfFunds}</label>
        <select value={form.sourceOfFunds} onChange={e => update('sourceOfFunds', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
          {SOURCE_VALUES.map((v, i) => (
            <option key={v} value={v} style={{ background: '#0f172a' }}>{sourceOpts[i]}</option>
          ))}
        </select>
      </div>
      {form.sourceOfFunds === 'other' && (
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{t.sourceNote}</label>
          <input type="text" value={form.sourceOfFundsNote}
            onChange={e => update('sourceOfFundsNote', e.target.value)} style={inp} />
        </div>
      )}

      {/* Document upload */}
      <div style={{
        padding: '16px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12, letterSpacing: 0.3, textTransform: 'uppercase', margin: 0 }}>
          {t.docsTitle}
        </p>
        {form.idType === 'il_id' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FileZone label={t.docsFront} file={docs.front}
              onChange={f => setDocs(p => ({ ...p, front: f }))} hint={t.docsHint} />
            <FileZone label={t.docsBack} file={docs.back}
              onChange={f => setDocs(p => ({ ...p, back: f }))} hint={t.docsHint} />
          </div>
        ) : (
          <FileZone label={t.docsPassport} file={docs.front}
            onChange={f => setDocs(p => ({ ...p, front: f }))} hint={t.docsHint} />
        )}
      </div>

      {/* AI verifying status */}
      {aiVerifying && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          color: '#818cf8', fontSize: 13, textAlign: 'center',
        }}>
          {t.aiVerifying}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          color: '#fca5a5', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      <button type="submit" disabled={loading || aiVerifying} style={{
        height: 50,
        background: (loading || aiVerifying) ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700,
        cursor: (loading || aiVerifying) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      }}>
        {loading ? t.loading : t.submit}
      </button>

      <p style={{ color: '#475569', fontSize: 12, margin: 0, textAlign: isRtl ? 'right' : 'left' }}>{t.docNote}</p>
    </form>
  );
}
