import { CmsSections } from "@/components/CmsSections";
import { SiteFooter } from "@/components/PublicChrome";
import { getPageBySlug } from "@/lib/cms";

export const revalidate = 86400;

const processSections = [
  {
    _key: "hero",
    _type: "heroSection",
    layout: "page",
    tone: "orange",
    title: "The Process",
    body: "How we turn discarded memories into permanent art."
  },
  {
    _key: "steps",
    _type: "processStepsSection",
    steps: [
      {
        _key: "sourcing",
        label: "Step 01",
        title: "Sourcing the Gold",
        body:
          "We scour flea markets, estate sales, and abandoned storage units to find authentic, generation-defining cassettes. We don't use blanks—we want tapes that have been loved, played, and lived with.",
        imageSide: "right",
        labelTone: "yellow",
        frameTone: "paper",
        tilt: "right"
      },
      {
        _key: "cleaning",
        label: "Step 02",
        title: "Cleaning & Prepping",
        body:
          "Each tape is hand-cleaned. We preserve the original labels when possible, but often strip the plastic down to its structural core to prepare it for priming and painting in our signature vibrant colorways.",
        imageSide: "left",
        labelTone: "orange",
        frameTone: "green",
        tilt: "left"
      },
      {
        _key: "assembly",
        label: "Step 03",
        title: "The Mosaic Assembly",
        body:
          "Using your selected themes, we arrange the painted cassettes into a dense, structural grid. This is where the magic happens—combining analog geometry into a monolithic piece of neo-brutalist art.",
        imageSide: "right",
        labelTone: "yellow",
        frameTone: "paper",
        tilt: "right"
      }
    ]
  }
];

export default async function ProcessPage() {
  const page = await getPageBySlug("process");
  return (
    <main>
      <CmsSections sections={page?.sections?.length ? page.sections : processSections} />
      <SiteFooter />
    </main>
  );
}
