import { CmsSections } from "@/components/CmsSections";
import { Customizer } from "@/components/Customizer";
import { SiteFooter } from "@/components/PublicChrome";
import { getPageBySlug } from "@/lib/cms";

export const revalidate = 86400;

type CustomizePageProps = {
  searchParams?: Promise<{ artwork?: string }>;
};

export default async function CustomizePage({ searchParams }: CustomizePageProps) {
  const params = await searchParams;
  const page = await getPageBySlug("customize");
  const customizer = <Customizer initialArtworkId={params?.artwork ?? null} />;

  if (page?.sections?.length) {
    return (
      <>
        <CmsSections sections={page.sections} initialArtworkId={params?.artwork ?? null} />
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      {customizer}
      <SiteFooter />
    </>
  );
}
