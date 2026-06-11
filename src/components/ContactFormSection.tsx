"use client";

import { useMemo, useState, type FormEvent } from "react";

type ContactFormSectionProps = {
  heading: string;
  accentText?: string;
  body: string;
  buttonLabel: string;
  successTitle: string;
  successMessage: string;
  image?: string | null;
  imageAlt?: string;
};

type SubmitState = "idle" | "sending" | "sent" | "error";

function renderHeading(heading: string, accentText?: string) {
  const normalizedHeading = heading.trim();
  const normalizedAccent = accentText?.trim();

  if (!normalizedAccent || !normalizedHeading.toLowerCase().endsWith(normalizedAccent.toLowerCase())) {
    return normalizedHeading;
  }

  const plainText = normalizedHeading.slice(0, normalizedHeading.length - normalizedAccent.length);
  return (
    <>
      {plainText}
      <span>{normalizedAccent}</span>
    </>
  );
}

export function ContactFormSection({
  heading,
  accentText,
  body,
  buttonLabel,
  successTitle,
  successMessage,
  image,
  imageAlt
}: ContactFormSectionProps) {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const headingContent = useMemo(() => renderHeading(heading, accentText), [heading, accentText]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      company: String(formData.get("company") || "").trim()
    };

    if (!payload.name || !payload.email || !payload.message) {
      setState("error");
      setError("Fill out the three tracks and send it again.");
      return;
    }

    setState("sending");
    setError("");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setState("error");
      setError("That transmission clipped. Try once more.");
      return;
    }

    form.reset();
    setState("sent");
  }

  return (
    <section className="contact-studio-section">
      <div className="contact-studio-grid">
        <div className="contact-studio-copy">
          <h1>{headingContent}</h1>
          <p>{body}</p>
          <form className="contact-studio-card" onSubmit={onSubmit}>
            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="contact-honeypot" aria-hidden="true" />
            {state === "sent" ? (
              <div className="contact-success" role="status">
                <h2>{successTitle}</h2>
                <p>{successMessage}</p>
              </div>
            ) : (
              <>
                <label>
                  Your name
                  <input type="text" name="name" autoComplete="name" required />
                </label>
                <label>
                  Your email
                  <input type="email" name="email" autoComplete="email" required />
                </label>
                <label>
                  Message
                  <textarea name="message" rows={5} required />
                </label>
                {error ? <p className="contact-error">{error}</p> : null}
                <button type="submit" disabled={state === "sending"}>
                  {state === "sending" ? "Sending..." : buttonLabel}
                </button>
              </>
            )}
          </form>
        </div>
        {image ? (
          <div className="contact-studio-image" aria-hidden={!imageAlt}>
            <img src={image} alt={imageAlt || ""} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
