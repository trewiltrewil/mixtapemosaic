import { schemaTypes } from "@/sanity/schemaTypes";

export default function StudioPage() {
  return (
    <main className="bg-background min-h-screen py-20">
      <section className="max-w-5xl mx-auto px-6 space-y-8">
        <div className="bg-card border-4 border-border shadow-[8px_8px_0_0_#292929] p-8 space-y-4">
          <p className="font-mono font-bold uppercase tracking-[0.2em] text-secondary">CMS setup</p>
          <h1 className="font-heading font-black text-5xl lg:text-7xl uppercase tracking-tighter">
            Sanity-ready content model
          </h1>
          <p className="font-mono font-bold uppercase">
            The app is wired to read Sanity content through environment variables. Use these schema
            shapes in the Sanity dashboard or a separate Studio project to keep the production
            bundle audit-clean.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {schemaTypes.map((schema) => (
            <article key={schema.name} className="bg-primary border-4 border-border p-5 shadow-[5px_5px_0_0_#292929]">
              <h2 className="font-heading font-black text-2xl uppercase">{schema.title}</h2>
              <p className="font-mono font-bold text-sm uppercase mt-2">{schema.name}</p>
              <ul className="font-mono text-sm mt-4 space-y-2">
                {schema.fields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
