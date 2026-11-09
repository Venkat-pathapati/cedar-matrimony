"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Chevron, Doc, Family, Headset, Lock, Mail, Phone, PinSolid, Send, Shield, User } from "@/components/Icons";
import { Sprig } from "@/components/Laurel";
import { clientPost } from "@/lib/api";
import { CONTACT } from "@/lib/contact";

const SUBJECTS = ["General Enquiry", "Account & Profile", "Membership & Plans", "Report a Profile", "Technical Support", "Other"];
const FAQ = [
  ["How do I create an account?", "Click Create Profile, enter your email and a password, then verify the 6-digit code we email you. After that you can complete your profile."],
  ["Is my information safe?", "Yes. Passwords are stored securely, and your email and phone number are not shown to other members. You decide what you share."],
  ["How does premium membership work?", "Free members can create a profile and browse matches. Silver, Gold and Platinum plans unlock more features — you can see them on the home page after you log in. Contact us if you need help choosing."],
  ["How can I contact support?", `Use the form on this page, email ${CONTACT.email}, or call ${CONTACT.phoneDisplay}.`],
  ["I found a fake profile. What should I do?", "Choose “Report a Profile” as the subject in the form and tell us the profile’s name. We will review it promptly."],
];
const HERO_BADGES = [
  { Icon: Headset, t: "Quick Support", d: "Get timely assistance" },
  { Icon: Shield, t: "Trusted Platform", d: "Your privacy matters" },
  { Icon: Family, t: "Dedicated Team", d: "Here for you always" },
];

export default function ContactPage() {
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("subject");
    if (s && SUBJECTS.includes(s)) setF((x) => ({ ...x, subject: s }));
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setDone("");
    try {
      const r = await clientPost<{ message: string }>("/api/contact", {
        name: f.name, email: f.email, phone: f.phone || null, subject: f.subject || null, message: f.message,
      });
      setDone(r.message || "Thank you. We will get back to you soon.");
      setF({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  return (
    <>
      <Header />
      <main className="ct">
        {/* ---------- hero ---------- */}
        <section className="ct-hero">
          <Sprig className="ct-sprig" />
          <div className="ct-hero-copy">
            <div className="ct-eyebrow">Contact Us</div>
            <h1>We’re Here for <em>Your Journey</em></h1>
            <p>Have questions or need support? Our team is always ready to help you on your journey to find the right life partner.</p>
            <div className="ct-badges">
              {HERO_BADGES.map(({ Icon, t, d }) => (
                <div key={t}><span><Icon size={26} /></span><div><b>{t}</b><small>{d}</small></div></div>
              ))}
            </div>
          </div>
          <div className="ct-hero-photo">
            <div className="ct-photo" />
          </div>
          <div className="ct-script">Let’s Build<br />Happier<br />Tomorrows<br />Together</div>
        </section>

        {/* ---------- main grid ---------- */}
        <div className="ct-grid">
          <div className="ct-col">
            <div className="ct-card">
              <h2>Send Us a <em>Message</em></h2>
              <p className="ct-lead">Fill out the form below and our team will get back to you shortly.</p>
              <form onSubmit={submit}>
                <div className="ct-row">
                  <div className="ct-input"><User size={20} /><input aria-label="Full name" required maxLength={100} placeholder="Full Name *" value={f.name} onChange={set("name")} /></div>
                  <div className="ct-input"><Mail /><input aria-label="Email address" type="email" required placeholder="Email Address *" value={f.email} onChange={set("email")} /></div>
                </div>
                <div className="ct-row">
                  <div className="ct-input"><Phone /><input aria-label="Mobile number" type="tel" required maxLength={20} placeholder="Mobile Number *" value={f.phone} onChange={set("phone")} /></div>
                  <div className="ct-input">
                    <Chevron size={18} />
                    <select aria-label="Subject" required value={f.subject} onChange={set("subject")}>
                      <option value="" disabled>Subject *</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ct-input ct-area"><Doc /><textarea aria-label="Your message" required minLength={5} maxLength={2000} placeholder="Your Message * — type your message here…" value={f.message} onChange={set("message")} /></div>
                {error && <div className="error">{error}</div>}
                {done && <div className="ok">{done}</div>}
                <button className="ct-send" disabled={busy}><Send size={20} /> {busy ? "Sending…" : "Send Message"}</button>
                <div className="ct-note"><Lock size={15} /> Your information is safe with us. We respect your privacy.</div>
              </form>
            </div>

            <div className="ct-card">
              <h2>Our <em>Location</em></h2>
              <p className="ct-lead">Visit us at our office or find us on the map.</p>
              <div className="ct-map" role="img" aria-label="Map showing the Cedar Matrimony office location">
                <svg viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice">
                  <rect width="600" height="240" fill="#EDE7D6" />
                  <path d="M0 150C80 120 150 160 240 130S420 90 600 120V240H0z" fill="#E1E9D4" />
                  <ellipse cx="505" cy="60" rx="70" ry="34" fill="#CFE1EA" />
                  <g stroke="#fff" strokeWidth="11" strokeLinecap="round" fill="none">
                    <path d="M-10 70L610 40" /><path d="M120 -10L170 250" /><path d="M-10 190L610 170" /><path d="M360 -10L330 250" /><path d="M470 -10L560 250" />
                  </g>
                  <g stroke="#F8F4E8" strokeWidth="5" fill="none"><path d="M0 120L600 100" /><path d="M240 0L260 240" /><path d="M-10 230L610 215" /></g>
                </svg>
                <div className="ct-pin"><svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path d="M12 22.5s-7.5-6.4-7.5-12a7.5 7.5 0 0115 0c0 5.6-7.5 12-7.5 12z" fill="#C79A3B" stroke="#fff" strokeWidth="1.4" /><circle cx="12" cy="10.5" r="2.8" fill="#fff" /></svg></div>
                <div className="ct-maplabel"><span><PinSolid size={22} /></span><div><b>{CONTACT.officeName}</b><small>{CONTACT.addressLines.join(", ")}</small></div></div>
              </div>
            </div>
          </div>

          <div className="ct-col">
            <div className="ct-card">
              <h2>Get in <em>Touch</em></h2>
              <p className="ct-lead">Reach us through any of the following channels.</p>
              <ul className="ct-info">
                <li><span className="g"><Phone size={24} /></span><div><b>Phone Support</b><a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a></div></li>
                <li><span className="o"><Mail size={24} /></span><div><b>Email Us</b><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><small>We will get back to you as soon as possible.</small></div></li>
                <li><span className="g"><PinSolid size={24} /></span><div><b>Our Office</b><p>{CONTACT.officeName}</p>{CONTACT.addressLines.map((l) => <p key={l}>{l}</p>)}</div></li>
              </ul>
            </div>

            <div className="ct-card ct-help">
              <h2>Quick <em>Help</em></h2>
              <p className="ct-lead">Find answers to common questions.</p>
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}<Chevron dir="right" size={16} /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- bottom call-to-action ---------- */}
        <section className="ct-cta">
          <div>
            <h2>Still Need <em>Help?</em></h2>
            <p>Our support team is just a message away. We are committed to making your experience smooth and secure.</p>
          </div>
          <a className="ct-cta-btn" href={`tel:${CONTACT.phone}`}><Headset size={22} /> Talk to Our Support Team</a>
        </section>
      </main>
      <Footer />
    </>
  );
}
