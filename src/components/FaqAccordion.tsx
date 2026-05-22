"use client";

import { useEffect, useState } from "react";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set([items[0]?.id].filter(Boolean)));

  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (!id || !items.some((item) => item.id === id)) {
        return;
      }

      setOpenItems((current) => new Set(current).add(id));
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [items]);

  function toggleItem(id: string) {
    const shouldUpdateHash = !openItems.has(id);

    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (shouldUpdateHash) {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const isOpen = openItems.has(item.id);
        return (
          <section
            key={item.id}
            id={item.id}
            className="scroll-mt-28 bg-background border-4 border-border shadow-[8px_8px_0_0_#292929]"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${item.id}-answer`}
              onClick={() => toggleItem(item.id)}
              className="w-full text-left p-5 sm:p-6 flex items-start gap-5"
            >
              <span
                className={`shrink-0 border-2 border-border px-3 py-1 font-mono font-bold text-sm shadow-[2px_2px_0_0_#292929] ${
                  index % 3 === 1 ? "bg-secondary text-background" : index % 3 === 2 ? "bg-accent" : "bg-primary"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-tighter leading-none grow">
                {item.question}
              </span>
              <span className="font-heading font-black text-3xl leading-none" aria-hidden="true">
                {isOpen ? "-" : "+"}
              </span>
            </button>
            {isOpen ? (
              <div id={`${item.id}-answer`} className="border-t-4 border-border bg-card px-5 sm:px-6 py-6">
                <p className="font-medium text-lg leading-relaxed max-w-3xl">{item.answer}</p>
                <a href={`#${item.id}`} className="mt-5 inline-block font-mono font-bold uppercase text-sm text-secondary">
                  Link to this answer
                </a>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
