/** Préparation des photos de profil dans le navigateur : recadrage carré centré et compression JPEG. */

const PHOTO_SIZE = 512;

/** Recadre l'image au centre, la réduit à 512×512 px et la compresse en JPEG (quelques dizaines de Ko). */
export async function prepareProfilePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choisissez un fichier image (JPEG, PNG, WebP…).");
  if (file.size > 20 * 1024 * 1024) throw new Error("Cette image est trop lourde (20 Mo maximum).");

  let bitmap: ImageBitmap;
  try {
    // Respecte l'orientation EXIF des photos prises au téléphone.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Impossible de lire cette image : essayez une photo JPEG ou PNG.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(PHOTO_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Votre navigateur ne permet pas de préparer l'image.");
  // Fond blanc : les zones transparentes d'un PNG ne deviennent pas noires en JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("Impossible de préparer l'image.");
  return blob;
}
