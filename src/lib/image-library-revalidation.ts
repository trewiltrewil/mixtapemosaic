import { revalidatePath } from "next/cache";

export function revalidateImageLibraryViews() {
  revalidatePath("/");
  revalidatePath("/customize");
  revalidatePath("/artwork");
  revalidatePath("/artwork/[categorySlug]", "page");
}
