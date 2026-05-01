const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';
        function escapeHTML(s) {
            if (!s) return '';
            return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        function formatXAF(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0); }
        function badgeLabel(b) { return { new: 'Nouveau', bestseller: 'Best-seller', featured: 'Coup de cœur', promo: 'Promo', out_of_stock: 'Épuisé' }[b] || b; }
        function toast(msg, type = 'info') { const tc = document.getElementById('toastContainer'); const el = document.createElement('div'); el.className = `toast toast--${type}`; el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${type==='success'?'<polyline points="20 6 9 17 4 12"/>':'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>'}</svg>${escapeHTML(msg)}`; tc.appendChild(el); setTimeout(() => el.remove(), 3200); }
        function renderSwatches(colors, max = 5) { if (!Array.isArray(colors) || !colors.length) return ''; const visible = colors.slice(0, max); const extra = colors.length - max; return `<div class="mi-card__swatches">${visible.map(c => `<span class="mi-swatch" style="background:${escapeHTML(c?.hex||c)}" title="${escapeHTML(c?.name||c?.hex||c)}"></span>`).join('')}${extra>0?`<span class="mi-swatch--more">+${extra}</span>`:''}</div>`; }

        function buildSection({ id, title, subtitle, products, featured = false, total = 0, categoryId }) {
            const idAttr = id ? `id="${id}"` : '';
            const sliderId = id ? `slider-${id}` : `slider-${Math.random().toString(36).slice(2,7)}`;
            const seeAll = total > products.length ? `<a href="category.html?id=${categoryId}" class="cat-section__see-all">Voir tout <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>` : '';
            return `<section class="cat-section${featured?' cat-section--featured':''}" ${idAttr}><div class="cat-section__head"><div><h2 class="cat-section__title">${escapeHTML(title)}</h2>${subtitle?`<p class="cat-section__subtitle">${escapeHTML(subtitle)}</p>`:''}</div>${seeAll}</div><div class="slider-wrapper"><button class="slider-btn slider-btn--prev" onclick="slideSection('${sliderId}',-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg></button><div class="cat-section__grid" id="${sliderId}">${products.map(cardHTML).join('')}</div><button class="slider-btn slider-btn--next" onclick="slideSection('${sliderId}',1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></button></div></section>`;
        }

        function cardHTML(p) {
            const img = (Array.isArray(p.images) && p.images[0]) || p.image_url || IMG_FALLBACK;
            const hasPromo = p.old_price && p.old_price > p.price;
            const isOut = p.stock <= 0 || p.badge === 'out_of_stock';
            const discount = hasPromo ? Math.round((1 - p.price / p.old_price) * 100) : 0;
            const desc = p.description || `Vendu par ${p.vendors?.shop_name || 'Tindamba'}`;
            const rating = p.rating || (3.5 + Math.random() * 1.5).toFixed(1);
            const reviews = p.reviews_count || Math.floor(10 + Math.random() * 200);
            const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
            let badgeHTML = '';
            if (p.badge && p.badge !== 'out_of_stock') badgeHTML = `<span class="badge badge--${p.badge}">${escapeHTML(badgeLabel(p.badge))}</span>`;
            else if (isOut) badgeHTML = '<span class="badge badge--out_of_stock">Épuisé</span>';
            else if (hasPromo) badgeHTML = `<span class="badge badge--promo">−${discount}%</span>`;
            return `<a href="product.html?id=${p.id}" class="mi-card${isOut?' mi-card--out':''}" aria-label="${escapeHTML(p.name)}"><div class="mi-card__media">${badgeHTML}<button class="mi-card__wish" onclick="event.preventDefault();event.stopPropagation();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button><img src="${escapeHTML(img)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'"><button class="mi-card__atc" onclick="event.preventDefault();event.stopPropagation();quickAddToCart('${p.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>Ajouter</button></div><div class="mi-card__body"><div class="mi-card__vendor">${escapeHTML(p.vendors?.shop_name||'Tindamba')}</div><h3 class="mi-card__name">${escapeHTML(p.name)}</h3><p class="mi-card__desc">${escapeHTML(desc)}</p>${renderSwatches(p.colors)}<div class="mi-card__rating"><span class="mi-card__stars">${stars}</span><span>${rating} (${reviews})</span></div><div class="mi-card__price"><span class="mi-card__price-current">${formatXAF(p.price)}</span>${hasPromo?`<span class="mi-card__price-old">${formatXAF(p.old_price)}</span>`:''}${hasPromo?`<span class="mi-card__price-discount">−${discount}%</span>`:''}</div></div></a>`;
        }

        function slideSection(sliderId, direction) { const grid = document.getElementById(sliderId); if (!grid) return; const card = grid.querySelector('.mi-card'); const cardW = card ? card.offsetWidth + 16 : 276; grid.scrollBy({ left: direction * cardW * 2, behavior: 'smooth' }); }
        window.slideSection = slideSection;

        let allProducts = [], allCategories = [];
        const Cart = { get() { try { return JSON.parse(localStorage.getItem('tindamba_cart')||'[]'); } catch { return []; } }, save(c) { localStorage.setItem('tindamba_cart', JSON.stringify(c)); }, count() { return this.get().reduce((s,i) => s + i.qty, 0); }, add(product, qty = 1) { const cart = this.get(); const key = String(product.id); const ex = cart.find(i => i._key === key); if (ex) ex.qty += qty; else cart.push({ _key: key, id: product.id, vendor_id: product.vendor_id, vendor: product.vendors?.shop_name || 'Tindamba', name: product.name, price: product.price, image: (Array.isArray(product.images) && product.images[0]) || product.image_url || '', color: null, qty }); this.save(cart); document.getElementById('cartCount').textContent = this.count(); } };
        document.getElementById('cartCount').textContent = Cart.count();
        window.quickAddToCart = (productId) => { const product = allProducts.find(p => p.id == productId); if (!product) { toast('Produit introuvable', 'error'); return; } if (product.stock <= 0 || product.badge === 'out_of_stock') { toast('Rupture de stock', 'error'); return; } Cart.add(product, 1); toast(`"${product.name}" ajouté au panier ✓`, 'success'); };

        const catNav = document.getElementById('catNav'), catNavInner = document.getElementById('catNavInner'), sectionsEl = document.getElementById('sections'), searchInput = document.getElementById('searchInput'), searchForm = document.getElementById('searchForm');
        let scrollObserver = null;
        function initScrollSpy(cats) { if (scrollObserver) scrollObserver.disconnect(); const links = catNavInner.querySelectorAll('a'); scrollObserver = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${e.target.id}`)); }); }, { rootMargin: '-30% 0px -60% 0px' }); cats.forEach(c => { const el = document.getElementById(`cat-${c.id}`); if (el) scrollObserver.observe(el); }); }

        function render() { const q = searchInput.value.trim().toLowerCase(); if (q) { catNav.hidden = true; const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q) || (p.vendors?.shop_name||'').toLowerCase().includes(q)); if (!filtered.length) { sectionsEl.innerHTML = `<div class="empty"><div class="empty__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><h3 class="empty__title">Rien trouvé</h3><p class="empty__sub">Aucun résultat pour « ${escapeHTML(q)} »</p></div>`; return; } sectionsEl.innerHTML = buildSection({ title: 'Résultats de recherche', subtitle: `${filtered.length} produits`, products: filtered }); return; } renderSectionsByCategory(); }

        function renderSectionsByCategory() { const grouped = new Map(); for (const p of allProducts) { const key = p.category_id || '__none__'; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(p); } let html = ''; const featured = allProducts.filter(p => p.badge === 'featured' || p.badge === 'bestseller').slice(0,8); if (featured.length) html += buildSection({ title: 'Coups de cœur', subtitle: 'Produits populaires', products: featured, featured: true }); const newProds = allProducts.filter(p => p.badge === 'new').slice(0,8); if (newProds.length) html += buildSection({ title: 'Nouveautés', subtitle: 'Arrivages récents', products: newProds }); for (const cat of allCategories) { const all = grouped.get(cat.id) || []; if (!all.length) continue; html += buildSection({ id: `cat-${cat.id}`, title: cat.name, subtitle: `${all.length} produits`, products: all.slice(0,8), total: all.length, categoryId: cat.id }); } if (!html) { sectionsEl.innerHTML = '<div class="empty">Aucun produit</div>'; return; } sectionsEl.innerHTML = html; const visibleCats = allCategories.filter(c => grouped.has(c.id)); if (visibleCats.length) { catNavInner.innerHTML = visibleCats.map(c => `<a href="#cat-${c.id}" class="cat-nav__link">${escapeHTML(c.name)}</a>`).join(''); catNav.hidden = false; initScrollSpy(visibleCats); } else catNav.hidden = true; }
        let debounceTimer; searchInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(render, 200); }); searchForm.addEventListener('submit', e => { e.preventDefault(); render(); });

        const SUPABASE_URL = 'https://uytrjgtrpsbegifudosi.supabase.co',
         SUPABASE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
        const { createClient: _createClient } = supabase; const sb = _createClient(SUPABASE_URL, SUPABASE_KEY);

        function showSkeleton(el, count = 6) { const card = `<div class="skel-card"><div class="skel skel--img"></div><div class="skel-body"><div class="skel skel--line skel--short"></div><div class="skel skel--line"></div><div class="skel skel--line skel--med"></div><div class="skel skel--price"></div></div></div>`; el.innerHTML = `<section class="cat-section"><div class="cat-section__head"><div><div class="skel skel--title"></div><div class="skel skel--line skel--short" style="margin-top:6px"></div></div></div><div class="cat-section__grid" style="overflow:hidden">${Array(count).fill(card).join('')}</div></section>`; }

        /* ═══════════════════════════════════════════════════════════
           MEGA MENU — Récupération des catégories & rendu
           ═══════════════════════════════════════════════════════════ */

        const megaMenuLinks = document.getElementById('megaMenuLinks');
        const megaMenuDropdown = document.getElementById('megaMenuDropdown');
        const megaMenuDropdownInner = document.getElementById('megaMenuDropdownInner');
        const megaMenuToggle = document.getElementById('megaMenuToggle');
        const megaMenuNav = document.getElementById('megaMenuNav');

        // Icônes par défaut pour les catégories (basées sur le nom)
        function getCategoryIcon(name) {
            const n = (name || '').toLowerCase();
            if (n.includes('élect') || n.includes('tech') || n.includes('phone'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
            if (n.includes('mode') || n.includes('vêt') || n.includes('habit'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46a1 1 0 00-.62.94v13.2a1 1 0 00.62.94L8 20l4-3 4 3 4.38-1.46a1 1 0 00.62-.94V4.4a1 1 0 00-.62-.94z"/></svg>';
            if (n.includes('beauté') || n.includes('cosm') || n.includes('soin'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
            if (n.includes('maison') || n.includes('déco') || n.includes('meuble'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
            if (n.includes('aliment') || n.includes('nourr') || n.includes('food') || n.includes('cuisine'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>';
            if (n.includes('sport') || n.includes('fitness'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>';
            if (n.includes('livre') || n.includes('book') || n.includes('éduc'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';
            if (n.includes('jouet') || n.includes('enfant') || n.includes('bébé'))
                return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
            // Icône par défaut
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
        }

        function buildMegaMenu(categories, productsByCategory) {
            if (!categories || !categories.length) {
                megaMenuNav.style.display = 'none';
                return;
            }

            // ── Liens horizontaux (barre desktop) ──
            megaMenuLinks.innerHTML = categories.map(cat => {
                const count = productsByCategory.get(cat.id) || 0;
                return `<a href="category.html?id=${cat.id}" class="mega-menu__link" data-cat-id="${cat.id}">
                    ${escapeHTML(cat.name)}
                    ${count ? `<span class="mega-menu__count">${count}</span>` : ''}
                </a>`;
            }).join('');

            // ── Dropdown panel (grille complète) ──
            megaMenuDropdownInner.innerHTML = categories.map(cat => {
                const count = productsByCategory.get(cat.id) || 0;
                return `<a href="category.html?id=${cat.id}" class="mega-menu__card">
                    <span class="mega-menu__card-icon">${getCategoryIcon(cat.name)}</span>
                    <span class="mega-menu__card-info">
                        <span class="mega-menu__card-name">${escapeHTML(cat.name)}</span>
                        ${count ? `<span class="mega-menu__card-count">${count} produit${count > 1 ? 's' : ''}</span>` : '<span class="mega-menu__card-count">Explorer</span>'}
                    </span>
                    <svg class="mega-menu__card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </a>`;
            }).join('');

            megaMenuNav.style.display = '';
        }

        // ── Toggle dropdown ──
        let megaMenuOpen = false;

        function toggleMegaMenu(forceState) {
            megaMenuOpen = typeof forceState === 'boolean' ? forceState : !megaMenuOpen;
            megaMenuDropdown.classList.toggle('is-open', megaMenuOpen);
            megaMenuToggle.classList.toggle('is-open', megaMenuOpen);
            megaMenuNav.classList.toggle('is-open', megaMenuOpen);
        }

        if (megaMenuToggle) {
            megaMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMegaMenu();
            });
        }

        // Fermer le dropdown si clic en dehors
        document.addEventListener('click', (e) => {
            if (megaMenuOpen && !e.target.closest('.mega-menu')) {
                toggleMegaMenu(false);
            }
        });

        // Fermer avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && megaMenuOpen) {
                toggleMegaMenu(false);
            }
        });

        /* ═══════════════════════════════════════════════════════════
           CHARGEMENT DONNÉES
           ═══════════════════════════════════════════════════════════ */

        async function loadData() {
            showSkeleton(sectionsEl);

            const [pr, cr] = await Promise.all([
                sb.from('products')
                  .select('id,name,description,price,old_price,image_url,images,colors,badge,stock,category_id,vendor_id,vendors(shop_name),categories(id,name,slug)')
                  .eq('active', true)
                  .order('created_at', { ascending: false }),
                sb.from('categories')
                  .select('id,name,slug,vendor_id,position')
                  .order('position', { ascending: true, nullsFirst: false })
                  .order('name')
            ]);

            if (pr.error) {
                sectionsEl.innerHTML = `<div class="empty">⚠️ Erreur : ${escapeHTML(pr.error.message)}</div>`;
                return;
            }

            allProducts = pr.data || [];
            allCategories = cr.data || [];

            // Compter les produits par catégorie pour le mega menu
            const productsByCategory = new Map();
            for (const p of allProducts) {
                if (p.category_id) {
                    productsByCategory.set(p.category_id, (productsByCategory.get(p.category_id) || 0) + 1);
                }
            }

            // Construire le mega menu
            buildMegaMenu(allCategories, productsByCategory);

            // Rendu des sections produits
            render();
        }

        loadData();