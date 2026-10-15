// Phone photos (3-5 MB) would quickly exceed the ~5 MB localStorage quota.
// Photos are resized to a size that still reads well in the PDF and zoom viewer.
const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.78;

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a foto.'));
    img.src = src;
  });

/** Returns a resized JPEG data URL for the given image file. */
export async function compressImageFile(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const img = await loadImage(original);
    const ratio = Math.min(1, MAX_DIMENSION_PX / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch (error) {
    console.error('Falha ao reduzir a foto, usando o arquivo original:', error);
    return original;
  }
}
