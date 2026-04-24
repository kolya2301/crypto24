import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | crypto24',
    default: 'crypto24 — פלטפורמת קריפטו מוסדרת בישראל',
  },
  description: 'פלטפורמה מוסדרת לקנייה ומכירה של מטבעות דיגיטליים עם אימות מלא ועמידה בדרישות AML/KYC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
