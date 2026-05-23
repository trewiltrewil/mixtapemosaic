import { SiteFooter } from "@/components/PublicChrome";

const steps = [
  {
    label: "Step 01",
    title: "Sourcing the Gold",
    body: "We scour flea markets, estate sales, and abandoned storage units to find authentic, generation-defining cassettes. We don't use blanks&mdash;we want tapes that have been loved, played, and lived with.",
    image: "/assets/story/cassette-wall-archive.jpg",
    frame: "bg-card rotate-2",
    reverse: false
  },
  {
    label: "Step 02",
    title: "Cleaning & Prepping",
    body: "Each tape is hand-cleaned. We preserve the original labels when possible, but often strip the plastic down to its structural core to prepare it for priming and painting in our signature vibrant colorways.",
    image: "/assets/story/cassette-six-pack.jpg",
    frame: "bg-accent -rotate-2",
    reverse: true
  },
  {
    label: "Step 03",
    title: "The Mosaic Assembly",
    body: "Using your selected themes, we arrange the painted cassettes into a dense, structural grid. This is where the magic happens&mdash;combining analog geometry into a monolithic piece of neo-brutalist art.",
    image: "/assets/story/exhibition-red-mosaic.jpg",
    frame: "bg-card rotate-1",
    reverse: false
  }
];

export default function ProcessPage() {
  return (
    <main>
      <section className="min-h-screen bg-background pb-32">
        <header className="bg-secondary text-background border-b-4 border-border py-24 px-6 text-center">
          <h1 className="font-heading font-black text-6xl lg:text-8xl uppercase tracking-tighter mb-6">
            The Process
          </h1>
          <p className="font-mono text-xl uppercase tracking-widest max-w-2xl mx-auto">
            How we turn discarded memories into permanent art.
          </p>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-20 space-y-32">
          {steps.map((step) => (
            <article key={step.label} className="grid md:grid-cols-2 gap-12 items-center">
              <div className={`space-y-6 ${step.reverse ? "order-1 md:order-2" : ""}`}>
                <div className={`inline-block border-2 border-border px-4 py-1 font-heading font-black text-2xl shadow-[4px_4px_0_0_#292929] ${step.reverse ? "bg-secondary text-background" : "bg-primary"}`}>
                  {step.label}
                </div>
                <h2 className="font-heading font-black text-4xl uppercase tracking-tighter">{step.title}</h2>
                <p className="text-lg font-medium" dangerouslySetInnerHTML={{ __html: step.body }} />
              </div>
              <div className={`${step.reverse ? "order-2 md:order-1" : ""} ${step.frame} border-4 border-border shadow-[8px_8px_0_0_#292929] p-2`}>
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-80 object-cover border-2 border-border grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
