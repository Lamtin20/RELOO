"use client";
import "./auth-layout.css";
import {MiniAppLink as Link} from '@/components/superapp/MiniAppLink';
import {MiniAppNavigation} from '@/components/superapp/MiniAppNavigation';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUpRight,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { authLink } from "@/lib/auth-navigation";
import { useReloo } from "@/lib/store";
import {useLocale} from '@/components/settings/LocaleProvider';
import {surfaceCopy} from '@/lib/i18n/surfaces';

export function AuthShell({ children, mode = "login", next, intent }) {
  const { hydrated } = useReloo();
  const {locale}=useLocale(),t=surfaceCopy[locale]||surfaceCopy['vi-VN'];
  return (
    <MiniAppNavigation><div className="auth-site" data-ready={hydrated} aria-busy={!hydrated}>
      <header className="auth-site__header">
        <Logo size={32} />
        <Link href="/">
          {t.explore} <ArrowUpRight size={16} />
        </Link>
      </header>
      <main className="auth-site__main">
        <aside
          className="auth-site__visual"
          aria-label={t.visual}
        >
          <Image
            src="/images/reloo-camping.webp"
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            preload
          />
          <div className="auth-site__visual-copy">
            <h2>RELOO</h2>
          </div>
        </aside>
        <section
          className="auth-site__content"
          inert={!hydrated}
          aria-label={
            mode === "register" ? t.register : t.login
          }
        >
          <div className="auth-site__form-wrap">
            {mode === "login" || mode === "register" ? (
              <nav className="auth-site__tabs" aria-label={t.account}>
                <Link
                  href={authLink("/auth", next, intent)}
                  aria-current={mode === "login" ? "page" : undefined}
                >
                  {t.signIn}
                </Link>
                <Link
                  href={authLink("/auth/register", next, intent)}
                  aria-current={mode === "register" ? "page" : undefined}
                >
                  {t.signUp}
                </Link>
              </nav>
            ) : (
              <Link
                href={authLink("/auth", next, intent)}
                className="auth-site__back"
              >
                <ArrowLeft size={15} /> {t.signIn}
              </Link>
            )}
            {children}
          </div>
          <footer className="auth-site__footer">
            <div>
              <Link href="/cms/terms">{t.terms}</Link>
              <Link href="/cms/privacy">{t.privacy}</Link>
              <Link href="/help">{t.help}</Link>
            </div>
          </footer>
        </section>
      </main>
    </div></MiniAppNavigation>
  );
}
