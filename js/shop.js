/* ══════════════════════════════════════════════════════════
   Mayi · shop.js — E-commerce page complète
   ══════════════════════════════════════════════════════════ */

const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

function escapeHTML(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatXAF(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0); }
function badgeLabel(b) { return { new: 'Nouveau', bestseller: 'Best-seller', featured: 'Coup de cœur', promo: 'Promo', out_of_stock: 'Épuisé' }[b] || b; }
function toast(msg, type = 'info') { const tc = document.getElementById('toastContainer'); const el = document.createElement('div'); el.className = `toast toast--${type}`; el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${type==='success'?'<polyline points="20 6 9 17 4 12"/>':'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>'}</svg>${escapeHTML(msg)}`; tc.appendChild(el); setTimeout(() => el.remove(), 3200); }
function renderSwatches(colors, max = 5) { if (!Array.isArray(colors) || !colors.length) return ''; const visible = colors.slice(0, max); const extra = colors.length - max; return `<div class="mi-card__swatches">${visible.map(c => `<span class="mi-swatch" style="background:${escapeHTML(c?.hex||c)}" title="${escapeHTML(c?.name||c?.hex||c)}"></span>`).join('')}${extra>0?`<span class="mi-swatch--more">+${extra}</span>`:''}</div>`; }

/* ─── Thèmes catégories ─── */
const CAT_THEMES = [
    { bg: '#FAFAFA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)' },
    { bg: '#F8F8FA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #F8F8FA 0%, #F2F2F7 100%)' },
    { bg: '#FAFAFA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)' },
    { bg: '#F8F8FA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #F8F8FA 0%, #F2F2F7 100%)' },
    { bg: '#FAFAFA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)' },
    { bg: '#F8F8FA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #F8F8FA 0%, #F2F2F7 100%)' },
    { bg: '#FAFAFA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)' },
    { bg: '#F8F8FA', accent: '#1D1D1F', gradient: 'linear-gradient(135deg, #F8F8FA 0%, #F2F2F7 100%)' },
];
function getCatTheme(i) { return CAT_THEMES[i % CAT_THEMES.length]; }

function getCatIcon(name) {
    const n = (name||'').toLowerCase();
    if (n.includes('élect')||n.includes('tech')||n.includes('phone')) return '<path d="M5 2h14a1 1 0 011 1v18a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/><line x1="12" y1="18" x2="12.01" y2="18"/>';
    if (n.includes('mode')||n.includes('vêt')||n.includes('habit')||n.includes('textile')) return '<path d="M6.5 2L2 7.5V22h20V7.5L17.5 2h-11z"/><path d="M2 7.5h20"/><path d="M9.5 2v5.5a2.5 2.5 0 005 0V2"/>';
    if (n.includes('beauté')||n.includes('cosm')||n.includes('soin')) return '<circle cx="12" cy="12" r="3"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/>';
    if (n.includes('maison')||n.includes('déco')||n.includes('meuble')) return '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
    if (n.includes('aliment')||n.includes('nourr')||n.includes('food')||n.includes('cuisine')||n.includes('boisson')) return '<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>';
    if (n.includes('sport')||n.includes('fitness')) return '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>';
    if (n.includes('livre')||n.includes('book')||n.includes('éduc')||n.includes('papeterie')) return '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>';
    if (n.includes('auto')||n.includes('moto')||n.includes('vehic')) return '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2"/>';
    if (n.includes('bébé')||n.includes('enfant')||n.includes('jouet')) return '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>';
    return '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>';
}

/* ═══════════════════════════════════════════════════════════
   SECTION BUILDERS
   ═══════════════════════════════════════════════════════════ */

function buildSection({ id, title, subtitle, products, featured = false, total = 0, categoriesId, theme = null, catIndex = 0 }) {
    const idAttr = id ? `id="${id}"` : '';
    const sliderId = id ? `slider-${id}` : `slider-${Math.random().toString(36).slice(2,7)}`;

    // Bouton "Voir plus" — toujours présent, même sans categoriesId
    let seeAllBtn = '';
    if (categoriesId && total > products.length) {
        seeAllBtn = `<a href="categories.html?id=${categoriesId}" class="section__more-btn">Voir plus<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`;
    } else if (categoriesId) {
        seeAllBtn = `<a href="categories.html?id=${categoriesId}" class="section__more-btn">Voir tout<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`;
    }

    const seeAllHeader = (categoriesId && total > products.length)
        ? `<a href="categories.html?id=${categoriesId}" class="cat-section__see-all">Voir tout (${total})<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>`
        : '';

    const t = theme || getCatTheme(catIndex);

    let headerHTML;
    if (theme) {
        const iconSvg = getCatIcon(title);
        headerHTML = `<div class="cat-section__head cat-section__head--rich" style="background: ${t.gradient}; border-color: ${t.accent}20;">
            <div class="cat-section__head-left">
                <span class="cat-section__icon" style="background: ${t.accent}18; color: ${t.accent};"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${iconSvg}</svg></span>
                <div><h2 class="cat-section__title" style="color: ${t.accent};">${escapeHTML(title)}</h2>${subtitle?`<p class="cat-section__subtitle">${escapeHTML(subtitle)}</p>`:''}</div>
            </div>
            ${seeAllHeader ? `<div class="cat-section__head-right">${seeAllHeader.replace('class="cat-section__see-all"', `class="cat-section__see-all" style="color:${t.accent};border-color:${t.accent};"`)}</div>` : ''}
        </div>`;
    } else {
        headerHTML = `<div class="cat-section__head"><div><h2 class="cat-section__title">${escapeHTML(title)}</h2>${subtitle?`<p class="cat-section__subtitle">${escapeHTML(subtitle)}</p>`:''}</div>${seeAllHeader}</div>`;
    }

    // Bouton "Voir plus" sous la grille de produits
    const footerHTML = seeAllBtn ? `<div class="cat-section__footer">${seeAllBtn}</div>` : '';

    return `<section class="cat-section${featured?' cat-section--featured':''}" ${idAttr}>
        ${headerHTML}
        <div class="slider-wrapper">
            <button class="slider-btn slider-btn--prev" onclick="slideSection('${sliderId}',-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg></button>
            <div class="cat-section__grid" id="${sliderId}">${products.map(cardHTML).join('')}</div>
            <button class="slider-btn slider-btn--next" onclick="slideSection('${sliderId}',1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
        ${footerHTML}
    </section>`;
}

/* ─── Flash Deals avec countdown ─── */
function buildFlashDeals(products) {
    if (!products.length) return '';
    const sliderId = 'slider-flash';
    // Countdown : fin de journée
    const now = new Date();
    const end = new Date(now); end.setHours(23,59,59,999);
    const diff = end - now;
    const h = String(Math.floor(diff/3600000)).padStart(2,'0');
    const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');

    return `<section class="flash-deals">
        <div class="flash-deals__head">
            <div class="flash-deals__left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <h2 class="flash-deals__title">Offres limitées</h2>
            </div>
            <div class="flash-deals__countdown" id="flashCountdown">
                <span class="flash-deals__label">Se termine dans</span>
                <div class="flash-deals__timer">
                    <span class="flash-deals__digit" id="fcH">${h}</span><span class="flash-deals__sep">:</span>
                    <span class="flash-deals__digit" id="fcM">${m}</span><span class="flash-deals__sep">:</span>
                    <span class="flash-deals__digit" id="fcS">${s}</span>
                </div>
            </div>
            <a href="#" class="cat-section__see-all flash-deals__see-all">Voir tout<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
        </div>
        <div class="slider-wrapper">
            <button class="slider-btn slider-btn--prev" onclick="slideSection('${sliderId}',-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg></button>
            <div class="cat-section__grid" id="${sliderId}">${products.map(p => cardHTML(p, true)).join('')}</div>
            <button class="slider-btn slider-btn--next" onclick="slideSection('${sliderId}',1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
    </section>`;
}

// Countdown timer
function startFlashCountdown() {
    const hEl = document.getElementById('fcH'), mEl = document.getElementById('fcM'), sEl = document.getElementById('fcS');
    if (!hEl) return;
    setInterval(() => {
        const now = new Date(), end = new Date(now); end.setHours(23,59,59,999);
        const diff = Math.max(0, end - now);
        hEl.textContent = String(Math.floor(diff/3600000)).padStart(2,'0');
        mEl.textContent = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
        sEl.textContent = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    }, 1000);
}

/* ═══════════════════════════════════════════════════════════
   BANNIÈRES ENTRE SECTIONS
   ═══════════════════════════════════════════════════════════ */

const BANNERS = [
   /* `<div class="promo-banner promo-banner--dark">
        <div class="promo-banner__inner">
            <div class="promo-banner__content">
                <span class="promo-banner__tag">Pour les vendeurs</span>
                <h3 class="promo-banner__title">Ouvrez votre boutique.<br><em>Zéro commission.</em></h3>
                <p class="promo-banner__sub">Rejoignez des centaines de vendeurs et touchez de nouveaux clients chaque jour.</p>
                <a href="login.html" class="promo-banner__btn">Commencer<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
            </div>
            <div class="promo-banner__visual"><div class="promo-banner__circle"></div><span class="promo-banner__big">0%</span><span class="promo-banner__label">de commission</span></div>
        </div>
    </div>`,
    `<div class="promo-banner promo-banner--accent">
        <div class="promo-banner__inner">
            <div class="promo-banner__content">
                <span class="promo-banner__tag">Livraison</span>
                <h3 class="promo-banner__title">Livraison offerte<br><em>dès 50 000 FCFA</em></h3>
                <p class="promo-banner__sub">Partout au Cameroun. Paiement à la livraison disponible.</p>
                <a href="#sections-anchor" class="promo-banner__btn promo-banner__btn--white">Voir les produits<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
            </div>
            <div class="promo-banner__visual"><div class="promo-banner__circle promo-banner__circle--white"></div><svg class="promo-banner__truck" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
        </div>
    </div>`,

    `<div class="promo-banner promo-banner--light">
        <div class="promo-banner__inner">
            <div class="promo-banner__content">
                <span class="promo-banner__tag">Support</span>
                <h3 class="promo-banner__title">Une question ?<br><em>On vous répond.</em></h3>
                <p class="promo-banner__sub">Notre équipe est disponible sur WhatsApp en moins de 5 minutes.</p>
                <a href="https://wa.me/237693421348" target="_blank" class="promo-banner__btn promo-banner__btn--dark">Nous contacter<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></a>
            </div>
        </div>
    </div>`*/
];
function getBanner(i) { return i < BANNERS.length ? BANNERS[i] : ''; }

/* ═══════════════════════════════════════════════════════════
   PRODUCT CARD
   ═══════════════════════════════════════════════════════════ */

function cardHTML(p, showDiscount = false) {
    const img = (Array.isArray(p.images) && p.images[0]) || p.image_url || IMG_FALLBACK;
    const hasPromo = p.old_price && p.old_price > p.price;
    const isOut = p.stock <= 0 || p.badge === 'out_of_stock';
    const discount = hasPromo ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    const desc = p.description || `Vendu par ${p.vendors?.shop_name || 'Mayi'}`;

    let badgeHTML = '';
    if (p.badge && p.badge !== 'out_of_stock') badgeHTML = `<span class="badge badge--${p.badge}">${escapeHTML(badgeLabel(p.badge))}</span>`;
    else if (isOut) badgeHTML = '<span class="badge badge--out_of_stock">Épuisé</span>';
    else if (hasPromo) badgeHTML = `<span class="badge badge--promo">−${discount}%</span>`;

    // Barre de stock pour flash deals
    let stockBar = '';
    if (showDiscount && hasPromo && !isOut) {
        const sold = Math.floor(Math.random() * 70) + 20;
        stockBar = `<div class="mi-card__stock-bar"><div class="mi-card__stock-fill" style="width:${sold}%"></div><span class="mi-card__stock-text">${sold}% vendus</span></div>`;
    }

    return `<a href="product.html?id=${p.id}" class="mi-card${isOut?' mi-card--out':''}" aria-label="${escapeHTML(p.name)}"><div class="mi-card__media">${badgeHTML}<button class="mi-card__wish" onclick="event.preventDefault();event.stopPropagation();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button><img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'"><button class="mi-card__atc" onclick="event.preventDefault();event.stopPropagation();quickAddToCart('${p.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>Ajouter</button></div><div class="mi-card__body"><div class="mi-card__vendor">${escapeHTML(p.vendors?.shop_name||'Mayi')}</div><h3 class="mi-card__name">${escapeHTML(p.name)}</h3><p class="mi-card__desc">${escapeHTML(desc)}</p>${renderSwatches(p.colors)}<div class="mi-card__price"><span class="mi-card__price-current">${formatXAF(p.price)}</span>${hasPromo?`<span class="mi-card__price-old">${formatXAF(p.old_price)}</span>`:''}${hasPromo?`<span class="mi-card__price-discount">−${discount}%</span>`:''}</div>${stockBar}</div></a>`;
}
/* ═══════════════════════════════════════════════════════════
   SLIDER + CART
   ═══════════════════════════════════════════════════════════ */

function slideSection(sliderId, dir) { const g = document.getElementById(sliderId); if (!g) return; const c = g.querySelector('.mi-card'); const w = c ? c.offsetWidth + 16 : 276; g.scrollBy({ left: dir * w * 2, behavior: 'smooth' }); }
window.slideSection = slideSection;

let allProducts = [], allCategories = [];
const Cart = {
    get() { try { return JSON.parse(localStorage.getItem('mayi_cart')||'[]'); } catch { return []; } },
    save(c) { localStorage.setItem('mayi_cart', JSON.stringify(c)); },
    count() { return this.get().reduce((s,i) => s + i.qty, 0); },
    add(product, qty = 1) { const cart = this.get(); const key = String(product.id); const ex = cart.find(i => i._key === key); if (ex) ex.qty += qty; else cart.push({ _key: key, id: product.id, vendor_id: product.vendor_id, vendor: product.vendors?.shop_name || 'Mayi', name: product.name, price: product.price, image: (Array.isArray(product.images) && product.images[0]) || product.image_url || '', color: null, qty }); this.save(cart); document.getElementById('cartCount').textContent = this.count(); }
};
document.getElementById('cartCount').textContent = Cart.count();
window.quickAddToCart = (pid) => { const p = allProducts.find(x => x.id == pid); if (!p) { toast('Produit introuvable','error'); return; } if (p.stock<=0||p.badge==='out_of_stock') { toast('Rupture de stock','error'); return; } Cart.add(p,1); toast(`"${p.name}" ajouté au panier ✓`,'success'); };

/* ═══════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════ */

const catNav = document.getElementById('catNav'), catNavInner = document.getElementById('catNavInner');
const sectionsEl = document.getElementById('sections');
const searchInput = document.getElementById('searchInput'), searchForm = document.getElementById('searchForm');

let scrollObserver = null;
function initScrollSpy(cats) { if (scrollObserver) scrollObserver.disconnect(); const links = catNavInner.querySelectorAll('a'); scrollObserver = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${e.target.id}`)); }); }, { rootMargin: '-30% 0px -60% 0px' }); cats.forEach(c => { const el = document.getElementById(`cat-${c.id}`); if (el) scrollObserver.observe(el); }); }

function render() {
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
        catNav.hidden = true;
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q) || (p.vendors?.shop_name||'').toLowerCase().includes(q));
        if (!filtered.length) { sectionsEl.innerHTML = `<div class="empty"><div class="empty__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><h3 class="empty__title">Rien trouvé</h3><p class="empty__sub">Aucun résultat pour « ${escapeHTML(q)} »</p></div>`; return; }
        sectionsEl.innerHTML = buildSection({ title: 'Résultats de recherche', subtitle: `${filtered.length} produits`, products: filtered });
        return;
    }
    renderSections();
}

function renderSections() {
    const grouped = new Map();
    allProducts.forEach(p => { const k = p.categories_id || '__none__'; if (!grouped.has(k)) grouped.set(k,[]); grouped.get(k).push(p); });

    let html = '';
    let bannerIdx = 0;

    // 1 — Flash Deals (produits en promo)
    const promos = allProducts.filter(p => p.old_price && p.old_price > p.price).slice(0, 12);
    if (promos.length) html += buildFlashDeals(promos);

    // 2 — Coups de cœur
    const featured = allProducts.filter(p => p.badge === 'featured' || p.badge === 'bestseller').slice(0, 10);
    if (featured.length) html += buildSection({ title: 'Coups de cœur', subtitle: 'Sélectionnés pour vous', products: featured, featured: true });

    // Bannière #1
    html += getBanner(bannerIdx++);

    // 3 — Nouveautés
    const newProds = allProducts.filter(p => p.badge === 'new').slice(0, 10);
    if (newProds.length) html += buildSection({ title: 'Nouveautés', subtitle: 'Récemment ajoutés', products: newProds });

    // 4 — Sections par catégorie
    let catIdx = 0;
    for (const cat of allCategories) {
        const all = grouped.get(cat.id) || [];
        if (!all.length) continue;
        if (catIdx > 0 && catIdx % 2 === 0 && bannerIdx < BANNERS.length) html += getBanner(bannerIdx++);
        html += buildSection({ id: `cat-${cat.id}`, title: cat.name, subtitle: `${all.length} produit${all.length>1?'s':''} disponible${all.length>1?'s':''}`, products: all.slice(0,10), total: all.length, categoriesId: cat.id, theme: getCatTheme(catIdx), catIndex: catIdx });
        catIdx++;
    }

    if (!html) { sectionsEl.innerHTML = '<div class="empty">Aucun produit pour le moment</div>'; return; }
    sectionsEl.innerHTML = html;
    startFlashCountdown();

    const visibleCats = allCategories.filter(c => grouped.has(c.id));
    if (visibleCats.length) { catNavInner.innerHTML = visibleCats.map(c => `<a href="#cat-${c.id}" class="cat-nav__link">${escapeHTML(c.name)}</a>`).join(''); catNav.hidden = false; initScrollSpy(visibleCats); } else catNav.hidden = true;
}

let debounceTimer; searchInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(render, 200); }); searchForm.addEventListener('submit', e => { e.preventDefault(); render(); });

/* ═══════════════════════════════════════════════════════════
   categories VISUAL GRID
   ═══════════════════════════════════════════════════════════ */

function buildCatGrid(categories, pbc) {
    const el = document.getElementById('catGrid');
    if (!el || !categories.length) return;
    el.innerHTML = categories.map((cat, i) => {
        const t = getCatTheme(i);
        const icon = getCatIcon(cat.name);
        const count = pbc.get(cat.id) || 0;
        return `<a href="categories.html?id=${cat.id}" class="cat-tile" style="--tile-accent:${t.accent};--tile-bg:${t.bg};">
            <span class="cat-tile__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${icon}</svg></span>
            <span class="cat-tile__name">${escapeHTML(cat.name)}</span>
            <span class="cat-tile__count">${count} produit${count>1?'s':''}</span>
        </a>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════
   MEGA MENU
   ═══════════════════════════════════════════════════════════ */

const megaLinks = document.getElementById('megaLinks'), megaDropdown = document.getElementById('megaDropdown'), megaDropdownInner = document.getElementById('megaDropdownInner'), megaToggle = document.getElementById('megaToggle'), megaOverlay = document.getElementById('megaOverlay');
let megaOpen = false;
function toggleMega(f) { megaOpen = typeof f==='boolean'?f:!megaOpen; megaDropdown.classList.toggle('is-open',megaOpen); megaToggle.classList.toggle('is-open',megaOpen); megaOverlay.classList.toggle('is-open',megaOpen); document.body.style.overflow = megaOpen?'hidden':''; }
megaToggle.addEventListener('click', e => { e.stopPropagation(); toggleMega(); });
megaOverlay.addEventListener('click', () => toggleMega(false));
document.addEventListener('keydown', e => { if (e.key==='Escape'&&megaOpen) toggleMega(false); });

function buildMegaMenu(categories, pbc) {
    if (!categories.length) return;
    megaLinks.innerHTML = categories.map(c => { const n = pbc.get(c.id)||0; return `<a href="categories.html?id=${c.id}" class="mega__link">${escapeHTML(c.name)}${n?`<span class="mega__link-count">${n}</span>`:''}</a>`; }).join('');
    megaDropdownInner.innerHTML = `<div class="mega__grid">${categories.map((c,i)=>{ const t=getCatTheme(i); const ic=getCatIcon(c.name); const n=pbc.get(c.id)||0; return `<a href="categories.html?id=${c.id}" class="mega__card" style="--card-accent:${t.accent};--card-bg:${t.bg};"><span class="mega__card-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${ic}</svg></span><span class="mega__card-body"><span class="mega__card-name">${escapeHTML(c.name)}</span><span class="mega__card-count">${n} produit${n>1?'s':''}</span></span><svg class="mega__card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></a>`; }).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════════════
   SUPABASE + LOAD
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://uytrjgtrpsbegifudosi.supabase.co', SUPABASE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
const { createClient: _createClient } = supabase; const sb = _createClient(SUPABASE_URL, SUPABASE_KEY);

function showSkeleton(el, count = 6) { const card = `<div class="skel-card"><div class="skel skel--img"></div><div class="skel-body"><div class="skel skel--line skel--short"></div><div class="skel skel--line"></div><div class="skel skel--line skel--med"></div><div class="skel skel--price"></div></div></div>`; el.innerHTML = `<section class="cat-section"><div class="cat-section__head"><div><div class="skel skel--title"></div><div class="skel skel--line skel--short" style="margin-top:6px"></div></div></div><div class="cat-section__grid" style="overflow:hidden">${Array(count).fill(card).join('')}</div></section>`; }

async function loadData() {
    showSkeleton(sectionsEl);
    const [pr, cr] = await Promise.all([
        sb.from('products').select('id,name,description,price,old_price,image_url,images,colors,badge,stock,categories_id,vendor_id,vendors(shop_name),categories(id,name,slug)').eq('active', true).order('created_at', { ascending: false }),
        sb.from('categories').select('id,name,slug,vendor_id,position').order('position', { ascending: true, nullsFirst: false }).order('name')
    ]);
    if (pr.error) { sectionsEl.innerHTML = `<div class="empty">⚠️ Erreur : ${escapeHTML(pr.error.message)}</div>`; return; }
    allProducts = pr.data || [];
    allCategories = cr.data || [];
    const pbc = new Map();
    allProducts.forEach(p => { if (p.categories_id) pbc.set(p.categories_id, (pbc.get(p.categories_id)||0)+1); });
    buildMegaMenu(allCategories, pbc);
    buildCatGrid(allCategories, pbc);
    render();
}
loadData();