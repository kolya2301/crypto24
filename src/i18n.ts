import { getRequestConfig } from 'next-intl/server';

const SUPPORTED = ['he', 'ru', 'en', 'ar'];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && SUPPORTED.includes(requested) ? requested : 'he';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
