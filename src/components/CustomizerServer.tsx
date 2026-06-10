import { Customizer } from "@/components/Customizer";
import { getActiveProductVariants } from "@/lib/cms";
import { getPublicImageAssetById, searchPublicImageAssets } from "@/lib/image-assets";

export async function CustomizerServer({ initialArtworkId }: { initialArtworkId?: string | null } = {}) {
  const [sizes, curatedResult, selectedAsset] = await Promise.all([
    getActiveProductVariants().catch(() => []),
    searchPublicImageAssets({ curatedOnly: true, limit: 6, offset: 0 }).catch(() => ({ assets: [] })),
    initialArtworkId ? getPublicImageAssetById(initialArtworkId).catch(() => null) : Promise.resolve(null)
  ]);

  return (
    <Customizer
      initialArtworkId={initialArtworkId}
      initialData={{
        sizes,
        curatedAssets: curatedResult.assets,
        selectedAsset
      }}
    />
  );
}
