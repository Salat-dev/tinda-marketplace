/* =============================================================
   ui.js — Tinda
   Helpers UI (format, escapeHTML, toast, loader, empty, error)
============================================================= */

// Formatage monétaire XAF
const formatXAF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

// Fallback image (data URI SVG gris)
const IMG_FALLBACK =
  'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22%3E%3Crect fill=%22%23f3f0ec%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%22150%22 y=%22155%22 font-family=%22sans-serif%22 font-size=%2216%22 fill=%22%239a928a%22 text-anchor=%22middle%22%3EImage indisponible%3C/text%3E%3C/svg%3E';

// Échappement HTML (anti-XSS)
const escapeHTML = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

// Toast flash (info / success / error)
function toast(msg, kind = 'info') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `toast toast--${kind} is-visible`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('is-visible'), 2400);
}

// Loader
function showLoader(container, text = 'Chargement…') {
  if (!container) return;
  container.innerHTML = `<div class="loader"><div class="spinner"></div><span>${escapeHTML(text)}</span></div>`;
}

// Message d'état vide (avec CTA facultatif)
function showEmpty(container, text, ctaText = null, ctaHref = null) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty">
      <p>${escapeHTML(text)}</p>
      ${ctaText ? `<a href="${escapeHTML(ctaHref)}" class="btn btn--primary">${escapeHTML(ctaText)}</a>` : ''}
    </div>`;
}

// Message d'erreur
function showError(container, error) {
  if (!container) return;
  const msg = error?.message || 'Une erreur est survenue.';
  container.innerHTML = `<div class="empty"><p class="error">⚠ ${escapeHTML(msg)}</p></div>`;
}

// Pastilles de couleurs produit (utilisées par shop + product)
function renderSwatches(colors, max = 4) {
  if (!Array.isArray(colors) || !colors.length) return '';
  const shown = colors.slice(0, max);
  const more = colors.length - shown.length;
  return `
    <div class="swatches">
      ${shown.map((c) => `<span class="swatch" style="background:${escapeHTML(c.hex)}" title="${escapeHTML(c.name || c.hex)}"></span>`).join('')}
      ${more > 0 ? `<span class="swatches__more">+${more}</span>` : ''}
    </div>`;
}

// Libellés de badges (partagé entre shop, product, dashboard)
function badgeLabel(b) {
  return ({
    new: 'Nouveau',
    bestseller: 'Top vente',
    featured: 'Vedette',
    unlimited: 'Illimité',
    out_of_stock: 'Épuisé',
    promo: 'Promo',
    limited: 'Limité',
  })[b] || b;
}
