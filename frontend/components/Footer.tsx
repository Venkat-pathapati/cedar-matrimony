"use client";

import Link from "next/link";
import { useLoggedIn } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Facebook, Instagram, Whatsapp, Youtube } from "./Icons";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

export default function Footer() {
  const { t } = useI18n();
  const loggedIn = useLoggedIn();
  return (
    <footer id="contact" className="footer">
      <div className="container footer-top">
        <div className="f-brand"><Logo variant="light" height={96} /></div>
        <div className="col">
          <Link href="/">{t("foot.home")}</Link>
          <Link href="/#contact">{t("foot.about")}</Link>
          <Link href="/#how">{t("foot.how")}</Link>
          <Link href="/#stories">{t("foot.stories")}</Link>
        </div>
        <div className="col">
          {loggedIn && <Link href="/#plans">{t("foot.membership")}</Link>}
          <Link href="/">{t("foot.privacy")}</Link>
          <Link href="/">{t("foot.terms")}</Link>
          <Link href="/contact">{t("foot.help")}</Link>
          <a href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"} target="_blank" rel="noopener noreferrer">Admin login</a>
        </div>
        <div className="col">
          <b>{t("foot.follow")}</b>
          <div className="social">
            <a href="#" aria-label="Facebook"><Facebook /></a>
            <a href="#" aria-label="Instagram"><Instagram /></a>
            <a href="#" aria-label="YouTube"><Youtube /></a>
            <a href="#" aria-label="WhatsApp"><Whatsapp /></a>
          </div>
        </div>
        <div className="col right">
          <LanguageSwitcher dark />
          <span className="copy">© {new Date().getFullYear()} Cedar Matrimony. {t("foot.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
