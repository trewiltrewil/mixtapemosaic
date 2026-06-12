import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/cms";

export const runtime = "nodejs";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ContactPayload | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (clean(body.company, 120)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 180);
  const message = clean(body.message, 5000);

  if (!name || !isEmail(email) || message.length < 3) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  const settings = await getSiteSettings();
  const recipient =
    process.env.CONTACT_TO_EMAIL || settings?.contactRecipientEmail || "trevin@mixtapemosaic.com";
  const subjectPrefix = settings?.contactSubjectPrefix || process.env.CONTACT_SUBJECT_PREFIX || "[Mixtape Mosaic Contact]";
  const from =
    process.env.CONTACT_FROM_EMAIL ||
    settings?.contactFromEmail ||
    "Mixtape Mosaic <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Contact email is not configured." }, { status: 503 });
  }

  const subject = `${subjectPrefix} ${name}`;
  const text = `New Mixtape Mosaic contact form submission\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #292929;">
      <h1 style="font-size: 22px;">New Mixtape Mosaic contact form submission</h1>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        replyTo: email,
        subject,
        text,
        html
      })
    });
  } catch (error) {
    console.error("Contact email request failed", error);
    return NextResponse.json({ error: "Email service could not be reached." }, { status: 502 });
  }

  if (!response.ok) {
    const resendError = (await response.json().catch(() => null)) as { message?: string; name?: string } | null;
    console.error("Contact email delivery failed", {
      status: response.status,
      name: resendError?.name,
      message: resendError?.message
    });
    return NextResponse.json(
      {
        error: resendError?.message ? `Email delivery failed: ${resendError.message}` : "Email delivery failed."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
