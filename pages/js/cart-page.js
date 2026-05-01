/* =============================================================
   cart-page.js — Tindamba
   Rendu de la page panier - Version premium
============================================================= */

const itemsEl    = document.getElementById('items');
const countEl    = document.getElementById('count');
const subtotalEl = document.getElementById('subtotal');
const totalEl    = document.getElementById('total');
const goCheckout = document.getElementById('goCheckout');

function render() {
  const items = Cart.get();
  const count = Cart.count();
  const total = Cart.total();
  
  countEl.textContent = count;
  subtotalEl.textContent = formatXAF(total);
  totalEl.textContent = formatXAF(total);

  if (!items.length) {
    renderEmpty();
    disableCheckout();
    return;
  }

  enableCheckout();
  renderItems(items);
}

function renderEmpty() {
  itemsEl.innerHTML = `
    <div class="cart-empty">
      <div class="cart-empty__icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 6L8 16H20L22 6H6Z"/>
          <path d="M6 6L4 2H2"/>
          <circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <h2 class="cart-empty__title">Votre panier est vide</h2>
      <p class="cart-empty__text">Decouvrez notre selection de produits et ajoutez vos favoris au panier.</p>
      <a href="shop.html" class="btn btn--primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        Decouvrir la boutique
      </a>
    </div>
  `;
}

function renderItems(items) {
  itemsEl.innerHTML = items.map((i, index) => `
    <div class="cart-item" style="animation-delay: ${index * 0.05}s">
      <a href="product.html?id=${escapeHTML(i.product_id)}">
        <img src="${escapeHTML(i.image_url)}" alt="${escapeHTML(i.name)}" onerror="this.src='${IMG_FALLBACK}'">
      </a>
      <div style="flex:1;min-width:0">
        <a href="product.html?id=${escapeHTML(i.product_id)}" class="cart-item__name">${escapeHTML(i.name)}</a>
        <div class="cart-item__vendor">${formatXAF(i.unit_price)} l'unite</div>
      </div>
      <div class="qty-ctrl">
        <button type="button" data-dec="${escapeHTML(i.product_id)}" aria-label="Diminuer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/></svg>
        </button>
        <input type="number" min="1" value="${i.quantity}" data-qty="${escapeHTML(i.product_id)}" aria-label="Quantite">
        <button type="button" data-inc="${escapeHTML(i.product_id)}" aria-label="Augmenter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </div>
      <div style="text-align:right;min-width:100px">
        <div style="font-weight:700;font-family:var(--font-ui)">${formatXAF(i.unit_price * i.quantity)}</div>
        <button type="button" class="btn btn--danger btn--sm" data-rm="${escapeHTML(i.product_id)}" style="margin-top:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Retirer
        </button>
      </div>
    </div>
  `).join('');
}

function disableCheckout() {
  goCheckout.setAttribute('aria-disabled', 'true');
  goCheckout.style.pointerEvents = 'none';
  goCheckout.style.opacity = '.5';
}

function enableCheckout() {
  goCheckout.removeAttribute('aria-disabled');
  goCheckout.style.pointerEvents = '';
  goCheckout.style.opacity = '';
}

// Event delegation for cart actions
itemsEl.addEventListener('click', (e) => {
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  const rm  = e.target.closest('[data-rm]');

  if (inc) {
    const item = Cart.get().find((i) => i.product_id === inc.dataset.inc);
    if (item) {
      Cart.updateQty(item.product_id, item.quantity + 1);
      toast('Quantite mise a jour', 'info');
    }
  }
  if (dec) {
    const item = Cart.get().find((i) => i.product_id === dec.dataset.dec);
    if (item && item.quantity > 1) {
      Cart.updateQty(item.product_id, item.quantity - 1);
      toast('Quantite mise a jour', 'info');
    }
  }
  if (rm) {
    const item = Cart.get().find((i) => i.product_id === rm.dataset.rm);
    if (item) {
      Cart.remove(rm.dataset.rm);
      toast(`"${item.name}" retire du panier`, 'info');
    }
  }
});

// Handle direct quantity input changes
itemsEl.addEventListener('change', (e) => {
  const qty = e.target.closest('[data-qty]');
  if (qty) {
    const newQty = parseInt(qty.value, 10) || 1;
    Cart.updateQty(qty.dataset.qty, newQty);
    toast('Quantite mise a jour', 'info');
  }
});

// Re-render on cart changes
window.addEventListener('cart:update', render);

// Initial render
render();
