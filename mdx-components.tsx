import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="font-heading font-black uppercase tracking-tighter" {...props} />,
    h2: (props) => <h2 className="font-heading font-black uppercase tracking-tighter" {...props} />,
    p: (props) => <p className="font-mono leading-relaxed" {...props} />,
    a: (props) => <a className="font-bold underline decoration-4 decoration-secondary underline-offset-4" {...props} />,
    ...components
  };
}
