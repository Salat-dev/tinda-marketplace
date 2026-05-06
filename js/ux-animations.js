/**
 * ═══════════════════════════════════════════════════════════
 * TINDA UX ANIMATIONS — Expérience utilisateur captivante
 * ═══════════════════════════════════════════════════════════
 * Utilise Anime.js pour des animations fluides et engageantes
 */

document.addEventListener('DOMContentLoaded', () => {
    initUXAnimations();
});

function initUXAnimations() {
    // Attendre le chargement d'Anime.js
    const animeInterval = setInterval(() => {
        if (typeof anime !== 'undefined') {
            clearInterval(animeInterval);
            setupAllAnimations();
        }
    }, 50);
}

function setupAllAnimations() {
    setupHeaderAnimations();
    setupSearchAnimation();
    setupHeroAnimations();
    setupCategoryCardAnimations();
    setupProductCardAnimations();
    setupScrollRevealAnimations();
    setupTrustBarAnimation();
    setupMegaMenuAnimation();
    setupCartAnimation();
    setupPromoCountdown();
    setupSmoothScroll();
}

/**
 * ─── ANIMATION DU HEADER AU SCROLL ───
 * Effet de compression élégant du header avec transition fluide
 */
function setupHeaderAnimations() {
    const navbar = document.querySelector('.navbar');
    const megaNav = document.querySelector('.mega');
    let lastScroll = 0;
    let scrollTimer;
    
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        const currentScroll = window.pageYOffset;
        
        // Animation de compression de la navbar
        if (currentScroll > 100) {
            if (!navbar.classList.contains('navbar--compact')) {
                navbar.classList.add('navbar--compact');
                anime({
                    targets: '.navbar__logo-svg',
                    scale: 0.85,
                    duration: 300,
                    easing: 'easeOutCubic'
                });
            }
        } else {
            navbar.classList.remove('navbar--compact');
            anime({
                targets: '.navbar__logo-svg',
                scale: 1,
                duration: 300,
                easing: 'easeOutCubic'
            });
        }
        
        // Effet de flottement élégant
        if (currentScroll > lastScroll && currentScroll > 200) {
            navbar.style.transform = 'translateY(-100%)';
            if (megaNav) megaNav.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
            if (megaNav) megaNav.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
        
        // Animation de la barre de progression
        updateScrollProgress();
    });
}

/**
 * ─── BARRE DE PROGRESSION DE LECTURE ───
 */
function updateScrollProgress() {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    let progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        document.body.appendChild(progressBar);
    }
    
    anime({
        targets: progressBar,
        width: scrolled + '%',
        duration: 200,
        easing: 'easeOutCubic'
    });
}

/**
 * ─── ANIMATION DE LA RECHERCHE ───
 * Recherche prédictive avec micro-interactions
 */
function setupSearchAnimation() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchKbd = document.querySelector('.navbar__search-kbd');
    
    if (!searchInput || !searchForm) return;
    
    // Raccourci clavier ⌘K / Ctrl+K
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            
            // Animation de focus
            anime({
                targets: '.navbar__search',
                scale: [1, 1.02, 1],
                boxShadow: [
                    '0 0 0 0 rgba(0,113,227,0)',
                    '0 0 0 8px rgba(0,113,227,0.1)',
                    '0 0 0 0 rgba(0,113,227,0)'
                ],
                duration: 800,
                easing: 'easeOutCubic'
            });
        }
    });
    
    // Animation du placeholder
    searchInput.addEventListener('focus', () => {
        anime({
            targets: searchKbd,
            scale: [1, 0],
            opacity: [1, 0],
            duration: 200,
            easing: 'easeInCubic'
        });
        
        anime({
            targets: '.navbar__search',
            borderColor: '#1D1D1F',
            duration: 300,
            easing: 'easeOutCubic'
        });
    });
    
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value) {
            anime({
                targets: searchKbd,
                scale: [0, 1],
                opacity: [0, 1],
                duration: 200,
                easing: 'easeOutCubic'
            });
        }
        
        anime({
            targets: '.navbar__search',
            borderColor: '#E8E8ED',
            duration: 300,
            easing: 'easeOutCubic'
        });
    });
}

/**
 * ─── ANIMATIONS DU HERO ───
 * Effets cinématiques à l'arrivée sur la page
 */
function setupHeroAnimations() {
    // Timeline d'animation du hero
    const heroTimeline = anime.timeline({
        easing: 'easeOutCubic',
        autoplay: true
    });
    
    heroTimeline
        .add({
            targets: '.hero__badge',
            opacity: [0, 1],
            translateY: [20, 0],
            scale: [0.9, 1],
            duration: 600
        })
        .add({
            targets: '.hero__title',
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 800
        }, '-=400')
        .add({
            targets: '.hero__sub',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600
        }, '-=400')
        .add({
            targets: '.hero__cta',
            opacity: [0, 1],
            translateY: [20, 0],
            scale: [0.95, 1],
            duration: 500
        }, '-=300')
        .add({
            targets: '.hero__main-img',
            opacity: [0, 1],
            scale: [0.8, 1],
            duration: 800,
            easing: 'spring(1, 80, 10, 0)'
        }, '-=500')
        .add({
            targets: '.hero__card',
            opacity: [0, 1],
            translateX: [30, 0],
            duration: 600,
            delay: anime.stagger(150)
        }, '-=600');
    
    // Animation continue de flottement
    anime({
        targets: '.hero__main-img',
        translateY: [0, -15],
        duration: 3000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine'
    });
    
    // Effet parallaxe sur les cartes hero
    document.querySelectorAll('.hero__card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            anime({
                targets: card.querySelector('img'),
                translateX: (x - 0.5) * -10,
                translateY: (y - 0.5) * -10,
                duration: 800,
                easing: 'easeOutCubic'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card.querySelector('img'),
                translateX: 0,
                translateY: 0,
                duration: 600,
                easing: 'easeOutCubic'
            });
        });
    });
}

/**
 * ─── ANIMATIONS DES CARTES CATÉGORIES ───
 * Effet de survol 3D et micro-interactions
 */
function setupCategoryCardAnimations() {
    // Animation d'entrée des catégories
    const catObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const tiles = entry.target.querySelectorAll('.cat-tile');
                anime({
                    targets: tiles,
                    opacity: [0, 1],
                    translateY: [40, 0],
                    scale: [0.95, 1],
                    duration: 600,
                    delay: anime.stagger(50),
                    easing: 'easeOutCubic'
                });
                catObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    const catGrid = document.getElementById('catGrid');
    if (catGrid) catObserver.observe(catGrid);
    
    // Effet 3D sur les tuiles
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.cat-tile:hover').forEach(tile => {
            const rect = tile.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            anime({
                targets: tile,
                rotateX: rotateX,
                rotateY: rotateY,
                scale: 1.05,
                duration: 800,
                easing: 'easeOutCubic'
            });
            
            // Effet de lumière
            anime({
                targets: tile,
                boxShadow: [
                    `0 ${Math.abs(rotateX)}px ${Math.abs(rotateY) * 2}px rgba(0,0,0,0.1)`,
                    `0 ${Math.abs(rotateX) * 2}px ${Math.abs(rotateY) * 3}px rgba(0,0,0,0.15)`
                ],
                duration: 500,
                easing: 'easeOutCubic'
            });
        });
    });
    
    // Reset des transformations
    document.querySelectorAll('.cat-tile').forEach(tile => {
        tile.addEventListener('mouseleave', () => {
            anime({
                targets: tile,
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                duration: 600,
                easing: 'spring(1, 80, 10, 0)'
            });
        });
    });
}

/**
 * ─── ANIMATIONS DES CARTES PRODUIT ───
 * Effets de survol premium avec retour haptique visuel
 */
function setupProductCardAnimations() {
    // Observer pour les animations d'entrée
    const productObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.mi-card');
                anime({
                    targets: cards,
                    opacity: [0, 1],
                    translateY: [60, 0],
                    scale: [0.9, 1],
                    duration: 800,
                    delay: anime.stagger(80),
                    easing: 'easeOutCubic',
                    begin: function(anim) {
                        // Effet de rebond sur les cartes
                        anime({
                            targets: anim.animatables.map(a => a.target),
                            scale: [0.9, 1.02, 1],
                            translateY: [60, -10, 0],
                            duration: 1000,
                            easing: 'easeOutElastic(1, .6)'
                        });
                    }
                });
                productObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.cat-section__grid').forEach(grid => {
        productObserver.observe(grid);
    });
    
    // Animations au survol
    document.querySelectorAll('.mi-card').forEach(card => {
        // Effet de survol 3D
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((centerY - y) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;
            
            anime({
                targets: card,
                rotateX: rotateX,
                rotateY: rotateY,
                scale: 1.02,
                boxShadow: `0 ${20 + Math.abs(rotateX)}px ${60 + Math.abs(rotateY)}px rgba(0,0,0,0.12)`,
                duration: 400,
                easing: 'easeOutCubic'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card,
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                duration: 600,
                easing: 'spring(1, 80, 15, 0)'
            });
        });
        
        // Animation du bouton "Ajouter au panier"
        const atcButton = card.querySelector('.mi-card__atc');
        if (atcButton) {
            atcButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Animation de succès
                const ripple = document.createElement('div');
                ripple.className = 'mi-card__ripple';
                card.appendChild(ripple);
                
                anime({
                    targets: ripple,
                    scale: [0, 2],
                    opacity: [0.8, 0],
                    duration: 600,
                    easing: 'easeOutCubic',
                    complete: () => ripple.remove()
                });
                
                // Effet de secousse
                anime({
                    targets: card,
                    translateX: [0, -10, 10, -5, 5, 0],
                    duration: 500,
                    easing: 'easeInOutSine'
                });
            });
        }
    });
}

/**
 * ─── ANIMATIONS DU SCROLL REVEAL ───
 * Révélation progressive des éléments au scroll
 */
function setupScrollRevealAnimations() {
    const revealElements = document.querySelectorAll('.cat-section, .promo-banner, .newsletter, .footer__main');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Animation différente selon le type d'élément
                if (entry.target.classList.contains('promo-banner')) {
                    anime({
                        targets: entry.target,
                        opacity: [0, 1],
                        scale: [0.95, 1],
                        duration: 800,
                        easing: 'easeOutCubic'
                    });
                    
                    // Animation des éléments internes
                    anime({
                        targets: entry.target.querySelectorAll('.promo-banner__title, .promo-banner__sub, .promo-banner__btn'),
                        opacity: [0, 1],
                        translateY: [20, 0],
                        duration: 600,
                        delay: anime.stagger(100),
                        easing: 'easeOutCubic'
                    });
                } else if (entry.target.classList.contains('newsletter')) {
                    anime({
                        targets: entry.target,
                        opacity: [0, 1],
                        translateY: [40, 0],
                        duration: 800,
                        easing: 'easeOutCubic'
                    });
                } else {
                    anime({
                        targets: entry.target,
                        opacity: [0, 1],
                        translateY: [50, 0],
                        duration: 800,
                        easing: 'easeOutCubic'
                    });
                }
                
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -100px 0px' });
    
    revealElements.forEach(el => revealObserver.observe(el));
}

/**
 * ─── ANIMATION DE LA BARRE DE CONFIANCE ───
 */
function setupTrustBarAnimation() {
    const trustObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const items = entry.target.querySelectorAll('.trust-bar__item');
                anime({
                    targets: items,
                    opacity: [0, 1],
                    translateX: [-30, 0],
                    duration: 600,
                    delay: anime.stagger(100),
                    easing: 'easeOutCubic',
                    begin: function(anim) {
                        // Animation des icônes
                        items.forEach(item => {
                            const icon = item.querySelector('svg');
                            if (icon) {
                                anime({
                                    targets: icon,
                                    rotate: [-15, 0],
                                    scale: [0, 1.2, 1],
                                    duration: 800,
                                    easing: 'spring(1, 80, 10, 0)'
                                });
                            }
                        });
                    }
                });
                trustObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    const trustBar = document.querySelector('.trust-bar__inner');
    if (trustBar) trustObserver.observe(trustBar);
}

/**
 * ─── ANIMATION DU MEGA MENU ───
 */
function setupMegaMenuAnimation() {
    const megaToggle = document.getElementById('megaToggle');
    const megaDropdown = document.getElementById('megaDropdown');
    const megaOverlay = document.getElementById('megaOverlay');
    
    if (!megaToggle || !megaDropdown || !megaOverlay) return;
    
    let isOpen = false;
    
    megaToggle.addEventListener('click', () => {
        isOpen = !isOpen;
        
        if (isOpen) {
            megaDropdown.classList.add('is-open');
            megaOverlay.classList.add('is-open');
            
            // Animation d'ouverture
            anime({
                targets: megaDropdown,
                opacity: [0, 1],
                translateY: [-20, 0],
                duration: 400,
                easing: 'easeOutCubic'
            });
            
            // Animation des cartes du menu
            anime({
                targets: '.mega__card',
                opacity: [0, 1],
                translateY: [20, 0],
                scale: [0.95, 1],
                delay: anime.stagger(50),
                duration: 400,
                easing: 'easeOutCubic'
            });
        } else {
            anime({
                targets: megaDropdown,
                opacity: [1, 0],
                translateY: [0, -20],
                duration: 300,
                easing: 'easeInCubic',
                complete: () => {
                    megaDropdown.classList.remove('is-open');
                    megaOverlay.classList.remove('is-open');
                }
            });
        }
    });
    
    megaOverlay.addEventListener('click', () => {
        if (isOpen) megaToggle.click();
    });
    
    // Animation de survol des liens
    document.querySelectorAll('.mega__link').forEach(link => {
        link.addEventListener('mouseenter', () => {
            anime({
                targets: link,
                scale: 1.05,
                color: '#1D1D1F',
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
        
        link.addEventListener('mouseleave', () => {
            anime({
                targets: link,
                scale: 1,
                color: '#6E6E73',
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
    });
}

/**
 * ─── ANIMATION DU PANIER ───
 * Micro-interactions lors de l'ajout au panier
 */
function setupCartAnimation() {
    const cartIcon = document.querySelector('.navbar__cart');
    const cartCount = document.getElementById('cartCount');
    
    if (!cartIcon || !cartCount) return;
    
    // Écouter les clics sur les boutons d'ajout au panier
    document.addEventListener('click', (e) => {
        if (e.target.closest('.mi-card__atc')) {
            // Animation du compteur
            anime({
                targets: cartCount,
                scale: [1, 1.4, 1],
                duration: 400,
                easing: 'easeOutCubic'
            });
            
            // Animation de l'icône
            anime({
                targets: cartIcon,
                rotate: [0, -15, 15, -5, 5, 0],
                duration: 600,
                easing: 'easeInOutSine'
            });
        }
    });
}

/**
 * ─── COMPTE À REBOURS PROMO ───
 */
function setupPromoCountdown() {
    const timerElement = document.querySelector('.flash-deals__timer');
    if (!timerElement) return;
    
    function updateTimer() {
        // Logique du compte à rebours
        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        
        const diff = end - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const digits = [
            Math.floor(hours / 10), hours % 10,
            Math.floor(minutes / 10), minutes % 10,
            Math.floor(seconds / 10), seconds % 10
        ];
        
        const digitElements = timerElement.querySelectorAll('.flash-deals__digit');
        if (digitElements.length === 6) {
            digits.forEach((digit, index) => {
                if (parseInt(digitElements[index].textContent) !== digit) {
                    anime({
                        targets: digitElements[index],
                        rotateX: [0, 90, 0],
                        duration: 400,
                        easing: 'easeInCubic',
                        complete: () => {
                            digitElements[index].textContent = digit;
                            anime({
                                targets: digitElements[index],
                                rotateX: [-90, 0],
                                duration: 400,
                                easing: 'easeOutCubic'
                            });
                        }
                    });
                }
            });
        }
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

/**
 * ─── DÉFILEMENT FLUIDE ───
 */
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                
                const offset = 100;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                anime({
                    targets: document.documentElement,
                    scrollTop: targetPosition,
                    duration: 800,
                    easing: 'easeInOutCubic'
                });
            }
        });
    });
}

/**
 * ─── EFFET DE CURSEUR PERSONNALISÉ ───
 */
document.addEventListener('mousemove', (e) => {
    let cursor = document.querySelector('.custom-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);
    }
    
    anime({
        targets: cursor,
        left: e.clientX,
        top: e.clientY,
        duration: 800,
        easing: 'easeOutCubic'
    });
});

// Changement de curseur sur les éléments interactifs
document.querySelectorAll('a, button, .mi-card, .cat-tile').forEach(el => {
    el.addEventListener('mouseenter', () => {
        anime({
            targets: '.custom-cursor',
            scale: 1.5,
            duration: 300
        });
    });
    
    el.addEventListener('mouseleave', () => {
        anime({
            targets: '.custom-cursor',
            scale: 1,
            duration: 300
        });
    });
});