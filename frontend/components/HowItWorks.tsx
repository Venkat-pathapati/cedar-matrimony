"use client";

import { useI18n } from "@/lib/i18n";
import type { Key } from "@/lib/translations";
import { Chat, Search, Sliders, User } from "./Icons";
import StepRow from "./StepRow";

const icons = [User, Sliders, Search, Chat];

export default function HowItWorks() {
  const { t } = useI18n();
  return (
    <section id="how" className="section how">
      <div className="container">
        <div className="how-intro">
          <div className="kicker">{t("how.kicker")}</div>
          <h2>{t("how.title")}</h2>
        </div>
        <StepRow numbered arrows items={icons.map((Icon, i) => ({ Icon, title: t(`how.${i + 1}t` as Key), desc: t(`how.${i + 1}d` as Key) }))} />
      </div>
    </section>
  );
}
