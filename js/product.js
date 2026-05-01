      const SUPABASE_URL = "https://uytrjgtrpsbegifudosi.supabase.co";
        const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga";
        const SUPPORT_WHATSAPP = "237693421348";

        const { createClient } = supabase;
        const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

        const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

        function esc(s) {
            return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }
        function formatXAF(n) {
            return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n || 0);
        }
        function badgeLabel(b) {
            return ({ new: "Nouveau", bestseller: "Best-seller", featured: "Coup de cœur", promo: "Promo", limited: "Limité", out_of_stock: "Épuisé", unlimited: "Disponible" }[b] || b);
        }
        function toast(msg, type = "info") {
            const tc = document.getElementById("toastContainer");
            const el = document.createElement("div");
            el.className = `toast toast--${type}`;
            const icon = type === "success"
                ? '<polyline points="20 6 9 17 4 12"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
            el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${icon}</svg>${esc(msg)}`;
            tc.appendChild(el);
            setTimeout(() => el.remove(), 3400);
        }

        const Cart = {
            get() { try { return JSON.parse(localStorage.getItem("tindamba_cart") || "[]"); } catch { return []; } },
            save(c) { localStorage.setItem("tindamba_cart", JSON.stringify(c)); },
            count() { return this.get().reduce((s, i) => s + i.qty, 0); },
            add(product, qty = 1, color = null) {
                const cart = this.get();
                const key = color ? `${product.id}__${color}` : product.id;
                const ex = cart.find(i => i._key === key);
                if (ex) ex.qty += qty;
                else cart.push({ _key: key, id: product.id, vendor_id: product.vendor_id || null, vendor: product.vendors?.shop_name || "Tindamba", name: product.name, price: product.price, image: product.image_url, color, qty });
                this.save(cart);
                document.getElementById("cartCount").textContent = this.count();
            }
        };

        document.getElementById("cartCount").textContent = Cart.count();

        const productId = new URLSearchParams(location.search).get("id");
        let product = null;
        let selectedColor = null;
        let qty = 1;

        async function loadProduct() {
            if (!productId) {
                showError("Produit introuvable", "Aucun identifiant fourni dans l'URL.");
                return;
            }
            const { data, error } = await sb.from("products").select(`
                id, name, description, price, old_price,
                image_url, images, colors, badge, stock,
                category_id, vendor_id,
                vendors ( id, shop_name, whatsapp, city ),
                categories ( id, name, slug )
            `).eq("id", productId).single();

            if (error || !data) {
                showError("Produit introuvable", "Ce produit n'existe pas ou a été supprimé.");
                return;
            }

            product = data;
            if (typeof product.colors === "string") {
                try { product.colors = JSON.parse(product.colors); } catch { product.colors = []; }
            }
            product.colors = Array.isArray(product.colors) ? product.colors : [];
            selectedColor = product.colors[0]?.hex || product.colors[0] || null;

            renderProduct();
            updateStickyPrice();
            loadRelated();
        }

        function renderProduct() {
            const p = product;
            const images = Array.isArray(p.images) && p.images.length ? p.images : [p.image_url];
            const hasPromo = p.old_price && p.old_price > p.price;
            const discount = hasPromo ? Math.round((1 - p.price / p.old_price) * 100) : 0;
            const isOut = p.stock <= 0 || p.badge === "out_of_stock";
            const showBadge = p.badge && p.badge !== "out_of_stock";

            document.getElementById("breadcrumbCat").textContent = p.categories?.name || "Catégorie";
            document.getElementById("breadcrumbName").textContent = p.name;
            document.title = `${p.name} · Tindamba`;

            let stockHTML, stockClass;
            if (isOut) {
                stockHTML = `<span class="stock-dot stock-dot--out"></span>Rupture de stock`;
                stockClass = "product-info__stock--out";
            } else if (p.stock <= 5) {
                stockHTML = `<span class="stock-dot stock-dot--low"></span>Plus que ${p.stock} en stock`;
                stockClass = "product-info__stock--low";
            } else {
                stockHTML = `<span class="stock-dot stock-dot--ok"></span>En stock`;
                stockClass = "product-info__stock--ok";
            }

            let colorsHTML = "";
            if (p.colors.length) {
                const colorBtns = p.colors.map(c => {
                    const hex = c?.hex || c;
                    const label = c?.name || c?.hex || c;
                    return `<button class="color-btn${hex === selectedColor ? " is-active" : ""}"
                        style="background:${esc(hex)}"
                        data-color="${esc(hex)}"
                        title="${esc(label)}"
                        aria-label="Couleur ${esc(label)}"></button>`;
                }).join("");
                colorsHTML = `
                <div class="product-info__label">Couleur <span class="product-info__label-val" id="colorLabel">${esc(selectedColor || "")}</span></div>
                <div class="color-selector" id="colorSelector">${colorBtns}</div>`;
            }

            const wa = p.vendors?.whatsapp || SUPPORT_WHATSAPP;
            const waText = encodeURIComponent(`Bonjour, je suis intéressé par "${p.name}" sur Tindamba.`);
            const waLink = `https://wa.me/${wa.replace(/\D/g, "")}?text=${waText}`;

            const thumbs = images.map((src, i) =>
                `<div class="gallery__thumb${i === 0 ? " is-active" : ""}" data-index="${i}" data-src="${esc(src)}">
                    <img src="${esc(src)}" alt="Vue ${i + 1}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
                </div>`
            ).join("");

            let badgeHTML = "";
            if (showBadge) badgeHTML = `<span class="gallery__badge gallery__badge--${p.badge}">${esc(badgeLabel(p.badge))}</span>`;
            else if (isOut) badgeHTML = `<span class="gallery__badge gallery__badge--out_of_stock">Épuisé</span>`;
            else if (hasPromo) badgeHTML = `<span class="gallery__badge gallery__badge--promo">−${discount}%</span>`;

            document.getElementById("productZone").innerHTML = `
            <div class="product-layout">
                <div class="gallery">
                    <div class="gallery__main" id="galleryMain">
                        ${badgeHTML}
                        <img id="galleryMainImg" src="${esc(images[0])}" alt="${esc(p.name)}" onerror="this.src='${IMG_FALLBACK}'">
                    </div>
                    ${images.length > 1 ? `<div class="gallery__thumbs" id="galleryThumbs">${thumbs}</div>` : ""}
                </div>

                <div class="product-info">
                    <div class="product-info__vendor">
                        <span class="product-info__vendor-dot"></span>
                        ${esc(p.vendors?.shop_name || "Tindamba")}
                        ${p.vendors?.city ? `· ${esc(p.vendors.city)}` : ""}
                    </div>

                    <h1 class="product-info__title">${esc(p.name)}</h1>

                    <div class="product-info__price">
                        <span class="product-info__price-current" id="currentPrice">${formatXAF(p.price)}</span>
                        ${hasPromo ? `<span class="product-info__price-old">${formatXAF(p.old_price)}</span>` : ""}
                        ${hasPromo ? `<span class="product-info__price-tag">−${discount}%</span>` : ""}
                    </div>

                    <p class="product-info__desc">${esc(p.description)}</p>

                    <div class="product-info__stock ${stockClass}">${stockHTML}</div>

                    ${colorsHTML}

                    <div class="product-info__label">Quantité</div>
                    <div class="qty-row">
                        <div class="qty-control">
                            <button class="qty-btn" id="qtyMinus" onclick="changeQty(-1)" ${isOut ? "disabled" : ""}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <span class="qty-val" id="qtyDisplay">1</span>
                            <button class="qty-btn" id="qtyPlus" onclick="changeQty(1)" ${isOut ? "disabled" : ""}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                        </div>
                        <span class="qty-subtotal" id="qtySubtotal">${formatXAF(p.price)}</span>
                    </div>

                    <div class="cta-group">
                        <button class="btn-primary" id="addToCartBtn" onclick="addToCart()" ${isOut ? "disabled" : ""}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>
                            ${isOut ? "Produit épuisé" : "Ajouter au panier"}
                        </button>
                        <a class="btn-whatsapp" href="${waLink}" target="_blank" rel="noopener">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            Commander via WhatsApp
                        </a>
                    </div>

                    <div class="product-meta">
                        ${p.categories ? `<div class="product-meta__row"><span class="product-meta__key"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>Catégorie</span><span class="product-meta__val">${esc(p.categories.name)}</span></div>` : ""}
                        <div class="product-meta__row"><span class="product-meta__key"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Vendeur</span><span class="product-meta__val">${esc(p.vendors?.shop_name || "—")}</span></div>
                        ${p.vendors?.city ? `<div class="product-meta__row"><span class="product-meta__key"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Ville</span><span class="product-meta__val">${esc(p.vendors.city)}</span></div>` : ""}
                        <div class="product-meta__row"><span class="product-meta__key"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/></svg>Livraison</span><span class="product-meta__val" style="color:var(--color-accent)">Paiement à la livraison</span></div>
                    </div>
                </div>
            </div>`;

            document.querySelectorAll(".gallery__thumb").forEach(t => {
                t.addEventListener("click", () => {
                    document.querySelectorAll(".gallery__thumb").forEach(x => x.classList.remove("is-active"));
                    t.classList.add("is-active");
                    document.getElementById("galleryMainImg").src = t.dataset.src;
                });
            });

            document.querySelectorAll(".color-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    selectedColor = btn.dataset.color;
                    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("is-active"));
                    btn.classList.add("is-active");
                    const label = document.getElementById("colorLabel");
                    if (label) label.textContent = selectedColor;
                });
            });

            const stickyBtn = document.getElementById("stickyAddBtn");
            stickyBtn.disabled = isOut;
            stickyBtn.onclick = addToCart;
        }

        function changeQty(delta) {
            const p = product;
            const max = p.badge === "unlimited" ? 999 : p.stock || 999;
            qty = Math.max(1, Math.min(max, qty + delta));
            document.getElementById("qtyDisplay").textContent = qty;
            document.getElementById("qtySubtotal").textContent = formatXAF(p.price * qty);
            document.getElementById("qtyMinus").disabled = qty <= 1;
            document.getElementById("qtyPlus").disabled = qty >= max;
            updateStickyPrice();
        }
        window.changeQty = changeQty;

        function updateStickyPrice() {
            if (!product) return;
            document.getElementById("stickyPrice").textContent = formatXAF(product.price * qty);
            const oldEl = document.getElementById("stickyOldPrice");
            if (oldEl) oldEl.textContent = product.old_price && product.old_price > product.price ? formatXAF(product.old_price) : "";
        }

        function addToCart() {
            if (!product) return;
            if (product.stock <= 0 || product.badge === "out_of_stock") {
                toast("Ce produit est en rupture de stock", "error");
                return;
            }
            Cart.add(product, qty, selectedColor);
            toast(`"${product.name}" ajouté au panier ✓`, "success");
        }
        window.addToCart = addToCart;

        async function loadRelated() {
            const p = product;
            if (!p.category_id) return;
            const { data } = await sb.from("products").select("id, name, description, price, old_price, image_url, images, badge, stock, vendor_id, vendors(shop_name)").eq("active", true).eq("category_id", p.category_id).neq("id", p.id).limit(8);
            if (!data || !data.length) return;

            const cards = data.map(rp => {
                const img = (Array.isArray(rp.images) && rp.images[0]) || rp.image_url || IMG_FALLBACK;
                const hasPromo = rp.old_price && rp.old_price > rp.price;
                const discount = hasPromo ? Math.round((1 - rp.price / rp.old_price) * 100) : 0;
                const isOut = rp.stock <= 0 || rp.badge === "out_of_stock";
                const badgeHTML = rp.badge && rp.badge !== "out_of_stock"
                    ? `<span class="badge badge--${rp.badge}">${esc(badgeLabel(rp.badge))}</span>`
                    : isOut ? `<span class="badge badge--out_of_stock">Épuisé</span>` : "";

                return `
                <a href="product.html?id=${esc(rp.id)}" class="mi-card${isOut ? " mi-card--out" : ""}" aria-label="${esc(rp.name)}">
                    <div class="mi-card__media">
                        ${badgeHTML}
                        <img src="${esc(img)}" alt="${esc(rp.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
                    </div>
                    <div class="mi-card__body">
                        <div class="mi-card__vendor">${esc(rp.vendors?.shop_name || "—")}</div>
                        <h3 class="mi-card__name">${esc(rp.name)}</h3>
                        <p class="mi-card__desc">${esc(rp.description || "")}</p>
                        <div class="mi-card__price">
                            <span class="mi-card__price-current">${formatXAF(rp.price)}</span>
                            ${hasPromo ? `<span class="mi-card__price-old">${formatXAF(rp.old_price)}</span>` : ""}
                            ${hasPromo ? `<span class="mi-card__price-discount">−${discount}%</span>` : ""}
                        </div>
                    </div>
                </a>`;
            }).join("");

            document.getElementById("relatedZone").innerHTML = `
            <div class="related">
                <div class="related__head">
                    <h2 class="related__title">Dans la même catégorie</h2>
                    <p class="related__sub">${data.length} autres produits similaires</p>
                </div>
                <div class="related__grid">${cards}</div>
            </div>`;
        }

        function showError(title, sub) {
            document.getElementById("productZone").innerHTML = `
            <div class="empty">
                <div class="empty__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <h3 class="empty__title">${esc(title)}</h3>
                <p class="empty__sub">${esc(sub)}</p>
                <a href="shop.html" class="btn-outline">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Retour à la boutique
                </a>
            </div>`;
        }

        loadProduct();