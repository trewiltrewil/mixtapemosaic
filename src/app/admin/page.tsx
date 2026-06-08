import Link from "next/link";

const adminTools = [
  {
    href: "/admin/production",
    title: "Decal PDF production",
    description: "Export transparent artwork and optimized gang-sheet PDFs."
  },
  {
    href: "/admin/calibrate",
    title: "Photo mapping editor",
    description: "Align tape polygons, holes, raised sections, and public preview crop."
  },
  {
    href: "/admin/images",
    title: "Customizer artwork library",
    description: "Upload approved cassette-configurator artwork and web preview derivatives."
  },
  {
    href: "/studio",
    title: "Sanity content studio",
    description: "Edit pages, journal posts, FAQ, gallery items, and live product variants."
  }
];

export default function AdminPage() {
  return (
    <main className="tool-shell admin-hub-shell">
      <section className="panel admin-hub-intro">
        <p className="eyebrow">Internal</p>
        <h1>Admin Hub</h1>
        <p>
          These tools are protected by Cloudflare Access in production. If you are not already signed in,
          Cloudflare will ask for an email code before this page loads.
        </p>
      </section>

      <section className="panel admin-hub-tools" aria-label="Admin tools">
        {adminTools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <strong>{tool.title}</strong>
            <span>{tool.description}</span>
          </Link>
        ))}
        <a href="/api/admin/sanity/status" target="_blank" rel="noreferrer">
          <strong>Sanity connection status</strong>
          <span>Check deployed CMS env vars and published starter content counts.</span>
        </a>
      </section>
    </main>
  );
}
