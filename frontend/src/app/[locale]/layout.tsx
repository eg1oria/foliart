import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import 'yet-another-react-lightbox/styles.css';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import AdminRouteHidden from '@/components/AdminRouteHidden';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SiteImagesProvider } from '@/components/SiteImagesProvider';
import YandexMetrika from '@/components/YandexMetrika';
import { getCalendars, getCategories } from '@/lib/api';
import { getCalendarHref, getCalendarImages } from '@/lib/calendars';
import { getCategoryHref } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { getSiteImageMap } from '@/lib/siteImagesServer';
import {
  buildOrganizationSchema,
  buildWebsiteSchema,
  DEFAULT_OG_IMAGE,
  getDefaultSiteDescription,
  getDefaultSiteKeywords,
  getSiteUrl,
  GOOGLE_ADSENSE_CLIENT,
  GOOGLE_ANALYTICS_ID,
  GOOGLE_SITE_VERIFICATION,
  SITE_NAME,
  stringifyJsonLd,
  YANDEX_METRIKA_ID,
} from '@/lib/seo';

const exo2 = localFont({
  preload: false,
  src: [
    {
      path: '../../../public/fonts/exo2_0_extralight.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_italic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../../public/fonts/exo2_0_medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_bold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_bold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_extrabold.otf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/exo2_0_black.otf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-exo-2',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: getDefaultSiteDescription(routing.defaultLocale),
  keywords: getDefaultSiteKeywords(routing.defaultLocale),
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

  const [messages, catalogChildren, calendarChildren, siteImages] = await Promise.all([
    getMessages(),
    getHeaderCatalogChildren(locale),
    getHeaderCalendarChildren(locale),
    getSiteImageMap(),
  ]);

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${exo2.variable} h-full antialiased`}
    >
      <body className={`${exo2.className} min-h-full flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: stringifyJsonLd(organizationJsonLd),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: stringifyJsonLd(websiteJsonLd) }}
          />
          {/* Analytics measures the public site only. Metrika's webvisor and
              clickmap install a whole-document MutationObserver and a
              capture-phase click handler, which made the DOM-heavy admin
              screens (tiptap, the UI messages editor, the product tables) lag
              by seconds per click. `afterInteractive` scripts are injected on
              mount, so keeping them out of the tree keeps the tags unfetched.
              AdminSidebar leaves the panel with a hard navigation so a tag
              loaded on the public site can never survive into admin. */}
          <AdminRouteHidden>
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
            <Script
              id="google-adsense"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADSENSE_CLIENT}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
            <YandexMetrika counterId={YANDEX_METRIKA_ID} />
          </AdminRouteHidden>
          <SiteImagesProvider images={siteImages}>
            <Header
              key={locale}
              catalogChildren={catalogChildren}
              calendarChildren={calendarChildren}
            />
            {children}
            <AdminRouteHidden>
              <Footer />
            </AdminRouteHidden>
          </SiteImagesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
