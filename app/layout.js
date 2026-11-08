import {SupportChat} from '@/components/support/SupportChat';
import {AppLaunch} from '@/components/mobile/AppLaunch';
import {IdentityAccessBoundary,IdentityVerificationPrompt} from '@/components/profile/IdentityAccess';
import {StagingBanner} from '@/components/superapp/StagingBanner';
import './phone-account.css';
import './home-entry.css';
import {webBuild} from '@/lib/mobile/web-build';
import { Be_Vietnam_Pro } from "next/font/google";
import { RelooProvider } from "@/lib/store";
import { CookieConsent } from "@/components/privacy/CookieConsent";
import { RestrictionDialog } from "@/components/security/RestrictionDialog";
import { NetworkGuard } from "@/components/security/NetworkGuard";
import { JourneyTracker } from "@/components/privacy/JourneyTracker";
import { IdentityExpiryNotice } from "@/components/security/IdentityExpiryNotice";
import { BrandSync } from "@/components/brand/BrandSync";
import { NativeBridge } from "@/components/mobile/NativeBridge";
import {CommerceScroll} from '@/components/layout/CommerceScroll';
import {DuplicateNotice} from '@/components/security/DuplicateNotice';
import {AppUpdateNotice} from '@/components/mobile/AppUpdateNotice';
import {FollowNotice} from '@/components/security/FollowNotice';
import { branding } from "@/lib/content/branding";
import {ProductAnalyticsProvider} from '@/components/analytics/ProductAnalytics';
import {PersonalizationProvider} from '@/components/rental-care/PersonalizationProvider';
import {RentalCareBridge} from '@/components/rental-care/RentalCareBridge';
import {PublicIntegrationsProvider} from '@/components/privacy/PublicIntegrations';
import {LocaleProvider} from '@/components/settings/LocaleProvider';
import {NotificationCenterProvider} from '@/components/notifications/NotificationCenter';
import {requestLocale} from '@/lib/i18n/server';
import {dmcaCertificate} from '@/lib/content/dmca';
import "./globals.css";
import "./marketplace.css";
import "./features.css";
import "./audience.css";
import "./experience.css";
import "./services.css";
import "./operations.css";
import "./assurance.css";
import "./identity.css";
import "./settings.css";
import "./email-protection.css";
import "./legal.css";
import "./rental-assurance.css";
import "./assurance-extras.css";
import "./crm-upgrade.css";
import "./wallet.css";
import "./refinement.css";
import "./identity-capture.css";
import "./promotions.css";
import "./crm-security.css";
import "./mobile-refresh.css";
import "./native-app.css";
import "./mobile-polish.css";
import "./market-design.css";
import "./market-bright.css";
import "./commerce-interactions.css";
import "./commerce-finish.css";
import "./reloo-palette.css";
import "./reloop-mascot.css";
import "./product-cards.css";
import "./nearby-needs.css";
import "./form-focus.css";
import "./context-header.css";
import "./commerce-finish.css";
import "./product-system.css";
import "./mobile-header-refresh.css";
import "./home-studio.css";
import "./v4-foundation.css";
import "./v5-foundation.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-app",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
// CRM branding and public legal contacts must be read on the request, not frozen at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const brand = await branding();
  return {
    metadataBase: new URL(process.env.RELOO_ENVIRONMENT==='staging'?'https://staging.reloo.vn':'https://reloo.vn'),
    ...(process.env.RELOO_ENVIRONMENT==='staging'?{robots:{index:false,follow:false}}:{}),
    other:{'dmca-site-verification':'bEYyN1p4M0thN0NJVHdBczB5N3BMQT090'},
    icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
    title: brand.siteTitle,
    description:
      "Tìm và đăng tin cho thuê máy ảnh, đồ camping, laptop, thời trang. Trao đổi với chủ đồ trên RELOO, tự thỏa thuận giá thuê và giao nhận.",
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor:'#f4fff7',
};

export default async function RootLayout({ children }) {
  const [locale,build]=await Promise.all([requestLocale(),webBuild()]);
  return (
    <html
      lang={locale==='en-US'?'en':'vi'}
      className={beVietnam.variable}
      data-scroll-behavior="smooth"
      data-reloo-build={build}
    >
      <body>
        <RelooProvider>
          <LocaleProvider initialLocale={locale}>
          {process.env.RELOO_ENVIRONMENT==='staging'&&<StagingBanner/>}
          <PublicIntegrationsProvider dmca={dmcaCertificate(process.env.RELOO_DMCA_PROTECTION_ID,process.env.RELOO_DMCA_REGISTRATION_CONFIRMED)}>
          <PersonalizationProvider><ProductAnalyticsProvider>
          <NotificationCenterProvider><IdentityAccessBoundary>{children}</IdentityAccessBoundary><IdentityVerificationPrompt/></NotificationCenterProvider>
          <IdentityExpiryNotice />
          <BrandSync />
          <NativeBridge />
          <AppLaunch/>
          <SupportChat/>
          <CommerceScroll/>
          <DuplicateNotice />
          <AppUpdateNotice />
          <FollowNotice/>
          <CookieConsent />
          <RestrictionDialog />
          <NetworkGuard />
          <JourneyTracker googleMeasurementId={process.env.RELOO_GA_MEASUREMENT_ID||null}/>
          <RentalCareBridge />
          </ProductAnalyticsProvider></PersonalizationProvider>
          </PublicIntegrationsProvider>
          </LocaleProvider>
        </RelooProvider>
      </body>
    </html>
  );
}
