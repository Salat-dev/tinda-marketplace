// Données FAQ
        const faqData = [
            { category: 'commandes', question: 'Comment passer une commande ?', answer: 'Parcourez notre catalogue, ajoutez les produits souhaités au panier, puis cliquez sur "Passer commande". Remplissez vos informations de livraison et validez. Le vendeur vous contactera pour confirmer.' },
            { category: 'commandes', question: 'Puis-je modifier ou annuler ma commande ?', answer: 'Oui, vous pouvez modifier ou annuler votre commande tant que le vendeur ne l\'a pas encore acceptée. Contactez le vendeur directement via WhatsApp.' },
            { category: 'commandes', question: 'Comment suivre ma commande ?', answer: 'Le vendeur vous tiendra informé de l\'avancement de votre commande via WhatsApp. Vous pouvez également le contacter à tout moment.' },
            { category: 'livraison', question: 'Quels sont les délais de livraison ?', answer: 'Les délais varient entre 2 et 5 jours ouvrés selon votre localisation et le vendeur. La livraison est gratuite à partir de 25 000 FCFA.' },
            { category: 'livraison', question: 'Livrez-vous partout au Cameroun ?', answer: 'Oui, nous livrons dans toutes les grandes villes du Cameroun : Douala, Yaoundé, Bafoussam, Garoua, Maroua, etc.' },
            { category: 'livraison', question: 'Les frais de livraison sont-ils offerts ?', answer: 'La livraison est gratuite pour toute commande supérieure à 25 000 FCFA. En dessous, les frais sont calculés selon votre localisation.' },
            { category: 'paiement', question: 'Quels modes de paiement acceptez-vous ?', answer: 'Nous acceptons le paiement à la livraison (cash), MTN Mobile Money et Orange Money.' },
            { category: 'paiement', question: 'Le paiement en ligne est-il sécurisé ?', answer: 'Oui, toutes les transactions sont cryptées et sécurisées. Nous ne stockons jamais vos informations bancaires.' },
            { category: 'retours', question: 'Quelle est la politique de retour ?', answer: 'Vous disposez de 30 jours après réception pour retourner un produit qui ne correspond pas à sa description. Contactez le vendeur pour organiser le retour.' },
            { category: 'retours', question: 'Comment obtenir un remboursement ?', answer: 'Le remboursement est effectué sous 7 jours ouvrés après réception et vérification du produit retourné.' },
            { category: 'vendeurs', question: 'Comment devenir vendeur sur Tindamba ?', answer: 'Cliquez sur "Espace vendeur" dans le menu, puis sur "Inscription". Remplissez le formulaire avec le nom de votre boutique, votre email et votre numéro WhatsApp.' },
            { category: 'vendeurs', question: 'Y a-t-il des frais pour vendre sur Tindamba ?', answer: 'Non, l\'inscription et la publication de produits sont entièrement gratuites. Nous prélevons 0% de commission sur vos ventes.' },
            { category: 'vendeurs', question: 'Comment gérer mes produits ?', answer: 'Connectez-vous à votre dashboard vendeur. Vous pourrez ajouter, modifier ou supprimer vos produits, gérer vos commandes et suivre vos ventes.' }
        ];

        let activeCategory = 'all';

        function renderFAQ(filter = 'all', searchQuery = '') {
            const container = document.getElementById('faqContent');
            let filteredData = faqData;

            // Filtrer par catégorie
            if (filter !== 'all') {
                filteredData = filteredData.filter(item => item.category === filter);
            }

            // Filtrer par recherche
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filteredData = filteredData.filter(item =>
                    item.question.toLowerCase().includes(q) ||
                    item.answer.toLowerCase().includes(q)
                );
            }

            // Grouper par catégorie
            const grouped = {};
            filteredData.forEach(item => {
                if (!grouped[item.category]) grouped[item.category] = [];
                grouped[item.category].push(item);
            });

            const categoryLabels = {
                'commandes': 'Commandes',
                'livraison': 'Livraison',
                'paiement': 'Paiement',
                'retours': 'Retours & Remboursements',
                'vendeurs': 'Vendeurs'
            };

            if (Object.keys(grouped).length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:60px 20px;">
                        <p style="font-size:18px; color:var(--color-text-secondary);">Aucune question trouvée</p>
                        <p style="font-size:14px; color:var(--color-text-tertiary); margin-top:8px;">Essayez avec d'autres mots-clés</p>
                    </div>`;
                return;
            }

            container.innerHTML = Object.entries(grouped).map(([category, items]) => `
                <div class="faq-section">
                    <h2 class="faq-section__title">${categoryLabels[category] || category}</h2>
                    <div class="faq-list">
                        ${items.map((item, index) => `
                            <div class="faq-item" data-category="${category}" data-index="${index}">
                                <button class="faq-item__question" onclick="toggleFAQ(this)">
                                    <span>${item.question}</span>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                </button>
                                <div class="faq-item__answer">
                                    <div class="faq-item__answer-inner">${item.answer}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        window.toggleFAQ = function(btn) {
            const item = btn.closest('.faq-item');
            const wasOpen = item.classList.contains('is-open');

            // Fermer tous les autres
            document.querySelectorAll('.faq-item.is-open').forEach(el => el.classList.remove('is-open'));

            // Ouvrir celui-ci s'il était fermé
            if (!wasOpen) {
                item.classList.add('is-open');
            }
        };

        // Recherche
        document.getElementById('faqSearch').addEventListener('input', function() {
            renderFAQ(activeCategory, this.value);
        });

        // Filtres par catégorie
        document.querySelectorAll('.faq-category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.faq-category-btn').forEach(b => b.classList.remove('is-active'));
                this.classList.add('is-active');
                activeCategory = this.dataset.category;
                document.getElementById('faqSearch').value = '';
                renderFAQ(activeCategory, '');
            });
        });

        // Panier
        document.getElementById('cartCount').textContent = (() => {
            try { return JSON.parse(localStorage.getItem('tindamba_cart') || '[]').reduce((s, i) => s + i.qty, 0); }
            catch { return 0; }
        })();

        // Rendu initial
        renderFAQ();