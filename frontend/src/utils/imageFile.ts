/**
 * Redimensionne une photo en gardant ses proportions (côté max = maxDim)
 * et la compresse en JPEG (data URL). Utilisé pour la photo de cahier
 * envoyée à la lecture IA : plein cadre, léger, lisible.
 */
export function fileToScaledDataUrl(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Veuillez choisir une image (photo du cahier).'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette photo'));
    };
    img.src = url;
  });
}

/**
 * Lit une image choisie par l'utilisateur, la recadre en carré centré,
 * la redimensionne et la compresse en JPEG (data URL) — idéal pour les
 * photos de groupes de produits prises au téléphone.
 */
export function fileToSquareDataUrl(file: File, size = 420, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Veuillez choisir une image (PNG, JPG...)'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const out = Math.min(size, side);
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      canvas.getContext('2d')!.drawImage(img, sx, sy, side, side, 0, 0, out, out);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette image'));
    };
    img.src = url;
  });
}
