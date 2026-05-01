/* ══════════════════════════════════════
   CONFIG
══════════════════════════════════════ */
const SUPABASE_URL             = 'https://uytrjgtrpsbegifudosi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
const SUPPORT_WHATSAPP         = '237693421348';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatXAF(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0);
}

function genOrderNumber() {
  return 'TND-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function toast(msg, type = 'info') {
  const tc = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  const icon = type === 'success'
    ? '<polyline points="20 6 9 17 4 12"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>';
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${icon}</svg>${esc(msg)}`;
  tc.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ══════════════════════════════════════
   CART
══════════════════════════════════════ */
const Cart = {
  get()      { try { return JSON.parse(localStorage.getItem('tindamba_cart') || '[]'); } catch { return []; } },
  clear()    { localStorage.removeItem('tindamba_cart'); },
  count()    { return this.get().reduce((s, i) => s + i.qty, 0); },
  subtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
};

/* ══════════════════════════════════════
   RENDER SUMMARY
══════════════════════════════════════ */
function renderSummary() {
  const items = Cart.get();
  if (!items.length) { window.location.href = 'cart.html'; return; }

  document.getElementById('cartCount').textContent     = Cart.count();
  document.getElementById('summaryCount').textContent  = Cart.count() + ' article' + (Cart.count() > 1 ? 's' : '');
  document.getElementById('summarySubtotal').textContent = formatXAF(Cart.subtotal());
  document.getElementById('summaryTotal').textContent    = formatXAF(Cart.subtotal());

  document.getElementById('summaryItems').innerHTML = items.map(item => `
    <div class="summary-item">
      <img class="summary-item__img"
           src="${esc(item.image || IMG_FALLBACK)}"
           alt="${esc(item.name)}"
           onerror="this.src='${IMG_FALLBACK}'">
      <div class="summary-item__body">
        <div class="summary-item__name">${esc(item.name)}</div>
        <div class="summary-item__meta">
          Qté ${item.qty}
          ${item.color
            ? ` · <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(item.color)};vertical-align:middle;border:1px solid rgba(0,0,0,.12)"></span>`
            : ''}
          ${item.vendor ? ` · <span style="font-size:10px;opacity:.7">${esc(item.vendor)}</span>` : ''}
        </div>
      </div>
      <div class="summary-item__price">${formatXAF(item.price * item.qty)}</div>
    </div>`
  ).join('');
}

/* ══════════════════════════════════════
   FORM VALIDATION
══════════════════════════════════════ */
const REQUIRED = ['customer_name', 'customer_phone', 'customer_address'];

REQUIRED.forEach(id => {
  document.getElementById(id).addEventListener('input', function () {
    if (this.value.trim()) this.classList.remove('is-error');
  });
});

function validateForm() {
  let ok = true;
  REQUIRED.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) { el.classList.add('is-error'); ok = false; }
    else el.classList.remove('is-error');
  });

  // Validation basique du téléphone (min 9 chiffres)
  const phoneEl = document.getElementById('customer_phone');
  const phoneDigits = phoneEl.value.replace(/\D/g, '');
  if (ok && phoneDigits.length < 9) {
    phoneEl.classList.add('is-error');
    toast('Numéro de téléphone invalide (min. 9 chiffres).', 'error');
    ok = false;
  }

  return ok;
}

/* ══════════════════════════════════════
   FETCH VENDOR WHATSAPP
   Récupère le numéro WhatsApp du vendeur
   pour lui notifier directement
══════════════════════════════════════ */
async function fetchVendorPhone(vendorId) {
  if (!vendorId || vendorId === '__unknown__') return null;
  try {
    const { data, error } = await sb
      .from('vendors')
      .select('phone, whatsapp, shop_name')
      .eq('id', vendorId)
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════
   NOTIFY VENDOR VIA WHATSAPP
   Ouvre un lien WA vers le vendeur
   (en arrière-plan sans bloquer le flux)
══════════════════════════════════════ */
function notifyVendorWhatsApp(vendor, orderNumber, fd, vendorItems) {
  const phone = vendor?.whatsapp || vendor?.phone;
  if (!phone) return; // pas de numéro → pas de notif directe

  const lines = vendorItems.map(i =>
    `• ${i.name} × ${i.qty} — ${formatXAF(i.price * i.qty)}`
  ).join('\n');

  const subtotal = vendorItems.reduce((s, i) => s + i.price * i.qty, 0);

  const msg = [
    `🛍️ *Nouvelle commande Tindamba — ${orderNumber}*`,
    '',
    `👤 Client : ${fd.customer_name}`,
    `📞 Tél : ${fd.customer_phone}`,
    `📍 Adresse : ${fd.customer_address}${fd.customer_city ? ', ' + fd.customer_city : ''}`,
    fd.notes ? `📝 Note : ${fd.notes}` : '',
    '',
    '*Articles commandés :*',
    lines,
    '',
    `💰 *Sous-total : ${formatXAF(subtotal)}*`,
    '',
    '_Paiement à la livraison. Contactez le client pour organiser la livraison._',
  ].filter(Boolean).join('\n');

  // Ouvre dans un nouvel onglet sans bloquer le checkout
  const cleanPhone = phone.replace(/\D/g, '');
  window.open(
    `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

/* ══════════════════════════════════════
   SUBMIT → SUPABASE
   Groupé par vendor_id — chaque vendeur
   reçoit sa propre commande
══════════════════════════════════════ */
async function submitOrder(fd) {
  const items = Cart.get();

  // Grouper les articles par vendeur
  // ⚠️ orders.vendor_id est NOT NULL → on rejette les articles sans vendor_id
  const itemsWithoutVendor = items.filter(i => !i.vendor_id);
  if (itemsWithoutVendor.length) {
    console.warn('[Tindamba] Articles sans vendor_id ignorés :', itemsWithoutVendor.map(i => i.name));
  }

  const byVendor = new Map();
  for (const item of items) {
    if (!item.vendor_id) continue; // skip — ne peut pas être inséré
    if (!byVendor.has(item.vendor_id)) byVendor.set(item.vendor_id, []);
    byVendor.get(item.vendor_id).push(item);
  }

  if (!byVendor.size) {
    return { results: [], errors: ['Aucun article valide (vendor_id manquant sur tous les produits).'] };
  }

  const results  = []; // { orderNumber, vendorId, vendorItems, vendorInfo }
  const errors   = [];

  for (const [vendorId, vendorItems] of byVendor) {
    const orderNumber = genOrderNumber();
    const orderTotal  = vendorItems.reduce((s, i) => s + i.price * i.qty, 0);

    // ── Insérer la commande (sans auth requise grâce aux RLS fixes) ──
    const { data: order, error: oErr } = await sb
      .from('orders')
      .insert({
        order_number:     orderNumber,
        vendor_id:        vendorId,
        customer_name:    fd.customer_name,
        customer_phone:   fd.customer_phone,
        customer_address: fd.customer_address,
        customer_city:    fd.customer_city || null,
        total:            orderTotal,
        status:           'pending',
        notes:            fd.notes || null,
      })
      .select('id')
      .single();

    if (oErr || !order) {
      console.error('[Tindamba] Order insert error:', oErr);
      errors.push(oErr?.message || 'Erreur création commande');
      continue;
    }

    // ── Insérer les lignes de commande ──
    const { error: iErr } = await sb
      .from('order_items')
      .insert(vendorItems.map(item => ({
        order_id:   order.id,
        product_id: item.id,
        name:       item.name,
        unit_price: item.price,
        quantity:   item.qty,
        subtotal:   item.price * item.qty,
      })));

    if (iErr) {
      console.error('[Tindamba] Order items insert error:', iErr);
      errors.push(iErr.message);
      continue;
    }

    // ── Récupérer les infos vendeur pour la notification WA ──
    const vendorInfo = await fetchVendorPhone(vendorId);

    results.push({ orderNumber, vendorId, vendorItems, vendorInfo });
  }

  return { results, errors };
}

/* ══════════════════════════════════════
   SUCCESS SCREEN (step 3)
══════════════════════════════════════ */
function showSuccess(results, fd) {
  const orderNumbers = results.map(r => r.orderNumber);
  const num    = orderNumbers[0] || '—';
  const totalAmount = Cart.subtotal(); // capture avant clear

  // Message WA support général
  const waText = encodeURIComponent(
    `Bonjour, j'ai passé une commande Tindamba.\nNom : ${fd.customer_name}\nTél : ${fd.customer_phone}\nCommande : ${orderNumbers.join(', ')}\nTotal : ${formatXAF(totalAmount)}`
  );
  const waLink = `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}?text=${waText}`;

  // Résumé des commandes par vendeur
  const orderSummaryHTML = results.length > 1
    ? `<div style="margin-bottom:20px;text-align:left;background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:var(--radius-md);padding:14px 18px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-tertiary);margin-bottom:10px;">Détail par vendeur</p>
        ${results.map(r => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid var(--color-border-light);">
            <span>${esc(r.vendorInfo?.shop_name || 'Boutique')}</span>
            <span style="font-weight:600;color:var(--color-accent)">${esc(r.orderNumber)}</span>
          </div>`).join('')}
      </div>`
    : '';

  document.getElementById('mainPage').innerHTML = `
    <div class="success-screen">

      <div class="steps" style="margin-bottom:40px">
        <div class="step step--done">
          <span class="step__num"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>
          <span class="step__label">Panier</span>
        </div>
        <div class="step__sep step__sep--done"></div>
        <div class="step step--done">
          <span class="step__num"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>
          <span class="step__label">Livraison</span>
        </div>
        <div class="step__sep step__sep--done"></div>
        <div class="step step--active">
          <span class="step__num"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>
          <span class="step__label">Confirmation</span>
        </div>
      </div>

      <div class="success-screen__icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>

      <h2 class="success-screen__title">Commande confirmée !</h2>

      <p class="success-screen__sub">
        Merci <strong>${esc(fd.customer_name)}</strong> !<br>
        Votre commande a bien été enregistrée. Le vendeur vous contactera au
        <strong>${esc(fd.customer_phone)}</strong> pour organiser la livraison.
      </p>

      <div class="success-screen__order">
        <div class="success-screen__order-label">Numéro de commande</div>
        <div class="success-screen__order-num">${esc(num)}</div>
      </div>

      ${orderSummaryHTML}

      <div class="success-actions">
        <a href="${waLink}" target="_blank" rel="noopener" class="btn-sm-green">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          Contacter le support
        </a>
        <a href="shop.html" class="btn-sm-outline">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Retour boutique
        </a>
      </div>
    </div>`;

  Cart.clear();
  document.getElementById('cartCount').textContent = '0';

  // ── Notifier chaque vendeur par WhatsApp (silencieux) ──
  // Un léger délai pour ne pas bloquer le rendu de la page succès
  setTimeout(() => {
    for (const r of results) {
      if (r.vendorInfo?.whatsapp || r.vendorInfo?.phone) {
        notifyVendorWhatsApp(r.vendorInfo, r.orderNumber, fd, r.vendorItems);
      }
    }
  }, 800);
}

/* ══════════════════════════════════════
   FORM SUBMIT
══════════════════════════════════════ */
document.getElementById('checkoutForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  if (!validateForm()) {
    toast('Veuillez remplir tous les champs obligatoires.', 'error');
    const first = document.querySelector('.is-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('confirmBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Envoi en cours…`;

  const fd = {
    customer_name:    document.getElementById('customer_name').value.trim(),
    customer_phone:   document.getElementById('customer_phone').value.trim(),
    customer_address: document.getElementById('customer_address').value.trim(),
    customer_city:    document.getElementById('customer_city').value.trim(),
    notes:            document.getElementById('notes').value.trim(),
  };

  const { results, errors } = await submitOrder(fd);

  if (errors.length && !results.length) {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
      Confirmer la commande`;

    // Message d'erreur plus lisible
    const errMsg = errors[0].includes('row-level security')
      ? 'Erreur de configuration serveur. Utilisez WhatsApp à la place.'
      : 'Erreur : ' + errors[0];
    toast(errMsg, 'error');
    return;
  }

  // Succès (même partiel si certains vendeurs ont échoué)
  if (errors.length && results.length) {
    toast(`${results.length} commande(s) enregistrée(s). ${errors.length} erreur(s) ignorée(s).`, 'info');
  }

  showSuccess(results, fd);
});

/* ══════════════════════════════════════
   WHATSAPP DIRECT (fallback)
   Commande sans passer par Supabase
══════════════════════════════════════ */
document.getElementById('whatsappBtn').addEventListener('click', function () {
  const name    = document.getElementById('customer_name').value.trim()    || '(non renseigné)';
  const phone   = document.getElementById('customer_phone').value.trim()   || '(non renseigné)';
  const address = document.getElementById('customer_address').value.trim() || '(non renseignée)';
  const city    = document.getElementById('customer_city').value.trim();
  const notes   = document.getElementById('notes').value.trim();
  const items   = Cart.get();
  const lines   = items.map(i =>
    `• ${i.name}${i.vendor ? ' (' + i.vendor + ')' : ''} × ${i.qty} — ${formatXAF(i.price * i.qty)}`
  ).join('\n');

  const msg = [
    '🛍️ *Nouvelle commande Tindamba*',
    '',
    `👤 ${name}`,
    `📞 ${phone}`,
    `📍 ${address}${city ? ', ' + city : ''}`,
    notes ? `📝 ${notes}` : '',
    '',
    '*Articles :*',
    lines,
    '',
    `💰 *Total : ${formatXAF(Cart.subtotal())}*`,
    'Paiement à la livraison.',
  ].filter(Boolean).join('\n');

  window.open(
    `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
    '_blank',
    'noopener'
  );
});

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
renderSummary();
