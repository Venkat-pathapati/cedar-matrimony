"use client";

import type { ComponentType } from "react";
import { Arrow } from "./Icons";
import { Laurel } from "./Laurel";

export type StepItem = { Icon: ComponentType<{ size?: number }>; title: string; desc: string };

/**
 * Icon steps. numbered = show 01/02/… (How It Works); arrows = gold arrows between items;
 * boxed = white cards; fancy = tall cream cards with a laurel badge and a gold rule (Why Choose).
 */
export default function StepRow({ items, numbered = false, arrows = false, boxed = false, fancy = false }: { items: StepItem[]; numbered?: boolean; arrows?: boolean; boxed?: boolean; fancy?: boolean }) {
  return (
    <div className={`steps${boxed ? " boxed" : ""}${fancy ? " fancy" : ""}`}>
      {items.map(({ Icon, title, desc }, i) => (
        <div className="step-wrap" key={i}>
          <div className="step">
            {fancy
              ? <Laurel><Icon size={36} /></Laurel>
              : <span className="step-circle"><Icon size={32} /></span>}
            {numbered && <span className="step-no">{String(i + 1).padStart(2, "0")}</span>}
            <h3>{title}</h3>
            <p>{desc}</p>
            {fancy && <span className="step-rule" />}
          </div>
          {arrows && i < items.length - 1 && <span className="step-arrow"><Arrow size={22} /></span>}
        </div>
      ))}
    </div>
  );
}
