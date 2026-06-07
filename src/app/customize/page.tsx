import { CmsSections } from "@/components/CmsSections";
import { Customizer } from "@/components/Customizer";
import { SiteFooter } from "@/components/PublicChrome";
import { getPageBySlug } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function CustomizePage() {
  const page = await getPageBySlug("customize");
  if (page?.sections?.length) {
    return (
      <>
        <CmsSections sections={page.sections} />
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Customizer />
      <SiteFooter />
    </>
  );
}
