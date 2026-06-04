import type { ArtworkOption } from "./types";

export type ProductLayoutKey = "square" | "landscape";

export const artworkOptions: ArtworkOption[] = [
  {
    id: "truck",
    name: "Blue Food Truck",
    src: "/assets/ryan-waring-geeZzrAXyMQ-unsplash.jpg",
    credit: "Ryan Waring / Unsplash sample"
  },
  {
    id: "palms",
    name: "Sunset Palms",
    src: "/assets/aishwarya-mv-3i-TsBuiTPk-unsplash.jpg",
    credit: "Aishwarya MV / Unsplash sample"
  }
];

export const productPhotos: Record<ProductLayoutKey, {
  src: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
}> = {
  square: {
    src: "/product/cassette-grid-square.png",
    width: 1254,
    height: 1254,
    columns: 6,
    rows: 9
  },
  landscape: {
    src: "/product/cassette-grid-landscape.png",
    width: 1630,
    height: 1254,
    columns: 8,
    rows: 9
  }
};

export const productPhoto = productPhotos.square;

export function getProductPhoto(layout: ProductLayoutKey) {
  return productPhotos[layout];
}
