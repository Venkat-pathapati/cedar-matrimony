"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useSummary } from "@/lib/notify";
import { Bell, Crown, Headset, HeartIcon, LogOut, Msg, Pencil, Sliders, Star, User, UserCircle } from "./Icons";
import LanguageSwitcher from "./LanguageSwitcher";
import Logo from "./Logo";

export default function Header() {
  const { t } = useI18n();
  const { loggedIn, hasProfile, email, plan } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const bellBox = useRef<HTMLDivElement>(null);
  const sum = useSummary(!!loggedIn && !!hasProfile);
  const unread = sum.unread_messages;
  const box = useRef<HTMLDivElement>(null);
  const cls = (on: boolean) => (on ? "active" : undefined);

  // close the menu on outside click, Escape, or when the page changes
  useEffect(() => { setOpen(false); setBell(false); }, [path]);
  useEffect(() => {
    if (!open && !bell) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
      if (bellBox.current && !bellBox.current.contains(e.target as Node)) setBell(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setBell(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, bell]);

  const browseHref = loggedIn && hasProfile ? "/browse" : "/#matches";
  return (
    <header className="header">
      <Logo height={72} />
      <div className="hdr-right">
        <nav className="nav">
          <Link href="/#home" className={cls(path === "/")}>{t("nav.home")}</Link>
          <Link href="/#how">{t("nav.how")}</Link>
          <Link href={browseHref} className={cls(path === "/browse")}>{t("nav.browse")}</Link>
          <Link href="/#stories">{t("nav.stories")}</Link>
          {loggedIn && <Link href="/#plans">{t("nav.membership")}</Link>}
          <Link href="/contact" className={cls(path === "/contact")}>{t("nav.contact")}</Link>
        </nav>
        <LanguageSwitcher />
        {loggedIn ? (
          <>
          {hasProfile && (
            <div className="bell-wrap" ref={bellBox}>
              <button type="button" className={`bell-btn${bell ? " on" : ""}`} aria-label={`Notifications${sum.total ? `, ${sum.total} new` : ""}`} aria-haspopup="menu" aria-expanded={bell} onClick={() => { setBell(!bell); setOpen(false); }}>
                <Bell size={22} />
                {sum.total > 0 && <span className="bell-badge">{sum.total > 9 ? "9+" : sum.total}</span>}
              </button>
              {bell && (
                <div className="avatar-menu bell-menu" role="menu">
                  <div className="am-title">Notifications</div>
                  {sum.pending_interests > 0 && <Link role="menuitem" href="/interests"><HeartIcon size={19} /> {sum.pending_interests} new {sum.pending_interests === 1 ? "interest" : "interests"} received</Link>}
                  {sum.accepted_unseen > 0 && <Link role="menuitem" href="/interests?tab=sent"><HeartIcon size={19} filled /> {sum.accepted_unseen} {sum.accepted_unseen === 1 ? "member accepted" : "members accepted"} your interest</Link>}
                  {sum.unread_messages > 0 && <Link role="menuitem" href="/messages"><Msg size={19} /> {sum.unread_messages} unread {sum.unread_messages === 1 ? "message" : "messages"}</Link>}
                  {sum.total === 0 && <p className="am-empty">You&apos;re all caught up.</p>}
                </div>
              )}
            </div>
          )}
          <div className="avatar-wrap" ref={box}>
            <button type="button" className={`avatar-btn${open ? " on" : ""}`} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
              <UserCircle size={26} />
            </button>
            {open && (
              <div className="avatar-menu" role="menu">
                <div className="am-head">
                  <span className="am-av"><UserCircle size={30} /></span>
                  <div><small>Signed in as</small><b title={email ?? ""}>{email ?? "My account"}</b></div>
                </div>
                <Link role="menuitem" href={hasProfile ? "/profile" : "/dashboard"}><User size={19} /> {hasProfile ? "View Profile" : "Create Profile"}</Link>
                {hasProfile && <Link role="menuitem" href="/messages"><Msg size={19} /> Messages {unread > 0 && <em className="am-pill hot">{unread}</em>}</Link>}
                {hasProfile && <Link role="menuitem" href="/interests"><HeartIcon size={19} /> Interests {sum.pending_interests + sum.accepted_unseen > 0 && <em className="am-pill hot">{sum.pending_interests + sum.accepted_unseen}</em>}</Link>}
                {hasProfile && <Link role="menuitem" href="/shortlist"><Star size={19} /> Shortlisted</Link>}
                <Link role="menuitem" href="/settings"><Sliders size={19} /> Settings</Link>
                <Link role="menuitem" href="/#plans"><Crown size={19} /> Membership {plan && <em className="am-pill">{plan}</em>}</Link>
                <Link role="menuitem" href="/contact"><Headset size={19} /> Help &amp; Support</Link>
                <div className="am-sep" />
                <div className="am-mobile">
                  <Link role="menuitem" href="/#home">{t("nav.home")}</Link>
                  <Link role="menuitem" href="/#how">{t("nav.how")}</Link>
                  <Link role="menuitem" href={browseHref}>{t("nav.browse")}</Link>
                  <Link role="menuitem" href="/#stories">{t("nav.stories")}</Link>
                  <Link role="menuitem" href="/contact">{t("nav.contact")}</Link>
                  <div className="am-sep" />
                </div>
                <button type="button" role="menuitem" className="am-logout" onClick={() => { logout(); setOpen(false); router.push("/"); }}><LogOut size={19} /> {t("logout")}</button>
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="hdr-actions">
            <Link href="/login" className="btn btn-outline btn-sm">{t("login")}</Link>
            <Link href="/register" className="btn btn-gold btn-sm">{t("createProfile")}</Link>
          </div>
        )}
      </div>
    </header>
  );
}
