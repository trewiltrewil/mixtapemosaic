"use client";

import { FormEvent, useState } from "react";

type NewsletterState = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<NewsletterState>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") {
      return;
    }

    setState("submitting");
    setMessage("");

    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (response.ok) {
      setEmail("");
      setState("success");
      setMessage("You are on the list. Fresh drops, studio notes, and odd little tape things incoming.");
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setState("error");
    setMessage(data?.error || "That did not record. Try it again in a minute.");
  }

  return (
    <form className="flex flex-col items-center md:items-start" onSubmit={onSubmit}>
      <h4 className="font-heading font-black text-2xl uppercase tracking-wider mb-6 text-foreground">Newsletter</h4>
      <p className="font-medium mb-4 text-foreground/80 font-mono">Get early access to limited edition drops.</p>
      <div className="flex border-2 border-border shadow-[4px_4px_0_0_#292929]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="EMAIL ADDRESS"
          aria-label="Email address"
          required
          className="w-full bg-input-background text-foreground px-4 py-2 font-mono font-bold focus:outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="bg-secondary text-background border-l-2 border-border px-4 py-2 font-bold uppercase hover:bg-foreground transition-colors disabled:cursor-wait disabled:opacity-70"
        >
          {state === "submitting" ? "..." : "Join"}
        </button>
      </div>
      {message ? (
        <p
          role={state === "error" ? "alert" : "status"}
          className={`mt-4 max-w-xs font-mono text-sm font-bold uppercase leading-snug ${
            state === "error" ? "text-secondary" : "text-foreground"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
