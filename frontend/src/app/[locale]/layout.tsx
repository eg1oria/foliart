import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCalendars, getCategories } from '@/lib/api';
import { getCalendarHref, getCalendarImages } from '@/lib/calendars';
import { getCategoryHref } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import {
  buildOrganizationSchema,
  buildWebsiteSchema,
  DEFAULT_OG_IMAGE,
  getDefaultSiteDescription,
  getSiteUrl,
  GOOGLE_ANALYTICS_ID,
  GOOGLE_SITE_VERIFICATION,
  SITE_NAME,
  stringifyJsonLd,
} from '@/lib/seo';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: getDefaultSiteDescription(routing.defaultLocale),
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: getDefaultSiteDescription(routing.defaultLocale),
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: `${SITE_NAME} social preview image`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: getDefaultSiteDescription(routing.defaultLocale),
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function getHeaderCatalogChildren(locale: string) {
  try {
    const categories = await getCategories(locale);
    return categories.map((category) => ({
      name: category.name,
      href: getCategoryHref(category),
      image: resolveMediaUrl(category.imageUrl) ?? undefined,
      count: category.productCount,
    }));
  } catch {
    return [];
  }
}

async function getHeaderCalendarChildren(locale: string) {
  try {
    const calendars = await getCalendars(locale);

    return calendars.map((calendar) => ({
      name: calendar.title,
      href: getCalendarHref(calendar),
      image: resolveMediaUrl(getCalendarImages(calendar)[0]) ?? undefined,
    }));
  } catch {
    return [];
  }
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const organizationJsonLd = buildOrganizationSchema(locale);
  const websiteJsonLd = buildWebsiteSchema(locale);

  const [messages, catalogChildren, calendarChildren] = await Promise.all([
    getMessages(),
    getHeaderCatalogChildren(locale),
    getHeaderCalendarChildren(locale),
  ]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: stringifyJsonLd(organizationJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: stringifyJsonLd(websiteJsonLd) }}
          />
          {GOOGLE_ANALYTICS_ID ? (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: true });`}
              </Script>
            </>
          ) : null}
          <Header
            key={locale}
            catalogChildren={catalogChildren}
            calendarChildren={calendarChildren}
          />
          {children}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
