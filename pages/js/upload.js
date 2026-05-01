/* =============================================================
   upload.js — Tinda
   Compression + upload d'images vers Supabase Storage
============================================================= */

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];
const MAX_SIZE_MB = 5;

// Compresse / redimensionne une image côté client (skip SVG)
async function compressImage(file, maxWidth = 1200, quality = 0.85) {
  if (file.type === 'image/svg+xml') return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error('Lecture fichier échouée'));

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression échouée'));
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Image invalide'));
    reader.readAsDataURL(file);
  });
}

// Upload vers Supabase Storage, renvoie l'URL publique
async function uploadProductImage(file) {
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) throw new Error('Vous devez être connecté pour uploader');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await sb.storage
    .from('product-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadErr) {
    console.error('Erreur upload:', uploadErr);
    throw uploadErr;
  }

  const { data: { publicUrl } } = sb.storage.from('product-images').getPublicUrl(filename);
  return publicUrl;
}

// Supprime une image via son URL publique (best effort, ne throw jamais)
async function deleteProductImage(publicUrl) {
  try {
    if (!publicUrl) return;
    const u = new URL(publicUrl);
    const marker = '/product-images/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return;
    const path = u.pathname.substring(idx + marker.length);
    if (!path) return;
    await sb.storage.from('product-images').remove([path]);
  } catch (e) {
    console.warn('Suppression image échouée (ignorée):', e);
  }
}

// Validation des fichiers
function validateFiles(files) {
  const errors = [];
  for (const f of files) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      errors.push(`${f.name} : format non supporté (JPG, PNG, SVG uniquement)`);
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      errors.push(`${f.name} : fichier > ${MAX_SIZE_MB} MB`);
    }
  }
  return errors;
}
