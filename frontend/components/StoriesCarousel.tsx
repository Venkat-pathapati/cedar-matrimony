"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, Chevron, Pin } from "./Icons";
import { useI18n } from "@/lib/i18n";
import type { Story } from "@/lib/api";

const photos = ["/images/story-church.jpg", "/images/story-couple.jpg", "/images/hero-couple.jpg"];

export default function StoriesCarousel({ stories }: { stories: Story[] }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const n = stories.length;
  const s = stories[i];
  const go = (d: number) => setI((i + d + n) % n);
  return (
    <section id="stories" className="stories">
      <div className="stories-photo" style={{ backgroundImage: "url(/images/story-couple.jpg)" }} />
      <div className="stories-body">
        <div className="kicker">{t("stories.kicker")}</div>
        <h2>{t("stories.title")}</h2>
        <p className="story-quote">“{s.quote || t("stories.quote")}”</p>
        <div className="story-by"><b>{s.couple}</b></div>
        <div className="pline gold"><Pin /> {s.city}</div>
        <Link href="/#stories" className="btn btn-outline btn-sm">{t("stories.more")} <Arrow size={14} /></Link>
      </div>
      <div className="stories-gallery">
        <button className="car-btn" aria-label="Previous story" onClick={() => go(-1)}><Chevron dir="left" /></button>
        <div className="gallery">
          <img className="g-main" src={photos[i % photos.length]} alt="" />
          <div className="g-side">
            <img src={photos[(i + 1) % photos.length]} alt="" />
            <img src={photos[(i + 2) % photos.length]} alt="" />
          </div>
        </div>
        <button className="car-btn" aria-label="Next story" onClick={() => go(1)}><Chevron dir="right" /></button>
        <div className="dots">{stories.map((_, k) => <button key={k} aria-label={`Story ${k + 1}`} className={k === i ? "on" : ""} onClick={() => setI(k)} />)}</div>
      </div>
    </section>
  );
}
