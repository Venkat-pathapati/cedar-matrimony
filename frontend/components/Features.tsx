"use client";

import { useI18n } from "@/lib/i18n";
import type { Key } from "@/lib/translations";
import { FaithLeaf, Family, FamilyThree, Hearts, Shield } from "./Icons";
import { Sprig } from "./Laurel";
import StepRow from "./StepRow";

const icons = [FaithLeaf, Hearts, Shield, Family, FamilyThree];

export default function Features() {
  const { t } = useI18n();
  return (
    <section className="section why">
      <Sprig className="why-sprig tr" />
      <Sprig className="why-sprig bl" />
      <div className="container why-wrap">
        <div className="why-grid">
          <div className="why-intro">
            {/* brand lockup: logo mark + name, with the tagline underneath */}
            <div className="why-brand">
              <img src="/images/faith-leaf.png" alt="" width={64} height={64} />
              <div className="wb-text">
                <div className="wb-name"><b>Cedar</b><span>Matrimony</span></div>
                <span className="wb-tag">Faith · Family · Forever</span>
              </div>
            </div>
            <div className="kicker">{t("why.kicker")}</div>
            <h2>{t("why.title")}</h2>
            <p className="lead">{t("why.sub")}</p>
          </div>
          <StepRow fancy items={icons.map((Icon, i) => ({ Icon, title: t(`why.${i + 1}t` as Key), desc: t(`why.${i + 1}d` as Key) }))} />
        </div>
      </div>
    </section>
  );
}
