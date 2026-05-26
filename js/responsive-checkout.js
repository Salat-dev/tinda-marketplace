/* ═══════════════════════════════════════════════════════
   checkout.js — Tinda Marketplace
   Compatible avec checkout.html analysé
   Responsive toutes tailles · Supabase · WhatsApp
═══════════════════════════════════════════════════════ */

'use strict';

const SUPABASE_URL             = 'https://uytrjgtrpsbegifudosi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
const SUPPORT_WHATSAPP         = '237693421348';  
const CURRENCY      = 'FCFA';
const CART_KEY      = 'tinda_cart';
const ORDER_KEY     = 'tinda_last_order';

/* ── SUPABASE CLIENT (optionnel, ne bloque pas si absent) ── */
let supabase = null;
try {
  if (window.supabase && SUPABASE_URL.includes('supabase.co')) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
} catch (e) {
  console.warn('[Tinda] Supabase non initialisé — mode local uniquement');
}

/* ══════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════ */

/** Formate un prix en FCFA */
function formatPrice(n) {
  return Number(n).toLocaleString('fr-FR') + ' ' + CURRENCY;
}

/** Récupère le panier depuis localStorage */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

/** Sauvegarde le panier */
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/** Vide le panier */
function clearCart() {
  localStorage.removeItem(CART_KEY);
}

/** Affiche un toast (notification) */
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icons = {
    success : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error   : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__msg">${message}</span>
    <button class="toast__close" aria-label="Fermer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  container.appendChild(toast);

  /* Entrée animée */
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  const remove = () => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast__close').addEventListener('click', remove);
  setTimeout(remove, duration);
}

/** Validation basique d'un numéro camerounais */
function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-.()+]/g, '');
  return /^(237)?6[5-9]\d{7}$/.test(cleaned) || /^(237)?2[0-9]{8}$/.test(cleaned);
}

/** Nettoie et formate un numéro de téléphone */
function formatPhone(phone) {
  const cleaned = phone.replace(/[\s\-()+]/g, '');
  if (cleaned.startsWith('237')) return '+' + cleaned;
  if (cleaned.startsWith('6') || cleaned.startsWith('2')) return '+237' + cleaned;
  return phone;
}

/* ══════════════════════════════════════
   PANIER → RÉSUMÉ SIDEBAR
══════════════════════════════════════ */

function renderSummary() {
  const cart     = getCart();
  const itemsEl  = document.getElementById('summaryItems');
  const countEl  = document.getElementById('summaryCount');
  const subEl    = document.getElementById('summarySubtotal');
  const totalEl  = document.getElementById('summaryTotal');
  const cartBadge = document.getElementById('cartCount');

  const totalQty = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const subtotal = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  /* Compteur navbar */
  if (cartBadge) {
    cartBadge.textContent = totalQty;
    cartBadge.style.display = totalQty > 0 ? '' : 'none';
  }

  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="summary__empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>
        <p>Votre panier est vide</p>
        <a href="shop.html" class="btn-back-shop">Voir la boutique</a>
      </div>`;
    if (countEl)   countEl.textContent   = '0 article';
    if (subEl)     subEl.textContent     = formatPrice(0);
    if (totalEl)   totalEl.textContent   = formatPrice(0);
    return;
  }

  /* Items */
  itemsEl.innerHTML = cart.map(item => {
    const qty   = item.quantity || 1;
    const price = (item.price || 0) * qty;
    const img   = item.image
      ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name || '')}" class="summary__item-img" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="summary__item-img summary__item-img--placeholder"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

    return `
      <div class="summary__item">
        ${img}
        <div class="summary__item-info">
          <span class="summary__item-name">${escapeHTML(item.name || 'Article')}</span>
          ${item.variant ? `<span class="summary__item-variant">${escapeHTML(item.variant)}</span>` : ''}
          <span class="summary__item-qty">Qté : ${qty}</span>
        </div>
        <span class="summary__item-price">${formatPrice(price)}</span>
      </div>`;
  }).join('');

  if (countEl)  countEl.textContent  = `${totalQty} article${totalQty > 1 ? 's' : ''}`;
  if (subEl)    subEl.textContent    = formatPrice(subtotal);
  if (totalEl)  totalEl.textContent  = formatPrice(subtotal);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════
   VALIDATION FORMULAIRE
══════════════════════════════════════ */

function validateForm(data) {
  const errors = [];

  if (!data.customer_name.trim()) {
    errors.push({ field: 'customer_name', msg: 'Veuillez saisir votre nom complet.' });
  } else if (data.customer_name.trim().length < 3) {
    errors.push({ field: 'customer_name', msg: 'Le nom doit contenir au moins 3 caractères.' });
  }

  if (!data.customer_phone.trim()) {
    errors.push({ field: 'customer_phone', msg: 'Veuillez saisir votre numéro de téléphone.' });
  } else if (!isValidPhone(data.customer_phone)) {
    errors.push({ field: 'customer_phone', msg: 'Numéro invalide. Ex : 6XX XX XX XX' });
  }

  if (!data.customer_address.trim()) {
    errors.push({ field: 'customer_address', msg: 'Veuillez saisir votre adresse de livraison.' });
  } else if (data.customer_address.trim().length < 10) {
    errors.push({ field: 'customer_address', msg: 'Adresse trop courte. Précisez quartier, rue, repère.' });
  }

  return errors;
}

/** Affiche / efface les erreurs dans le formulaire */
function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  let errEl = input.parentElement.querySelector('.field__error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field__error';
    input.parentElement.appendChild(errEl);
  }

  if (message) {
    errEl.textContent = message;
    input.classList.add('input--error');
    input.setAttribute('aria-invalid', 'true');
  } else {
    errEl.textContent = '';
    input.classList.remove('input--error');
    input.removeAttribute('aria-invalid');
  }
}

function clearAllErrors(form) {
  form.querySelectorAll('.field__error').forEach(el => el.textContent = '');
  form.querySelectorAll('.input--error, .textarea--error').forEach(el => {
    el.classList.remove('input--error', 'textarea--error');
    el.removeAttribute('aria-invalid');
  });
}

/* ══════════════════════════════════════
   CONSTRUIRE L'OBJET COMMANDE
══════════════════════════════════════ */

function buildOrderPayload(formData) {
  const cart     = getCart();
  const subtotal = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  return {
    customer_name    : formData.customer_name.trim(),
    customer_phone   : formatPhone(formData.customer_phone.trim()),
    customer_address : formData.customer_address.trim(),
    customer_city    : (formData.customer_city || '').trim(),
    notes            : (formData.notes || '').trim(),
    payment_method   : 'cash_on_delivery',
    items            : cart,
    subtotal         : subtotal,
    currency         : CURRENCY,
    status           : 'pending',
    created_at       : new Date().toISOString(),
    source           : 'web',
  };
}

/* ══════════════════════════════════════
   ENVOI SUPABASE
══════════════════════════════════════ */

async function saveOrderToSupabase(payload) {
  if (!supabase) return { data: null, error: null, skipped: true };

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([payload])
      .select()
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/* ══════════════════════════════════════
   MESSAGE WHATSAPP
══════════════════════════════════════ */

function buildWhatsAppMessage(payload) {
  const items = payload.items.map(i =>
    `• ${i.name || 'Article'} × ${i.quantity || 1} — ${formatPrice((i.price || 0) * (i.quantity || 1))}`
  ).join('\n');

  const lines = [
    `🛍️ *Nouvelle commande Tinda*`,
    ``,
    `*Client :* ${payload.customer_name}`,
    `*Tél :* ${payload.customer_phone}`,
    `*Adresse :* ${payload.customer_address}`,
    payload.customer_city ? `*Ville :* ${payload.customer_city}` : null,
    payload.notes ? `*Notes :* ${payload.notes}` : null,
    ``,
    `*Articles :*`,
    items,
    ``,
    `*Total estimé :* ${formatPrice(payload.subtotal)}`,
    `*Paiement :* À la livraison`,
    ``,
    `_Commande passée le ${new Date().toLocaleString('fr-FR')}_`,
  ].filter(l => l !== null).join('\n');

  return encodeURIComponent(lines);
}

function openWhatsApp(payload) {
  const msg = buildWhatsAppMessage(payload);
  const phone = WHATSAPP_NUM.replace(/\D/g, '');
  const url   = `https://wa.me/${phone}?text=${msg}`;

  /* Mobile : ouverture directe ; Desktop : nouvel onglet */
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/* ══════════════════════════════════════
   ÉTAT DU BOUTON (loading / ready)
══════════════════════════════════════ */

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg class="spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      Envoi en cours…`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
  }
}

/* ══════════════════════════════════════
   REDIRECTION PAGE CONFIRMATION
══════════════════════════════════════ */

function redirectToConfirmation(orderId) {
  /* Stockage temporaire pour la page de confirmation */
  try {
    const order = JSON.parse(localStorage.getItem(ORDER_KEY) || '{}');
    if (orderId) order.id = orderId;
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {}

  /* Petite pause pour que le toast soit visible */
  setTimeout(() => {
    window.location.href = 'confirmation.html';
  }, 1500);
}

/* ══════════════════════════════════════
   SOUMISSION — BOUTON PRINCIPAL
══════════════════════════════════════ */

async function handleConfirmSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('checkoutForm');
  const btn  = document.getElementById('confirmBtn');
  if (!form) return;

  clearAllErrors(form);

  const formData = {
    customer_name    : document.getElementById('customer_name')?.value    || '',
    customer_phone   : document.getElementById('customer_phone')?.value   || '',
    customer_address : document.getElementById('customer_address')?.value || '',
    customer_city    : document.getElementById('customer_city')?.value    || '',
    notes            : document.getElementById('notes')?.value            || '',
  };

  /* Validation */
  const errors = validateForm(formData);
  if (errors.length) {
    errors.forEach(err => setFieldError(err.field, err.msg));
    /* Scroll vers la première erreur (mobile) */
    const firstErr = document.getElementById(errors[0].field);
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Veuillez corriger les champs indiqués.', 'error');
    return;
  }

  /* Panier vide ? */
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Votre panier est vide. Ajoutez des articles avant de commander.', 'error');
    setTimeout(() => window.location.href = 'shop.html', 2000);
    return;
  }

  setButtonLoading(btn, true);

  const payload = buildOrderPayload(formData);

  /* Sauvegarde locale immédiate */
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(payload)); } catch {}

  /* Tentative Supabase */
  const { data, error, skipped } = await saveOrderToSupabase(payload);

  if (!skipped && error) {
    console.error('[Tinda] Supabase error:', error);
    /* On continue quand même — fallback WhatsApp */
    showToast('Commande enregistrée localement. Le vendeur sera contacté.', 'info');
  } else if (!skipped && data) {
    payload.id = data.id;
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(payload)); } catch {}
  }

  /* Vider le panier */
  clearCart();
  renderSummary();

  showToast('✓ Commande confirmée ! Redirection en cours…', 'success', 3000);
  setButtonLoading(btn, false);

  redirectToConfirmation(payload.id);
}

/* ══════════════════════════════════════
   SOUMISSION — BOUTON WHATSAPP
══════════════════════════════════════ */

function handleWhatsAppOrder() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  clearAllErrors(form);

  const formData = {
    customer_name    : document.getElementById('customer_name')?.value    || '',
    customer_phone   : document.getElementById('customer_phone')?.value   || '',
    customer_address : document.getElementById('customer_address')?.value || '',
    customer_city    : document.getElementById('customer_city')?.value    || '',
    notes            : document.getElementById('notes')?.value            || '',
  };

  /* Pour WhatsApp on tolère des données partielles mais on prévient */
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Votre panier est vide.', 'error');
    return;
  }

  if (!formData.customer_name.trim() || !formData.customer_phone.trim()) {
    showToast('Renseignez votre nom et téléphone avant de continuer.', 'info');
    ['customer_name','customer_phone'].forEach(id => {
      const val = document.getElementById(id)?.value || '';
      if (!val.trim()) setFieldError(id, 'Requis pour le suivi WhatsApp.');
    });
    return;
  }

  const payload = buildOrderPayload(formData);

  /* Sauvegarde optionnelle Supabase en arrière-plan */
  saveOrderToSupabase({ ...payload, source: 'whatsapp' }).catch(() => {});

  openWhatsApp(payload);
  showToast('Ouverture WhatsApp…', 'info', 2500);
}

/* ══════════════════════════════════════
   VALIDATION EN TEMPS RÉEL (UX)
══════════════════════════════════════ */

function setupLiveValidation() {
  const fields = [
    { id: 'customer_name',    check: v => v.trim().length >= 3 ? '' : 'Minimum 3 caractères.' },
    { id: 'customer_phone',   check: v => !v.trim() || isValidPhone(v) ? '' : 'Format : 6XX XX XX XX' },
    { id: 'customer_address', check: v => v.trim().length >= 10 ? '' : 'Adresse trop courte.' },
  ];

  fields.forEach(({ id, check }) => {
    const el = document.getElementById(id);
    if (!el) return;

    let touched = false;
    el.addEventListener('blur', () => {
      touched = true;
      setFieldError(id, check(el.value));
    });
    el.addEventListener('input', () => {
      if (touched) setFieldError(id, check(el.value));
    });
  });

  /* Formatage automatique du téléphone */
  const phoneInput = document.getElementById('customer_phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      let val = this.value.replace(/[^\d\s+\-()]/g, '');
      this.value = val;
    });
  }
}

/* ══════════════════════════════════════
   RESPONSIVE : TOGGLE RÉSUMÉ (mobile)
══════════════════════════════════════ */

function setupMobileSummaryToggle() {
  /* Sur mobile (<768px) on ajoute un toggle pour le résumé commande */
  const summary = document.querySelector('.summary');
  const grid    = document.querySelector('.checkout-grid');
  if (!summary || !grid) return;

  const isMobile = () => window.innerWidth < 768;

  function injectToggle() {
    if (!isMobile() || document.getElementById('summaryToggle')) return;

    const toggle = document.createElement('button');
    toggle.id        = 'summaryToggle';
    toggle.className = 'summary__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `
      <span>Voir le résumé de commande</span>
      <svg class="summary__toggle-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    const summaryBody = document.createElement('div');
    summaryBody.className = 'summary__body--collapsible';
    summaryBody.style.display = 'none';

    /* Déplacer le contenu interne dans le body collapsible */
    while (summary.firstChild) summaryBody.appendChild(summary.firstChild);
    summary.appendChild(toggle);
    summary.appendChild(summaryBody);

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      summaryBody.style.display = expanded ? 'none' : 'block';
      toggle.querySelector('span').textContent = expanded
        ? 'Voir le résumé de commande'
        : 'Masquer le résumé';
    });
  }

  injectToggle();
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      /* Rétablir l'état desktop si on redimensionne */
      const toggle = document.getElementById('summaryToggle');
      const body   = summary.querySelector('.summary__body--collapsible');
      if (toggle && body) {
        body.style.display = '';
      }
    }
  }, { passive: true });
}

/* ══════════════════════════════════════
   PANIER VIDE → REDIRECTION
══════════════════════════════════════ */

function guardEmptyCart() {
  const cart = getCart();
  if (cart.length === 0) {
    const main = document.getElementById('mainPage');
    if (main) {
      main.insertAdjacentHTML('afterbegin', `
        <div class="empty-cart-notice">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.4"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits pour passer commande.</p>
          <a href="shop.html" class="btn-confirm" style="display:inline-flex;width:auto;text-decoration:none">Voir la boutique</a>
        </div>`);
    }
  }
}

/* ══════════════════════════════════════
   CSS DYNAMIQUE (toasts + erreurs + spinner)
   Injecté une seule fois si checkout.css
   ne contient pas déjà ces règles
══════════════════════════════════════ */

function injectBaseStyles() {
  if (document.getElementById('checkout-js-styles')) return;
  const style = document.createElement('style');
  style.id = 'checkout-js-styles';
  style.textContent = `
    /* ─ Toasts ─ */
    .toast-container{position:fixed;bottom:1.25rem;right:1.25rem;left:auto;display:flex;flex-direction:column;gap:.5rem;z-index:9999;pointer-events:none;max-width:calc(100vw - 2.5rem)}
    .toast{display:flex;align-items:center;gap:.6rem;padding:.65rem 1rem;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.10);font-size:.875rem;pointer-events:all;opacity:0;transform:translateY(8px);transition:opacity .22s,transform .22s;max-width:340px}
    .toast--visible{opacity:1;transform:translateY(0)}
    .toast--success{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
    .toast--error{border-color:#fecaca;background:#fef2f2;color:#991b1b}
    .toast--info{border-color:#bfdbfe;background:#eff6ff;color:#1e40af}
    .toast__close{margin-left:auto;background:none;border:none;cursor:pointer;opacity:.6;padding:2px;display:flex}
    .toast__close:hover{opacity:1}
    @media(max-width:480px){.toast-container{left:1rem;right:1rem;bottom:1rem}.toast{max-width:100%}}

    /* ─ Erreurs champs ─ */
    .field__error{display:block;font-size:.78rem;color:#dc2626;margin-top:.3rem;line-height:1.4}
    .input--error,.textarea--error{border-color:#f87171!important;background:#fef2f2}

    /* ─ Spinner ─ */
    @keyframes spin{to{transform:rotate(360deg)}}
    .spin{animation:spin .8s linear infinite;display:inline-block}

    /* ─ Panier vide notice ─ */
    .empty-cart-notice{text-align:center;padding:3rem 1rem;display:flex;flex-direction:column;align-items:center;gap:1rem}
    .empty-cart-notice h2{font-size:1.25rem;font-weight:600;color:#111827}
    .empty-cart-notice p{color:#6b7280;font-size:.95rem}

    /* ─ Résumé items ─ */
    .summary__item{display:flex;align-items:flex-start;gap:.75rem;padding:.6rem 0;border-bottom:1px solid #f3f4f6}
    .summary__item:last-child{border-bottom:none}
    .summary__item-img{width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#f9fafb}
    .summary__item-img--placeholder{display:flex;align-items:center;justify-content:center;color:#d1d5db}
    .summary__item-info{flex:1;min-width:0}
    .summary__item-name{display:block;font-size:.875rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .summary__item-variant{display:block;font-size:.78rem;color:#6b7280}
    .summary__item-qty{display:block;font-size:.78rem;color:#9ca3af}
    .summary__item-price{font-size:.875rem;font-weight:600;white-space:nowrap;flex-shrink:0}
    .summary__empty{text-align:center;padding:1.5rem;display:flex;flex-direction:column;align-items:center;gap:.75rem;color:#9ca3af;font-size:.875rem}
    .btn-back-shop{font-size:.85rem;color:#2563eb;text-decoration:underline;background:none;border:none;cursor:pointer}

    /* ─ Toggle mobile résumé ─ */
    .summary__toggle{width:100%;background:none;border:none;border-radius:8px;padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:.9rem;font-weight:500;color:#111827}
    .summary__toggle:hover{background:#f9fafb}
    .summary__toggle-arrow{transition:transform .2s}
    .summary__toggle[aria-expanded="true"] .summary__toggle-arrow{transform:rotate(180deg)}
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */

function init() {
  injectBaseStyles();
  renderSummary();
  guardEmptyCart();
  setupLiveValidation();
  setupMobileSummaryToggle();

  /* Listener formulaire principal */
  const form = document.getElementById('checkoutForm');
  if (form) form.addEventListener('submit', handleConfirmSubmit);

  /* Listener bouton WhatsApp */
  const waBtn = document.getElementById('whatsappBtn');
  if (waBtn) waBtn.addEventListener('click', handleWhatsAppOrder);

  /* Mise à jour du badge panier dans la navbar */
  const cart = getCart();
  const badge = document.getElementById('cartCount');
  if (badge) {
    const qty = cart.reduce((s, i) => s + (i.quantity || 1), 0);
    badge.textContent = qty;
    badge.style.display = qty > 0 ? '' : 'none';
  }
}

/* Lancement après chargement du DOM */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}