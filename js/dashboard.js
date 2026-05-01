/* =============================================================
   dashboard.js — Tinda
   Gestion vendeur : commandes · produits · catégories
============================================================= */

let currentVendor   = null;
let realtimeChannel = null;
let orderFilter     = 'all';
let allCategories   = [];
let allOrders       = [];
let uploadedImages  = [];
let productColors   = [];

const MAX_IMAGES = 5;

/* ─────────────────────────── AUTH GUARD ─────────────────────────── */
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return (location.href = 'login.html');

  document.getElementById('userEmail').textContent = session.user.email;

  const { data: vendor, error } = await sb
    .from('vendors')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .maybeSingle();

  if (error || !vendor) {
    toast('Aucune boutique associée à ce compte.', 'error');
    return;
  }
  currentVendor = vendor;

  await Promise.all([loadOrders(), loadProducts(), loadCategories()]);
  subscribeToOrders();
})();

/* Nettoyage Realtime au changement de page */
window.addEventListener('beforeunload', () => {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
});

/* ─────────────────────────── NAV SIDEBAR ─────────────────────────── */
const views = ['orders', 'products', 'categories'];

document.querySelectorAll('.dash__side button[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash__side button[data-view]')
      .forEach((b) => b.classList.toggle('is-active', b === btn));
    views.forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.hidden = v !== btn.dataset.view;
    });
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  await sb.auth.signOut();
  location.href = 'login.html';
});

/* ══════════════════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════════════════ */
const ordersList = document.getElementById('ordersList');

document.querySelectorAll('[data-filter]').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]')
      .forEach((x) => x.classList.toggle('is-active', x === t));
    orderFilter = t.dataset.filter;
    renderOrders();
  });
});

async function loadOrders() {
  showLoader(ordersList);
  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('vendor_id', currentVendor.id)
    .order('created_at', { ascending: false });

  if (error) return showError(ordersList, error);
  allOrders = data || [];
  renderOrders();
}

function renderOrders() {
  const filtered = orderFilter === 'all'
    ? allOrders
    : allOrders.filter((o) => o.status === orderFilter);

  if (!filtered.length) {
    return showEmpty(ordersList, 'Aucune commande dans cette catégorie.');
  }

  const statusLabel = { pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée' };

  ordersList.innerHTML = filtered.map((o) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-weight:700;font-family:monospace;font-size:15px">${escapeHTML(o.order_number)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${new Date(o.created_at).toLocaleString('fr-FR')}</div>
        </div>
        <span class="pill pill--${o.status}">${statusLabel[o.status] || o.status}</span>
      </div>

      <div style="margin:14px 0;padding:12px 14px;background:var(--bg);border-radius:8px">
        <div style="font-weight:600">${escapeHTML(o.customer_name)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">
          ${escapeHTML(o.customer_phone)} · ${escapeHTML(o.customer_address)}${o.customer_city ? ', ' + escapeHTML(o.customer_city) : ''}
        </div>
        ${o.notes ? `<div style="font-size:13px;color:var(--muted);margin-top:6px;font-style:normal">« ${escapeHTML(o.notes)} »</div>` : ''}
      </div>

      <table class="table" style="margin-bottom:12px">
        <tbody>
          ${(o.order_items || []).map((i) => `
            <tr>
              <td>${escapeHTML(i.name)}</td>
              <td style="text-align:center;color:var(--muted)">× ${i.quantity}</td>
              <td style="text-align:right;font-weight:600">${formatXAF(i.subtotal)}</td>
            </tr>
          `).join('')}
          <tr style="font-weight:800;font-size:15px">
            <td colspan="2">Total</td>
            <td style="text-align:right;color:var(--orange)">${formatXAF(o.total)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${o.status === 'pending' ? `
          <button class="btn btn--primary btn--sm" data-accept="${o.id}">✓ Accepter</button>
          <button class="btn btn--danger btn--sm" data-reject="${o.id}">✕ Refuser</button>
        ` : ''}
        <a href="https://wa.me/${escapeHTML(o.customer_phone.replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer" class="btn btn--whatsapp btn--sm">
          WhatsApp
        </a>
      </div>
    </div>
  `).join('');
}

ordersList.addEventListener('click', async (e) => {
  const accept = e.target.closest('[data-accept]');
  const reject = e.target.closest('[data-reject]');
  if (!accept && !reject) return;

  const btn = accept || reject;
  const id = btn.dataset.accept || btn.dataset.reject;
  const status = accept ? 'accepted' : 'rejected';

  btn.disabled = true;
  const { error } = await sb.from('orders').update({ status }).eq('id', id);
  if (error) {
    btn.disabled = false;
    return toast(error.message, 'error');
  }
  toast(`Commande ${status === 'accepted' ? 'acceptée' : 'refusée'}`, 'success');
  await loadOrders();
});

/* Realtime */
function subscribeToOrders() {
  realtimeChannel = sb
    .channel('orders-vendor-' + currentVendor.id)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${currentVendor.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') toast('🎉 Nouvelle commande reçue !', 'success');
          loadOrders();
        })
    .subscribe();
}

/* ══════════════════════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════════════════════ */
const categoriesList = document.getElementById('categoriesList');

async function loadCategories() {
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .eq('vendor_id', currentVendor.id)
    .order('position', { ascending: true, nullsFirst: false })
    .order('name');

  if (error) { console.error(error); return; }
  allCategories = data || [];
  renderCategorySelect();
  renderCategoriesList();
}

function renderCategorySelect() {
  const sel = document.getElementById('categorySelect');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Sans catégorie —</option>' +
    allCategories.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML((c.icon ? c.icon + ' ' : '') + c.name)}</option>`).join('');
  if (current) sel.value = current;
}

function renderCategoriesList() {
  if (!categoriesList) return;
  if (!allCategories.length) {
    showEmpty(categoriesList, 'Aucune catégorie. Créez votre première catégorie !');
    return;
  }
  categoriesList.innerHTML = `
    <div class="cat-list">
      ${allCategories.map((c) => `
        <div class="cat-item">
          <div>
            <div class="cat-item__name">${escapeHTML((c.icon ? c.icon + ' ' : '') + c.name)}</div>
            <div class="cat-item__slug">/categories/${escapeHTML(c.slug)}</div>
          </div>
          <div class="cat-item__actions">
            <button class="btn btn--danger btn--sm" data-delcat="${escapeHTML(c.id)}">Supprimer</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* Create from main categories view */
const newCatBtnMain = document.getElementById('newCatBtnMain');
const catFormWrap   = document.getElementById('catFormWrap');
const catFormName   = document.getElementById('catFormName');
const catFormIcon   = document.getElementById('catFormIcon');
const catFormSave   = document.getElementById('catFormSave');
const catFormCancel = document.getElementById('catFormCancel');

if (newCatBtnMain) {
  newCatBtnMain.addEventListener('click', () => {
    catFormWrap.style.display = 'block';
    catFormName.focus();
  });
}
if (catFormCancel) {
  catFormCancel.addEventListener('click', () => {
    catFormWrap.style.display = 'none';
    catFormName.value = '';
    catFormIcon.value = '';
  });
}
if (catFormSave) {
  catFormSave.addEventListener('click', () => createCategory(catFormName.value, catFormIcon.value, true));
}

/* Inline create from product form */
const openCatCreate  = document.getElementById('openCatCreate');
const catCreateBox   = document.getElementById('catCreateBox');
const newCatNameInp  = document.getElementById('newCatName');
const saveCatBtn     = document.getElementById('saveCatBtn');
const closeCatCreate = document.getElementById('closeCatCreate');

if (openCatCreate) {
  openCatCreate.addEventListener('click', () => {
    catCreateBox.style.display = catCreateBox.style.display === 'none' ? 'block' : 'none';
    if (catCreateBox.style.display === 'block') newCatNameInp.focus();
  });
}
if (closeCatCreate) {
  closeCatCreate.addEventListener('click', () => { catCreateBox.style.display = 'none'; });
}
if (saveCatBtn) {
  saveCatBtn.addEventListener('click', () => createCategory(newCatNameInp.value, '', false));
}

async function createCategory(name, icon, fromMainView = false) {
  name = (name || '').trim();
  if (!name) return toast('Donnez un nom à la catégorie', 'error');

  const slug = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const { data, error } = await sb.from('categories').insert({
    vendor_id: currentVendor.id,
    name, slug,
    icon: icon || null,
  }).select().single();

  if (error) return toast(error.message, 'error');
  toast(`Catégorie « ${name} » créée`, 'success');

  allCategories.push(data);
  renderCategorySelect();
  renderCategoriesList();

  const sel = document.getElementById('categorySelect');
  if (sel && !fromMainView) {
    sel.value = data.id;
    catCreateBox.style.display = 'none';
    newCatNameInp.value = '';
  }

  if (fromMainView) {
    catFormWrap.style.display = 'none';
    catFormName.value = '';
    catFormIcon.value = '';
  }
}

/* Delete category */
if (categoriesList) {
  categoriesList.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-delcat]');
    if (!del) return;
    if (!confirm('Supprimer cette catégorie ? Les produits associés ne seront pas supprimés.')) return;
    const { error } = await sb.from('categories').delete().eq('id', del.dataset.delcat);
    if (error) return toast(error.message, 'error');
    toast('Catégorie supprimée', 'success');
    await loadCategories();
  });
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════════════════ */
const productsList    = document.getElementById('productsList');
const productFormWrap = document.getElementById('productFormWrap');
const productForm     = document.getElementById('productForm');

async function loadProducts() {
  showLoader(productsList);
  const { data, error } = await sb
    .from('products')
    .select('*, categories(name)')
    .eq('vendor_id', currentVendor.id)
    .order('created_at', { ascending: false });

  if (error) return showError(productsList, error);
  if (!data.length) return showEmpty(productsList, 'Aucun produit. Ajoutez votre premier produit !');

  productsList.innerHTML = `
    <div class="card" style="padding:0;overflow:hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Catégorie</th>
            <th>Prix</th>
            <th>Stock</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.map((p) => `
            <tr>
              <td style="display:flex;gap:12px;align-items:center">
                <img src="${escapeHTML(p.image_url)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);flex-shrink:0" onerror="this.src='${IMG_FALLBACK}'" alt="">
                <div>
                  <div style="font-weight:600;font-size:14px">${escapeHTML(p.name)}</div>
                  ${p.badge ? `<span class="badge badge--${p.badge}" style="font-size:10px;margin-top:3px;position:static">${escapeHTML(badgeLabel(p.badge))}</span>` : ''}
                </div>
              </td>
              <td style="font-size:13px;color:var(--muted)">${escapeHTML(p.categories?.name || '—')}</td>
              <td style="font-weight:600">${formatXAF(p.price)}</td>
              <td>${p.stock}</td>
              <td>${p.active ? '<span class="pill pill--accepted">Actif</span>' : '<span class="pill">Inactif</span>'}</td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn btn--ghost btn--sm" data-edit="${encodeURIComponent(JSON.stringify(p))}">Modifier</button>
                <button class="btn btn--danger btn--sm" data-del="${escapeHTML(p.id)}" style="margin-left:6px">Supprimer</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* Open / Close form */
document.getElementById('newProductBtn')?.addEventListener('click', () => openProductModal());
document.getElementById('cancelBtn')?.addEventListener('click',   closeProductModal);
document.getElementById('cancelBtn2')?.addEventListener('click',  closeProductModal);

function openProductModal(p = null) {
  document.getElementById('modalTitle').textContent = p ? 'Modifier le produit' : 'Nouveau produit';
  productForm.reset();
  productForm.id.value = p?.id || '';

  if (p) {
    productForm.name.value        = p.name;
    productForm.description.value = p.description;
    productForm.price.value       = p.price;
    productForm.old_price.value   = p.old_price || '';
    productForm.stock.value       = p.stock;
    document.getElementById('activeToggle').checked = !!p.active;

    const sel = document.getElementById('categorySelect');
    if (sel) sel.value = p.category_id || '';
  } else {
    document.getElementById('activeToggle').checked = true;
  }

  setBadgeChip(p?.badge || '');

  uploadedImages = [];
  if (p) {
    const imgs = Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []);
    imgs.forEach((url) => uploadedImages.push({ url, isExternal: true }));
  }
  renderImagePreviews();

  productColors = Array.isArray(p?.colors) ? [...p.colors] : [];
  renderColorTags();

  productFormWrap.style.display = 'block';
  productFormWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeProductModal() {
  productFormWrap.style.display = 'none';
  uploadedImages = [];
  productColors  = [];
  productForm.reset();
}

/* Products list events */
productsList.addEventListener('click', async (e) => {
  const edit = e.target.closest('[data-edit]');
  const del  = e.target.closest('[data-del]');

  if (edit) {
    try {
      const p = JSON.parse(decodeURIComponent(edit.dataset.edit));
      openProductModal(p);
      productFormWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Erreur parsing produit:', err);
      toast('Impossible de charger ce produit', 'error');
    }
  }
  if (del) {
    if (!confirm('Supprimer ce produit ? Les images associées et les références dans les commandes seront également supprimées.')) return;

    // Supprimer les références dans order_items
    const { error: orderItemsError } = await sb.from('order_items').delete().eq('product_id', del.dataset.del);
    if (orderItemsError) return toast(orderItemsError.message, 'error');

    // Récupérer les images avant suppression pour nettoyage du storage
    const { data: prod } = await sb.from('products').select('images, image_url').eq('id', del.dataset.del).maybeSingle();

    const { error } = await sb.from('products').delete().eq('id', del.dataset.del);
    if (error) return toast(error.message, 'error');

    // Nettoyage storage (best effort)
    if (prod) {
      const urls = prod.images?.length ? prod.images : (prod.image_url ? [prod.image_url] : []);
      urls.forEach((url) => deleteProductImage(url));
    }

    toast('Produit supprimé', 'success');
    loadProducts();
  }
});

/* ── Submit product form ── */
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  const originalHTML = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enregistrement…';

  try {
    const fd = new FormData(productForm);
    const imageUrls = uploadedImages.map((i) => i.url).filter(Boolean);

    if (!imageUrls.length) {
      toast('Ajoutez au moins une image', 'error');
      return;
    }

    const name = (fd.get('name') || '').trim();
    const description = (fd.get('description') || '').trim();
    const price = parseInt(fd.get('price'), 10);
    const stock = parseInt(fd.get('stock'), 10);

    if (!name || !description || isNaN(price) || isNaN(stock)) {
      toast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const payload = {
      vendor_id:   currentVendor.id,
      name,
      description,
      price,
      old_price:   fd.get('old_price') ? parseInt(fd.get('old_price'), 10) : null,
      stock,
      active:      document.getElementById('activeToggle').checked,
      category_id: fd.get('category_id') || null,
      badge:       fd.get('badge') || null,
      image_url:   imageUrls[0],
      images:      imageUrls,
      colors:      productColors,
    };

    const id = fd.get('id');
    const { error } = id
      ? await sb.from('products').update(payload).eq('id', id)
      : await sb.from('products').insert(payload);

    if (error) {
      console.error('Erreur Supabase:', error);
      toast(error.message || 'Erreur lors de l\'enregistrement', 'error');
      return;
    }

    toast(id ? 'Produit modifié ✓' : 'Produit ajouté ✓', 'success');
    closeProductModal();
    await loadProducts();
  } catch (err) {
    console.error('Erreur produit:', err);
    toast(err.message || 'Erreur inattendue', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML;
  }
});

/* ══════════════════════════════════════════════════════════════════
   BADGE CHIPS
══════════════════════════════════════════════════════════════════ */
function setBadgeChip(value) {
  document.querySelectorAll('.badge-chip').forEach((chip) => {
    const input = chip.querySelector('input[type="radio"]');
    if (!input) return;
    const isSelected = input.value === value;
    input.checked = isSelected;
    chip.classList.toggle('is-selected', isSelected);
  });
}

document.querySelectorAll('.badge-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const input = chip.querySelector('input[type="radio"]');
    if (input) setBadgeChip(input.value);
  });
});

/* ══════════════════════════════════════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════════════════════════════════════ */
const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const previewsEl   = document.getElementById('imagePreviews');
const progressWrap = document.getElementById('uploadProgress');
const progressBar  = document.getElementById('uploadProgressBar');

/* Click zone → file dialog */
uploadZone?.addEventListener('click', (e) => {
  // éviter double dialog si on clique sur l'input
  if (e.target.tagName === 'INPUT') return;
  fileInput.click();
});

/* Drag & drop */
uploadZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('is-drag-over');
});
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('is-drag-over'));
uploadZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('is-drag-over');
  handleFiles(Array.from(e.dataTransfer.files));
});

fileInput?.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

async function handleFiles(files) {
  const remaining = MAX_IMAGES - uploadedImages.length;
  if (remaining <= 0) {
    toast(`Maximum ${MAX_IMAGES} images atteint`, 'error');
    return;
  }

  const toProcess = files.slice(0, remaining);
  const errors = validateFiles(toProcess);
  if (errors.length) {
    toast(errors.join(' · '), 'error');
    return;
  }

  progressWrap.style.display = 'block';
  progressBar.style.width = '0%';

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    try {
      progressBar.style.width = `${Math.round(((i + 0.3) / toProcess.length) * 100)}%`;
      const compressed = await compressImage(file);
      const url = await uploadProductImage(compressed);
      uploadedImages.push({ url });
      renderImagePreviews();
      progressBar.style.width = `${Math.round(((i + 1) / toProcess.length) * 100)}%`;
    } catch (err) {
      console.error('Upload error:', err);
      toast(`Erreur upload ${file.name} : ${err.message}`, 'error');
    }
  }

  setTimeout(() => { progressWrap.style.display = 'none'; }, 600);
}

function renderImagePreviews() {
  if (!previewsEl) return;
  previewsEl.innerHTML = uploadedImages.map((img, idx) => `
    <div class="image-preview ${idx === 0 ? 'image-preview--primary' : ''}">
      <img src="${escapeHTML(img.url)}" alt="Image ${idx + 1}" onerror="this.style.opacity='.3'">
      <button type="button" class="image-preview__del" data-imgidx="${idx}" title="Supprimer">×</button>
    </div>
  `).join('');
}

previewsEl?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-imgidx]');
  if (!btn) return;
  const idx = parseInt(btn.dataset.imgidx, 10);
  const img = uploadedImages[idx];

  // Supprimer aussi du storage si ce n'est pas une image héritée d'un produit existant
  // (on supprime seulement si on est en mode "nouveau produit" OU si on veut vraiment nettoyer)
  // Pour l'instant, on ne supprime pas du storage à l'édition pour éviter les orphelins
  // Le nettoyage se fait à la suppression du produit complet
  uploadedImages.splice(idx, 1);
  renderImagePreviews();
});

/* ══════════════════════════════════════════════════════════════════
   COLOR MANAGEMENT
══════════════════════════════════════════════════════════════════ */
const colorPicker = document.getElementById('colorPicker');
const colorName   = document.getElementById('colorName');
const addColorBtn = document.getElementById('addColorBtn');
const colorTags   = document.getElementById('colorTags');

addColorBtn?.addEventListener('click', () => {
  const hex  = colorPicker.value;
  const name = colorName.value.trim() || hex;
  if (productColors.some((c) => c.hex === hex)) {
    toast('Cette couleur est déjà ajoutée', 'error');
    return;
  }
  productColors.push({ hex, name });
  colorName.value = '';
  renderColorTags();
});

colorName?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addColorBtn.click(); }
});

function renderColorTags() {
  if (!colorTags) return;
  colorTags.innerHTML = productColors.map((c, i) => `
    <div class="color-tag">
      <span class="color-tag__swatch" style="background:${escapeHTML(c.hex)}"></span>
      <span>${escapeHTML(c.name)}</span>
      <span class="color-tag__remove" data-coloridx="${i}" title="Retirer">×</span>
    </div>
  `).join('');
}

colorTags?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-coloridx]');
  if (!btn) return;
  productColors.splice(parseInt(btn.dataset.coloridx, 10), 1);
  renderColorTags();
});
