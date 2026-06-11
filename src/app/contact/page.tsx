import type { Metadata } from "next";
import { CmsSections } from "@/components/CmsSections";
import { SiteFooter } from "@/components/PublicChrome";
import { getPageBySlug } from "@/lib/cms";

export const revalidate = 86400;

const fallbackContactSections = [
  {
    _key: "contact",
    _type: "contactFormSection",
    heading: "Hit us up.",
    accentText: "up.",
    body: "Got a custom request? Found a crate of old tapes? Just want to talk about 90s hip-hop? Drop a line.",
    buttonLabel: "Send Transmission",
    successTitle: "Transmission received.",
    successMessage: "We got your note. The studio will get back to you soon."
  }
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("contact");
  const title = page?.seoTitle ?? "Contact | Mixtape Mosaic";
  const description =
    page?.seoDescription ?? "Contact Mixtape Mosaic about custom cassette wall art, commissions, old tapes, and studio questions.";

  return {
    title,
    description,
    keywords: page?.seoKeywords,
    robots: page?.seoNoIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: page?.seoCanonicalPath || "/contact" },
    openGraph: {
      title,
      description,
      type: "website",
      images: page?.seoImageUrl ? [{ url: page.seoImageUrl, alt: title }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: page?.seoImageUrl ? [page.seoImageUrl] : undefined
    }
  };
}

export default async function ContactPage() {
  const page = await getPageBySlug("contact");
  const hasContactForm = page?.sections?.some((section) => section._type === "contactFormSection");

  return (
    <main>
      <CmsSections sections={hasContactForm ? page?.sections : fallbackContactSections} />
      <SiteFooter />
    </main>
  );
}
