// ============================================================
// responsive.js — Tinda · Scripts communs responsives
// Inclure dans chaque page : <script src="responsive.js"></script>
// (après le CDN Supabase)
// ============================================================

// --- Configuration Supabase (centralisée) ---
const SUPABASE_URL = 'https://uytrjgtrpsbegifudosi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

// --- Utilitaires ---
function escapeHTML(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatXAF(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(n);
}
function badgeLabel(b) {
    return { new:'Nouveau', bestseller:'Best-seller', featured:'Coup de cœur', promo:'Promo', out_of_stock:'Épuisé' }[b] || b;
}

// --- Toast ---
function toast(msg, type='info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    const icon = type==='success'
        ? '<polyline points="20 6 9 17 4 12"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>';
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${icon}</svg>${escapeHTML(msg)}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// --- Panier (localStorage) ---
const Cart = {
    get() { try { return JSON.parse(localStorage.getItem('tinda_cart')||'[]'); } catch { return []; } },
    save(cart) { localStorage.setItem('tinda_cart', JSON.stringify(cart)); },
    count() { return this.get().reduce((s,i) => s+i.qty, 0); },
    subtotal() { return this.get().reduce((s,i) => s+i.price*i.qty, 0); },
    add(product, qty=1, color=null) {
        const cart = this.get();
        const key = color ? `${product.id}__${color}` : product.id;
        const existing = cart.find(i => i._key === key);
        if (existing) { existing.qty += qty; }
        else cart.push({
            _key: key,
            id: product.id,
            vendor_id: product.vendor_id || null,
            vendor: product.vendors?.shop_name || 'Tinda',
            name: product.name,
            price: product.price,
            image: (Array.isArray(product.images) && product.images[0]) || product.image_url || '',
            color,
            qty
        });
        this.save(cart);
        updateCartBadges();
    },
    updateQty(key, delta) {
        const cart = this.get();
        const item = cart.find(i => i._key === key);
        if (!item) return;
        item.qty = Math.max(1, item.qty + delta);
        this.save(cart);
        updateCartBadges();
    },
    remove(key) {
        const cart = this.get().filter(i => i._key !== key);
        this.save(cart);
        updateCartBadges();
    },
    clear() {
        this.save([]);
        updateCartBadges();
    }
};

function updateCartBadges() {
    const n = Cart.count();
    document.querySelectorAll('#cartCount, #cartCountMobile').forEach(el => {
        if (el) el.textContent = n;
    });
}
document.addEventListener('DOMContentLoaded', updateCartBadges);

// --- Quick add to cart (nécessite une variable globale `allProducts`) ---
window.quickAddToCart = function(productId) {
    if (typeof allProducts === 'undefined') {
        toast('Chargement des produits…', 'error');
        return;
    }
    const product = allProducts.find(p => p.id == productId);
    if (!product) { toast('Produit introuvable', 'error'); return; }
    if (product.stock <= 0 || product.badge === 'out_of_stock') {
        toast('Ce produit est en rupture de stock', 'error');
        return;
    }
    Cart.add(product, 1);
    toast(`"${product.name}" ajouté au panier ✓`, 'success');
};

// --- Recherche mobile ---
document.addEventListener('DOMContentLoaded', () => {
    const searchToggle = document.getElementById('searchToggle');
    const mobileSearch = document.getElementById('mobileSearch');
    const mobileInput  = document.getElementById('mobileSearchInput');
    const searchInput  = document.getElementById('searchInput');

    if (searchToggle && mobileSearch) {
        searchToggle.addEventListener('click', () => {
            mobileSearch.classList.toggle('open');
            if (mobileSearch.classList.contains('open') && mobileInput) {
                setTimeout(() => mobileInput.focus(), 50);
            }
        });
    }
    if (mobileSearch && mobileInput && searchInput) {
        mobileInput.addEventListener('input', () => {
            searchInput.value = mobileInput.value;
        });
    }
    // Fermer la recherche mobile en cliquant à l'extérieur (optionnel)
    document.addEventListener('click', function(e) {
        if (mobileSearch && !e.target.closest('.mobile-search') && !e.target.closest('.navbar__search-toggle')) {
            mobileSearch.classList.remove('open');
        }
    });
});

// --- Navigation mobile (bottom-nav active) ---
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.bottom-nav__item').forEach(item => {
        const href = item.getAttribute('href');
        if (href && currentPath.includes(href.replace('/',''))) {
            item.classList.add('active');
        }
    });
});

// --- Slider horizontal (shop, catégories) ---
window.slideSection = function(sliderId, direction) {
    const grid = document.getElementById(sliderId);
    if (!grid) return;
    const card = grid.querySelector('.mi-card');
    const cardW = card ? card.offsetWidth + 14 : 224;
    grid.scrollBy({ left: direction * cardW * 2, behavior: 'smooth' });
};

// --- Masquer le panier de la navbar sur mobile (présent dans bottom nav) ---
function adaptNavbarCart() {
    const navCart = document.getElementById('navCart');
    if (navCart) {
        navCart.style.display = window.innerWidth < 641 ? 'none' : 'flex';
    }
}
window.addEventListener('resize', adaptNavbarCart);
document.addEventListener('DOMContentLoaded', adaptNavbarCart);

// --- Gestion du body padding pour la bottom nav ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 640) {
        document.body.style.paddingBottom = '68px';
    }
});
window.addEventListener('resize', () => {
    if (window.innerWidth <= 640) {
        document.body.style.paddingBottom = '68px';
    } else {
        document.body.style.paddingBottom = '';
    }
});

// --- Fonctions de rendu produit (réutilisables) ---
function renderSwatches(colors, max = 4) {
    if (!Array.isArray(colors) || !colors.length) return '';
    const visible = colors.slice(0, max);
    const extra = colors.length - max;
    return `<div class="mi-card__swatches">${visible.map(c => `<span class="mi-swatch" style="background:${escapeHTML(c?.hex||c)}"></span>`).join('')}${extra>0?`<span style="font-size:9px;color:var(--color-text-tertiary)">+${extra}</span>`:''}</div>`;
}

function cardHTML(p) {
    const img = (Array.isArray(p.images) && p.images[0]) || p.image_url || IMG_FALLBACK;
    const hasPromo = p.old_price && p.old_price > p.price;
    const isOut = p.stock <= 0 || p.badge === 'out_of_stock';
    const discount = hasPromo ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    const desc = p.description || `Vendu par ${p.vendors?.shop_name || 'Tinda'}`;
    const rating = p.rating || (3.5 + Math.random() * 1.5).toFixed(1);
    const reviews = p.reviews_count || Math.floor(10 + Math.random() * 200);
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    let badgeHTML = '';
    if (p.badge && p.badge !== 'out_of_stock') badgeHTML = `<span class="badge badge--${p.badge}">${escapeHTML(badgeLabel(p.badge))}</span>`;
    else if (isOut) badgeHTML = '<span class="badge badge--out_of_stock">Épuisé</span>';
    else if (hasPromo) badgeHTML = `<span class="badge badge--promo">−${discount}%</span>`;
    return `<a href="product.html?id=${p.id}" class="mi-card${isOut?' mi-card--out':''}" aria-label="${escapeHTML(p.name)}">
        <div class="mi-card__media">${badgeHTML}
            <button class="mi-card__wish" onclick="event.preventDefault();event.stopPropagation();" aria-label="Favori">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
            <button class="mi-card__atc" onclick="event.preventDefault();event.stopPropagation();quickAddToCart('${p.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>Ajouter
            </button>
        </div>
        <div class="mi-card__body">
            <div class="mi-card__vendor">${escapeHTML(p.vendors?.shop_name||'Tinda')}</div>
            <h3 class="mi-card__name">${escapeHTML(p.name)}</h3>
            <p class="mi-card__desc">${escapeHTML(desc)}</p>
            ${renderSwatches(p.colors)}
            <div class="mi-card__rating"><span class="mi-card__stars">${stars}</span><span>${rating} (${reviews})</span></div>
            <div class="mi-card__price">
                <span class="mi-card__price-current">${formatXAF(p.price)}</span>
                ${hasPromo?`<span class="mi-card__price-old">${formatXAF(p.old_price)}</span>`:''}
                ${hasPromo?`<span class="mi-card__price-discount">−${discount}%</span>`:''}
            </div>
        </div>
    </a>`;
}

// --- Construction de section (utilisée dans shop.html) ---
window.buildSection = function({ id, title, subtitle, products, featured=false, total=0, categoryId }) {
    const idAttr = id ? `id="${id}"` : '';
    const sliderId = id ? `slider-${id}` : `slider-${Math.random().toString(36).slice(2,7)}`;
    const seeAll = total > products.length
        ? `<a href="category.html?id=${categoryId}" class="cat-section__see-all">Tout voir <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`
        : '';
    return `<section class="cat-section${featured?' cat-section--featured':''}" ${idAttr}>
        <div class="cat-section__head">
            <div>
                <h2 class="cat-section__title">${escapeHTML(title)}</h2>
                ${subtitle ? `<p class="cat-section__subtitle">${escapeHTML(subtitle)}</p>` : ''}
            </div>
            ${seeAll}
        </div>
        <div class="slider-wrapper">
            <button class="slider-btn slider-btn--prev" onclick="slideSection('${sliderId}',-1)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg></button>
            <div class="cat-section__grid" id="${sliderId}">${products.map(cardHTML).join('')}</div>
            <button class="slider-btn slider-btn--next" onclick="slideSection('${sliderId}',1)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
    </section>`;
};