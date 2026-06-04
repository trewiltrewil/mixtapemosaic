export type LoadedImage = HTMLImageElement & {
  naturalWidth: number;
  naturalHeight: number;
};

export function loadImage(src: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image() as LoadedImage;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    if (/^https?:\/\//.test(src)) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}
