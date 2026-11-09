"use client";

import { useI18n } from "@/lib/i18n";
import type { Key } from "@/lib/translations";
import { Ban, Eye, Lock, Shield } from "./Icons";
import { Sprig } from "./Laurel";
import StepRow from "./StepRow";

const icons = [Shield, Lock, Ban, Eye];

export default function Trust() {
  const { t } = useI18n();
  return (
    <section className="section trust">
      <Sprig className="why-sprig tr" />
      <Sprig className="why-sprig bl" />
      <div className="container trust-wrap">
        <div className="kicker center">{t("trust.kicker")}</div>
        <h2 className="center">{t("trust.title")}</h2>
        <p className="lead center section-sub">{t("trust.sub")}</p>
        <StepRow fancy items={icons.map((Icon, i) => ({ Icon, title: t(`trust.${i + 1}t` as Key), desc: t(`trust.${i + 1}d` as Key) }))} />
      </div>
    </section>
  );
}
