   const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

        function esc(s) {
            return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function formatXAF(n) {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0);
        }

        function toast(msg, type = 'info') {
            const tc = document.getElementById('toastContainer');
            const el = document.createElement('div');
            el.className = `toast toast--${type}`;
            const icon = type === 'success'
                ? '<polyline points="20 6 9 17 4 12"/>'
                : '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>';
            el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">${icon}</svg>${esc(msg)}`;
            tc.appendChild(el);
            setTimeout(() => el.remove(), 3200);
        }

        const Cart = {
            get()       { try { return JSON.parse(localStorage.getItem('Tinda_cart') || '[]'); } catch { return []; } },
            save(c)     { localStorage.setItem('Tinda_cart', JSON.stringify(c)); },
            count()     { return this.get().reduce((s, i) => s + i.qty, 0); },
            subtotal()  { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },

            updateQty(key, delta) {
                const cart = this.get();
                const item = cart.find(i => i._key === key);
                if (!item) return;
                item.qty = Math.max(1, item.qty + delta);
                this.save(cart);
                this.syncCount();
                renderCart();
            },

            remove(key) {
                const cart = this.get().filter(i => i._key !== key);
                this.save(cart);
                this.syncCount();
                renderCart();
                toast('Article retiré du panier', 'error');
            },

            clear() {
                this.save([]);
                this.syncCount();
                renderCart();
            },

            syncCount() {
                document.getElementById('cartCount').textContent = this.count();
            }
        };

        function renderCart() {
            const items = Cart.get();
            const list  = document.getElementById('itemsList');
            const grid  = document.getElementById('checkoutGrid');
            const sub   = document.getElementById('pageSubtitle');
            const checkoutBtn = document.getElementById('checkoutBtn');

            const total = Cart.count();
            sub.textContent = total === 0
                ? 'Votre panier est vide'
                : `${total} article${total > 1 ? 's' : ''} dans votre panier`;

            document.getElementById('summaryCount').textContent    = total;
            document.getElementById('summarySubtotal').textContent = formatXAF(Cart.subtotal());
            document.getElementById('summaryTotal').textContent    = formatXAF(Cart.subtotal());

            if (!items.length) {
                grid.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart__icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                            <path d="M6 6L8 16H20L22 6H6Z"/>
                            <path d="M6 6L4 2H2"/>
                            <circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/>
                            <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/>
                        </svg>
                    </div>
                    <h2 class="empty-cart__title">Votre panier est vide</h2>
                    <p class="empty-cart__sub">Explorez notre catalogue et ajoutez les produits qui vous plaisent.</p>
                    <a href="shop.html" class="btn-shop">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                        Voir la boutique
                    </a>
                </div>`;
                return;
            }

            if (checkoutBtn) checkoutBtn.disabled = (total === 0);

            list.innerHTML = items.map(item => {
                const subtotal = item.price * item.qty;
                const colorDot = item.color
                    ? `<span class="cart-item__color">
                         <span class="cart-item__color-dot" style="background:${esc(item.color)}"></span>
                         ${esc(item.color)}
                       </span>`
                    : '';

                return `
                <div class="cart-item" data-key="${esc(item._key)}">
                    <img class="cart-item__img"
                         src="${esc(item.image || IMG_FALLBACK)}"
                         alt="${esc(item.name)}"
                         onerror="this.src='${IMG_FALLBACK}'">

                    <div class="cart-item__body">
                        <div class="cart-item__vendor">${esc(item.vendor || 'Tinda')}</div>
                        <div class="cart-item__name">${esc(item.name)}</div>
                        ${colorDot}
                        <div class="cart-item__unit-price" style="margin-top:4px">${formatXAF(item.price)} / unité</div>
                    </div>

                    <div class="cart-item__right">
                        <div class="cart-item__price">${formatXAF(subtotal)}</div>

                        <div class="qty-control">
                            <button class="qty-btn"
                                    onclick="Cart.updateQty('${esc(item._key)}', -1)"
                                    ${item.qty <= 1 ? 'disabled' : ''}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <span class="qty-val">${item.qty}</span>
                            <button class="qty-btn"
                                    onclick="Cart.updateQty('${esc(item._key)}', 1)">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                        </div>

                        <button class="cart-item__remove"
                                aria-label="Supprimer"
                                onclick="Cart.remove('${esc(item._key)}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
                    </div>
                </div>`;
            }).join('');
        }

        function clearAll() {
            if (Cart.count() === 0) return;
            if (!confirm('Vider le panier entièrement ?')) return;
            Cart.clear();
            toast('Panier vidé', 'error');
        }
        window.clearAll = clearAll;

        /* ── Init ── */
        Cart.syncCount();
        renderCart();
