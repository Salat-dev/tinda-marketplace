/* ══════════════════════════════════════════════════════════════
   TINDAMBA — responsive.js
   Script responsif centralisé pour TOUTES les pages.
   Inclure dans chaque page : <script src="js/responsive.js"></script>
   (après le CDN Supabase si nécessaire)
   ══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────────────────
       CONFIGURATION
       ───────────────────────────────────────────────────────── */
    const BREAKPOINT_MOBILE = 768;
    const BREAKPOINT_BOTTOM_NAV = 640;
    const NAVBAR_HEIGHT_DESKTOP = 68;
    const NAVBAR_HEIGHT_MOBILE = 52;

    /* ─────────────────────────────────────────────────────────
       UTILITAIRES
       ───────────────────────────────────────────────────────── */
    function escapeHTML(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function isMobile() {
        return window.innerWidth <= BREAKPOINT_MOBILE;
    }

    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'shop.html';
        return filename.replace('.html', '');
    }

    /* ─────────────────────────────────────────────────────────
       CART BADGE (mise à jour depuis localStorage)
       ───────────────────────────────────────────────────────── */
    function getCartCount() {
        try {
            const cart = JSON.parse(localStorage.getItem('tindamba_cart') || localStorage.getItem('tinda_cart') || '[]');
            return cart.reduce((s, i) => s + (i.qty || 0), 0);
        } catch {
            return 0;
        }
    }

    function updateAllCartBadges() {
        const count = getCartCount();
        document.querySelectorAll('#cartCount, #cartCountMobile, .bottom-nav__badge, .navbar__cart-count').forEach(el => {
            if (el) el.textContent = count;
        });
    }

    /* ─────────────────────────────────────────────────────────
       INJECTION DU HTML RESPONSIVE
       On injecte hamburger, search toggle, mobile search,
       mobile sidebar, et bottom nav uniquement si absents.
       ───────────────────────────────────────────────────────── */
    function injectResponsiveElements() {
        const page = getCurrentPage();

        // ── Hamburger button dans la navbar ──
        const navbarInner = document.querySelector('.navbar__inner');
        if (navbarInner && !document.querySelector('.mobile-hamburger')) {
            const hamburger = document.createElement('button');
            hamburger.className = 'mobile-hamburger';
            hamburger.id = 'hamburgerBtn';
            hamburger.setAttribute('aria-label', 'Menu');
            hamburger.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
            navbarInner.insertBefore(hamburger, navbarInner.firstChild);
        }

        // ── Search toggle dans la navbar ──
        if (navbarInner && !document.querySelector('.navbar__search-toggle')) {
            const searchToggle = document.createElement('button');
            searchToggle.className = 'navbar__search-toggle';
            searchToggle.id = 'searchToggle';
            searchToggle.setAttribute('aria-label', 'Rechercher');
            searchToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
            // Insérer avant les actions ou le cart
            const insertBefore = navbarInner.querySelector('.navbar__actions')
                || navbarInner.querySelector('.navbar__cart')
                || navbarInner.querySelector('.navbar__back');
            if (insertBefore) {
                navbarInner.insertBefore(searchToggle, insertBefore);
            } else {
                navbarInner.appendChild(searchToggle);
            }
        }

        // ── Mobile search overlay ──
        if (!document.getElementById('mobileSearch')) {
            const mobileSearch = document.createElement('div');
            mobileSearch.className = 'mobile-search';
            mobileSearch.id = 'mobileSearch';
            mobileSearch.innerHTML = `
                <div class="mobile-search__inner">
                    <input type="search" class="mobile-search__input" id="mobileSearchInput" placeholder="Rechercher un produit…" autocomplete="off" />
                    <button class="mobile-search__close" id="mobileSearchClose" aria-label="Fermer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `;
            document.body.insertBefore(mobileSearch, document.body.firstChild);
        }

        // ── Mobile sidebar ──
        if (!document.getElementById('mobileSidebar')) {
            const sidebar = document.createElement('div');
            sidebar.className = 'mobile-sidebar';
            sidebar.id = 'mobileSidebar';
            sidebar.innerHTML = `
                <div class="mobile-sidebar__overlay" id="sidebarOverlay"></div>
                <div class="mobile-sidebar__panel">
                    <div class="mobile-sidebar__header">
                        <a href="shop.html" class="mobile-sidebar__logo">
                        </a>
                        <button class="mobile-sidebar__close" id="sidebarClose" aria-label="Fermer le menu">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    <nav class="mobile-sidebar__nav">
                        <a href="shop.html" class="mobile-sidebar__link ${page === 'shop' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            Boutique
                        </a>
                        <a href="cart.html" class="mobile-sidebar__link ${page === 'cart' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>
                            Mon panier
                        </a>
                        <a href="faqs.html" class="mobile-sidebar__link ${page === 'faqs' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            FAQ
                        </a>
                        <a href="help.html" class="mobile-sidebar__link ${page === 'help' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Aide vendeur
                        </a>
                        <div class="mobile-sidebar__divider"></div>
                        <a href="login.html" class="mobile-sidebar__link ${page === 'login' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Espace vendeur
                        </a>
                        <a href="conditions.html" class="mobile-sidebar__link ${page === 'conditions' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            Conditions
                        </a>
                    </nav>
                    <div class="mobile-sidebar__footer">
                        <p>© 2025 Tindamba</p>
                    </div>
                </div>
            `;
            document.body.appendChild(sidebar);
        }

        // ── Bottom navigation ──
        if (!document.getElementById('bottomNav')) {
            const count = getCartCount();
            const bottomNav = document.createElement('nav');
            bottomNav.className = 'bottom-nav';
            bottomNav.id = 'bottomNav';
            bottomNav.innerHTML = `
                <div class="bottom-nav__inner">
                    <a href="shop.html" class="bottom-nav__item ${page === 'shop' || page === 'category' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <span>Boutique</span>
                    </a>
                    <a href="faqs.html" class="bottom-nav__item ${page === 'faqs' || page === 'help' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <span>Explorer</span>
                    </a>
                    <a href="cart.html" class="bottom-nav__item ${page === 'cart' || page === 'checkout' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6L8 16H20L22 6H6Z"/><path d="M6 6L4 2H2"/><circle cx="10" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>
                        <span class="bottom-nav__badge" id="cartCountMobile">${count}</span>
                        <span>Panier</span>
                    </a>
                    <a href="login.html" class="bottom-nav__item ${page === 'login' || page === 'dashboard' ? 'active' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span>Compte</span>
                    </a>
                </div>
            `;
            document.body.appendChild(bottomNav);
        }
    }

    /* ─────────────────────────────────────────────────────────
       EVENT HANDLERS
       ───────────────────────────────────────────────────────── */
    function bindEvents() {

        // ── Hamburger → ouvrir sidebar ──
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const mobileSidebar = document.getElementById('mobileSidebar');
        const sidebarClose = document.getElementById('sidebarClose');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (hamburgerBtn && mobileSidebar) {
            hamburgerBtn.addEventListener('click', () => {
                mobileSidebar.classList.add('open');
                document.body.style.overflow = 'hidden';
            });
        }

        function closeSidebar() {
            if (mobileSidebar) {
                mobileSidebar.classList.remove('open');
                document.body.style.overflow = '';
            }
        }

        if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

        // ── Search toggle ──
        const searchToggle = document.getElementById('searchToggle');
        const mobileSearch = document.getElementById('mobileSearch');
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        const mobileSearchClose = document.getElementById('mobileSearchClose');
        const desktopSearchInput = document.getElementById('searchInput');

        if (searchToggle && mobileSearch) {
            searchToggle.addEventListener('click', () => {
                mobileSearch.classList.add('open');
                if (mobileSearchInput) {
                    setTimeout(() => mobileSearchInput.focus(), 100);
                }
            });
        }

        if (mobileSearchClose && mobileSearch) {
            mobileSearchClose.addEventListener('click', () => {
                mobileSearch.classList.remove('open');
            });
        }

        // ── Sync mobile search → desktop search input ──
        if (mobileSearchInput && desktopSearchInput) {
            mobileSearchInput.addEventListener('input', () => {
                desktopSearchInput.value = mobileSearchInput.value;
                desktopSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
            });
            mobileSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const searchForm = document.getElementById('searchForm');
                    if (searchForm) {
                        searchForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }
                    mobileSearch.classList.remove('open');
                }
            });
        }

        // ── Fermer mobile search en cliquant dehors ──
        document.addEventListener('click', (e) => {
            if (mobileSearch && mobileSearch.classList.contains('open')) {
                if (!e.target.closest('.mobile-search') && !e.target.closest('.navbar__search-toggle')) {
                    mobileSearch.classList.remove('open');
                }
            }
        });

        // ── Raccourci clavier Escape ──
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSidebar();
                if (mobileSearch) mobileSearch.classList.remove('open');
            }
        });
    }

    /* ─────────────────────────────────────────────────────────
       ADAPT LAYOUT ON RESIZE
       ───────────────────────────────────────────────────────── */
    function adaptLayout() {
        const w = window.innerWidth;

        // Navbar cart: masquer sur petit mobile (présent dans bottom nav)
        const navCart = document.querySelector('.navbar__cart');
        if (navCart) {
            navCart.style.display = w <= BREAKPOINT_BOTTOM_NAV ? 'none' : '';
        }

        // Navbar actions (vendeur label)
        document.querySelectorAll('.navbar__action').forEach(el => {
            el.style.display = w <= BREAKPOINT_BOTTOM_NAV ? 'none' : '';
        });

        // Body padding pour bottom nav
        if (w <= BREAKPOINT_BOTTOM_NAV) {
            document.body.style.paddingBottom = 'calc(56px + env(safe-area-inset-bottom))';
        } else {
            document.body.style.paddingBottom = '';
        }

        // Fermer sidebar et search si on repasse en desktop
        if (w > BREAKPOINT_MOBILE) {
            const sidebar = document.getElementById('mobileSidebar');
            const search = document.getElementById('mobileSearch');
            if (sidebar) sidebar.classList.remove('open');
            if (search) search.classList.remove('open');
            document.body.style.overflow = '';
        }

        // Cat nav sticky offset
        const catNav = document.querySelector('.cat-nav');
        if (catNav) {
            catNav.style.top = (w <= BREAKPOINT_BOTTOM_NAV ? NAVBAR_HEIGHT_MOBILE : w <= BREAKPOINT_MOBILE ? 56 : NAVBAR_HEIGHT_DESKTOP) + 'px';
        }
    }

    /* ─────────────────────────────────────────────────────────
       SLIDER HORIZONTAL (touch-friendly)
       ───────────────────────────────────────────────────────── */
    if (typeof window.slideSection === 'undefined') {
        window.slideSection = function (sliderId, direction) {
            const grid = document.getElementById(sliderId);
            if (!grid) return;
            const card = grid.querySelector('.mi-card, .skel-card');
            const cardW = card ? card.offsetWidth + 16 : 220;
            grid.scrollBy({ left: direction * cardW * 2, behavior: 'smooth' });
        };
    }

    /* ─────────────────────────────────────────────────────────
       HIDE/SHOW BOTTOM NAV ON SCROLL
       ───────────────────────────────────────────────────────── */
    let lastScrollY = 0;
    let ticking = false;

    function handleScroll() {
        const bottomNav = document.getElementById('bottomNav');
        if (!bottomNav || window.innerWidth > BREAKPOINT_BOTTOM_NAV) return;

        const currentY = window.scrollY;
        const delta = currentY - lastScrollY;

        if (delta > 8 && currentY > 100) {
            bottomNav.style.transform = 'translateY(100%)';
            bottomNav.style.transition = 'transform 0.3s ease';
        } else if (delta < -5) {
            bottomNav.style.transform = 'translateY(0)';
            bottomNav.style.transition = 'transform 0.3s ease';
        }

        lastScrollY = currentY;
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }, { passive: true });

    /* ─────────────────────────────────────────────────────────
       INITIALISATION
       ───────────────────────────────────────────────────────── */
    function init() {
        injectResponsiveElements();
        bindEvents();
        adaptLayout();
        updateAllCartBadges();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(adaptLayout, 80);
    });

    // Écouter les changements du panier (multi-tabs)
    window.addEventListener('storage', (e) => {
        if (e.key === 'tindamba_cart' || e.key === 'tinda_cart') {
            updateAllCartBadges();
        }
    });

    // Export pour usage externe
    window.TindambaResponsive = {
        updateCartBadges: updateAllCartBadges,
        getCartCount: getCartCount,
        adaptLayout: adaptLayout,
        closeSidebar: function () {
            const sidebar = document.getElementById('mobileSidebar');
            if (sidebar) sidebar.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

})();