import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { ReactNode } from "react";

function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="bg-primary border-4 border-border p-5 font-mono font-bold uppercase shadow-[6px_6px_0_0_#292929]">
      {children}
    </aside>
  );
}

function ProductCTA({ href = "/customize", label = "Start Customizing" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex bg-foreground text-background border-2 border-border px-6 py-3 font-heading font-black uppercase tracking-widest shadow-[5px_5px_0_0_#6B8F8B]"
    >
      {label}
    </Link>
  );
}

function CmsImage({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <figure className="bg-card border-4 border-border p-2 shadow-[8px_8px_0_0_#292929] my-10">
      <img src={src} alt={alt} className="w-full max-h-[560px] object-cover border-2 border-border" />
    </figure>
  );
}

const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="font-heading font-black text-5xl uppercase tracking-tighter" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="font-heading font-black text-4xl uppercase tracking-tighter mt-12" {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="font-heading font-black text-3xl uppercase tracking-tighter mt-10" {...props} />,
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="font-medium text-lg leading-relaxed" {...props} />,
  a: ({ href = "#", ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <Link href={href} className="font-bold underline decoration-4 decoration-secondary underline-offset-4" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-6 space-y-2 font-medium text-lg" {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal pl-6 space-y-2 font-medium text-lg" {...props} />,
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-8 border-primary pl-6 font-heading font-black text-2xl uppercase tracking-tighter" {...props} />
  ),
  Callout,
  ProductCTA,
  CmsImage
};

export function MdxContent({ source }: { source?: string | null }) {
  if (!source) {
    return null;
  }

  return <MDXRemote source={source} components={components} />;
}
