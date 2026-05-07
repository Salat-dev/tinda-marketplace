    const SUPABASE_URL = 'https://uytrjgtrpsbegifudosi.supabase.co';
        const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
        const { createClient } = supabase;
        const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

        /* ── UTILS ── */
        function esc(s) {
            return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        function formatXAF(n) {
            return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(n||0);
        }
        function badgeLabel(b) {
            return ({ new: 'Nouveau', bestseller: 'Best-seller', featured: 'Coup de cœur', promo: 'Promo', out_of_stock: 'Épuisé' }[b] || b);
        }
        function toast(msg, type='info') {
            const tc = document.getElementById('toastContainer');
            const el = document.createElement('div');
            el.className = `toast toast--${type}`;
            const icon = type==='success'
                ? '<polyline points="20 6 9 17 4 12"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>';
            el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${icon}</svg>${esc(msg)}`;
            tc.appendChild(el);
            setTimeout(() => el.remove(), 3200);
        }

        /* ── CART (identique) ── */
        const Cart = {
            get()      { try { return JSON.parse(localStorage.getItem('Tinda_cart')||'[]'); } catch{ return []; } },
            save(c)    { localStorage.setItem('Tinda_cart', JSON.stringify(c)); },
            count()    { return this.get().reduce((s,i)=>s+i.qty,0); },
            add(product, qty=1) {
                const cart = this.get();
                const key = String(product.id);
                const ex = cart.find(i => i._key === key);
                if (ex) { ex.qty += qty; }
                else { cart.push({ _key: key, id: product.id, vendor_id: product.vendor_id||null, vendor: product.vendors?.shop_name||'Tinda', name: product.name, price: product.price, image: (Array.isArray(product.images)&&product.images[0])||product.image_url||'', color: null, qty }); }
                this.save(cart);
                document.getElementById('cartCount').textContent = this.count();
            }
        };
        document.getElementById('cartCount').textContent = Cart.count();

        let allProducts = [];
        const categoryId = new URLSearchParams(location.search).get('id');

        async function loadCategory() {
            if (!categoryId) {
                document.getElementById('catTitle').textContent = 'Catégorie introuvable';
                document.getElementById('catCount').textContent = '';
                return;
            }

            // Charger la catégorie
            const { data: catData } = await sb.from('categories').select('name').eq('id', categoryId).single();
            if (!catData) {
                document.getElementById('catTitle').textContent = 'Catégorie introuvable';
                document.getElementById('catCount').textContent = '';
                return;
            }
            document.getElementById('catTitle').textContent = catData.name;
            document.title = `${catData.name} · Tinda`;

            // Charger les produits
            const { data: products, error } = await sb
                .from('products')
                .select('id, name, description, price, old_price, image_url, images, colors, badge, stock, vendor_id, vendors(shop_name)')
                .eq('active', true)
                .eq('category_id', categoryId)
                .order('created_at', { ascending: false });

            if (error) {
                document.getElementById('catCount').textContent = 'Erreur de chargement';
                return;
            }

            allProducts = products || [];
            document.getElementById('catCount').textContent = `${allProducts.length} produit${allProducts.length > 1 ? 's' : ''}`;

            // Extraire les couleurs uniques
            const colorSet = new Set();
            allProducts.forEach(p => {
                let colors = p.colors;
                if (typeof colors === 'string') {
                    try { colors = JSON.parse(colors); } catch { colors = []; }
                }
                if (Array.isArray(colors)) {
                    colors.forEach(c => {
                        const hex = c?.hex || c;
                        if (hex) colorSet.add(hex);
                    });
                }
            });
            const colorSelect = document.getElementById('colorFilter');
            colorSelect.innerHTML = '<option value="">Toutes</option>';
            Array.from(colorSet).sort().forEach(hex => {
                const opt = document.createElement('option');
                opt.value = hex;
                opt.textContent = hex;
                colorSelect.appendChild(opt);
            });

            applyFilters(); // rendu initial
        }

        function parseColors(product) {
            let colors = product.colors;
            if (typeof colors === 'string') {
                try { colors = JSON.parse(colors); } catch { colors = []; }
            }
            return Array.isArray(colors) ? colors : [];
        }

        function applyFilters() {
            const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
            const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
            const colorFilter = document.getElementById('colorFilter').value;
            const sort = document.getElementById('sortFilter').value;

            let filtered = allProducts.filter(p => {
                const price = p.price || 0;
                if (price < minPrice || price > maxPrice) return false;
                if (colorFilter) {
                    const colors = parseColors(p);
                    if (!colors.some(c => (c?.hex || c) === colorFilter)) return false;
                }
                return true;
            });

            // Tri
            if (sort === 'price_asc') filtered.sort((a,b) => (a.price||0) - (b.price||0));
            else if (sort === 'price_desc') filtered.sort((a,b) => (b.price||0) - (a.price||0));
            else if (sort === 'name') filtered.sort((a,b) => (a.name||'').localeCompare(b.name||''));
            // 'newest' est déjà l'ordre par défaut (created_at desc)

            document.getElementById('products').innerHTML = filtered.map(cardHTML).join('');
        }

        function resetFilters() {
            document.getElementById('minPrice').value = '';
            document.getElementById('maxPrice').value = '';
            document.getElementById('colorFilter').value = '';
            document.getElementById('sortFilter').value = 'newest';
            applyFilters();
        }
        window.applyFilters = applyFilters;
        window.resetFilters = resetFilters;

        function cardHTML(p) {
            const img = (Array.isArray(p.images) && p.images[0]) || p.image_url || IMG_FALLBACK;
            const hasPromo = p.old_price && p.old_price > p.price;
            const isOut = p.stock <= 0 || p.badge === 'out_of_stock';
            const showBadge = p.badge && p.badge !== 'out_of_stock';
            const discount = hasPromo ? Math.round((1 - p.price / p.old_price) * 100) : 0;
            const desc = p.description || `Vendu par ${p.vendors?.shop_name || 'Tinda'}`;
            const rating = (3.5 + Math.random() * 1.5).toFixed(1);
            const reviews = Math.floor(10 + Math.random() * 200);
            const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

            let badgeHTML = '';
            if (showBadge) badgeHTML = `<span class="badge badge--${p.badge}">${esc(badgeLabel(p.badge))}</span>`;
            else if (isOut) badgeHTML = `<span class="badge badge--out_of_stock">Épuisé</span>`;
            else if (hasPromo) badgeHTML = `<span class="badge badge--promo">−${discount}%</span>`;

            // Swatches
            const colors = parseColors(p);
            let swatchesHTML = '';
            if (colors.length) {
                const visible = colors.slice(0, 5);
                const extra = colors.length - 5;
                const sw = visible.map(c => `<span class="mi-swatch" style="background:${esc(c?.hex||c)}" title="${esc(c?.name||c?.hex||c)}"></span>`).join('');
                const more = extra > 0 ? `<span class="mi-swatch--more">+${extra}</span>` : '';
                swatchesHTML = `<div class="mi-card__swatches">${sw}${more}</div>`;
            }

            return `<a href="product.html?id=${p.id}" class="mi-card${isOut ? ' mi-card--out' : ''}" aria-label="${esc(p.name)}">
                <div class="mi-card__media">
                    ${badgeHTML}
                    <button class="mi-card__wish" aria-label="Ajouter aux favoris" onclick="event.preventDefault();event.stopPropagation();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                    <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
                    <button class="mi-card__atc" aria-label="Ajouter au panier" onclick="event.preventDefault();event.stopPropagation();quickAddToCart('${p.id}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>
                        Ajouter
                    </button>
                </div>
                <div class="mi-card__body">
                    <div class="mi-card__vendor">${esc(p.vendors?.shop_name || 'Tinda')}</div>
                    <h3 class="mi-card__name">${esc(p.name)}</h3>
                    <p class="mi-card__desc">${esc(desc)}</p>
                    ${swatchesHTML}
                    <div class="mi-card__rating"><span class="mi-card__stars">${stars}</span><span>${rating} (${reviews})</span></div>
                    <div class="mi-card__price">
                        <span class="mi-card__price-current">${formatXAF(p.price)}</span>
                        ${hasPromo ? `<span class="mi-card__price-old">${formatXAF(p.old_price)}</span>` : ''}
                        ${hasPromo ? `<span class="mi-card__price-discount">−${discount}%</span>` : ''}
                    </div>
                </div>
            </a>`;
        }

        window.quickAddToCart = function(productId) {
            const product = allProducts.find(p => p.id == productId);
            if (!product) { toast('Produit introuvable', 'error'); return; }
            if (product.stock <= 0 || product.badge === 'out_of_stock') { toast('Ce produit est en rupture de stock', 'error'); return; }
            Cart.add(product, 1);
            toast(`"${product.name}" ajouté au panier ✓`, 'success');
        };

        loadCategory();
