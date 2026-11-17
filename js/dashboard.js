/* =============================================================
   dashboard.js — Mayi
   Gestion vendeur : commandes · produits · catégories
============================================================= */

// Configuration Supabase (à remplacer par vos clés)
const SUPABASE_URL = 'https://uytrjgtrpsbegifudosi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dHJqZ3RycHNiZWdpZnVkb3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTQ3NTMsImV4cCI6MjA5MjA5MDc1M30.OevDrvPjdRRzxmMHs-ye-67DEEi6Jcdn_p6NeUbKx7E';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let currentVendor = null;
let realtimeChannel = null;
let orderFilter = 'all';
let allCategories = [];
let allOrders = [];
let uploadedImages = [];
let productColors = [];

const MAX_IMAGES = 5;
const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%236E6E73" stroke-width="1"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="2.5"%3E%3C/circle%3E%3Cpath d="m21 15-5-4-3 3-4-4-5 5"%3E%3C/path%3E%3C/svg%3E';

/* ─────────── UTILITIES ─────────── */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatXAF(amount) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(amount);
}

function showLoader(container) {
    if (container) container.innerHTML = '<div style="padding: 40px; text-align: center;">Chargement...</div>';
}

function showError(container, error) {
    if (container) container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--color-danger);">Erreur: ${error.message}</div>`;
}

function showEmpty(container, message) {
    if (container) container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--color-text-tertiary);">${message}</div>`;
}

function toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function badgeLabel(badge) {
    const labels = {
        new: 'Nouveau',
        bestseller: 'Top vente',
        featured: 'Vedette',
        promo: 'Promo',
        limited: 'Limité',
        unlimited: 'Illimité',
        out_of_stock: 'Rupture'
    };
    return labels[badge] || badge;
}

/* ─────────── AUTH GUARD ─────────── */
(async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return (location.href = 'login.html');

    document.getElementById('userEmail').textContent = session.user.email;

    const { data: vendor, error } = await sb
        .from('vendors')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

    if (error || !vendor) {
        toast('Aucune boutique associée à ce compte.', 'error');
        return;
    }
    currentVendor = vendor;

    await Promise.all([loadOrders(), loadProducts(), loadCategories()]);
    subscribeToOrders();
})();

/* Nettoyage Realtime */
window.addEventListener('beforeunload', () => {
    if (realtimeChannel) sb.removeChannel(realtimeChannel);
});

/* ─────────── NAV SIDEBAR ─────────── */
const views = ['orders', 'products', 'categories'];

document.querySelectorAll('.dash__side button[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.dash__side button[data-view]')
            .forEach((b) => b.classList.toggle('is-active', b === btn));
        views.forEach((v) => {
            const el = document.getElementById(`view-${v}`);
            if (el) el.hidden = v !== btn.dataset.view;
        });
    });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (realtimeChannel) sb.removeChannel(realtimeChannel);
    await sb.auth.signOut();
    location.href = 'login.html';
});

/* ══════════════════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════════════════ */
const ordersList = document.getElementById('ordersList');

document.querySelectorAll('[data-filter]').forEach((t) => {
    t.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]')
            .forEach((x) => x.classList.toggle('is-active', x === t));
        orderFilter = t.dataset.filter;
        renderOrders();
    });
});

async function loadOrders() {
    showLoader(ordersList);
    const { data, error } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .eq('vendor_id', currentVendor.id)
        .order('created_at', { ascending: false });

    if (error) return showError(ordersList, error);
    allOrders = data || [];
    renderOrders();
}

function renderOrders() {
    const filtered = orderFilter === 'all'
        ? allOrders
        : allOrders.filter((o) => o.status === orderFilter);

    if (!filtered.length) {
        return showEmpty(ordersList, 'Aucune commande dans cette catégorie.');
    }

    const statusLabel = { pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée' };

    ordersList.innerHTML = filtered.map((o) => `
        <div class="card" data-order-id="${o.id}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
                <div>
                    <div style="font-weight:700;font-family:monospace;font-size:15px">${escapeHTML(o.order_number)}</div>
                    <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">${new Date(o.created_at).toLocaleString('fr-FR')}</div>
                </div>
                <span class="pill pill--${o.status}">${statusLabel[o.status] || o.status}</span>
            </div>

            <div style="margin:14px 0;padding:12px 14px;background:var(--color-bg-secondary);border-radius:8px">
                <div style="font-weight:600">${escapeHTML(o.customer_name)}</div>
                <div style="font-size:13px;color:var(--color-text-tertiary);margin-top:3px">
                    ${escapeHTML(o.customer_phone)} · ${escapeHTML(o.customer_address)}${o.customer_city ? ', ' + escapeHTML(o.customer_city) : ''}
                </div>
                ${o.notes ? `<div style="font-size:13px;color:var(--color-text-tertiary);margin-top:6px">« ${escapeHTML(o.notes)} »</div>` : ''}
            </div>

            <table class="table" style="margin-bottom:12px">
                <tbody>
                    ${(o.order_items || []).map((i) => `
                        <tr>
                            <td>${escapeHTML(i.name)}</td>
                            <td style="text-align:center;color:var(--color-text-tertiary)">× ${i.quantity}</td>
                            <td style="text-align:right;font-weight:600">${formatXAF(i.subtotal)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight:800;font-size:15px">
                        <td colspan="2">Total</td>
                        <td style="text-align:right;color:var(--color-accent)">${formatXAF(o.total)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                ${o.status === 'pending' ? `
                    <button class="btn btn--primary btn--sm" data-accept="${o.id}">✓ Accepter</button>
                    <button class="btn btn--danger btn--sm" data-reject="${o.id}">✕ Refuser</button>
                ` : ''}
                <a href="https://wa.me/${escapeHTML(o.customer_phone.replace(/\D/g, ''))}" target="_blank" class="btn btn--whatsapp btn--sm">WhatsApp</a>
                ${o.status === 'accepted' ? `
                    <button class="btn btn--invoice btn--sm" data-invoice="${o.id}">🧾 Facture</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

ordersList.addEventListener('click', async (e) => {
    const accept = e.target.closest('[data-accept]');
    const reject = e.target.closest('[data-reject]');
    const invoice = e.target.closest('[data-invoice]');
    
    if (invoice) {
        e.preventDefault();
        await generateInvoice(invoice.dataset.invoice);
        return;
    }
    
    if (!accept && !reject) return;

    const btn = accept || reject;
    const id = btn.dataset.accept || btn.dataset.reject;
    const status = accept ? 'accepted' : 'rejected';

    btn.disabled = true;
    const { error } = await sb.from('orders').update({ status }).eq('id', id);
    if (error) {
        btn.disabled = false;
        return toast(error.message, 'error');
    }
    toast(`Commande ${status === 'accepted' ? 'acceptée' : 'refusée'}`, 'success');
    await loadOrders();
});

/* Realtime */
function subscribeToOrders() {
    realtimeChannel = sb
        .channel('orders-vendor-' + currentVendor.id)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${currentVendor.id}` },
            (payload) => {
                if (payload.eventType === 'INSERT') toast('🎉 Nouvelle commande reçue !', 'success');
                loadOrders();
            })
        .subscribe();
}

/* ══════════════════════════════════════════════════════════════════
   INVOICE GENERATION
══════════════════════════════════════════════════════════════════ */

// Convertir un nombre en lettres (français)
function numberToWordsFrench(n) {
    if (n === 0) return 'Zéro';
    
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    
    function convertHundreds(num) {
        if (num === 0) return '';
        if (num < 20) return units[num];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            if (ten === 7) return 'soixante-' + units[10 + unit];
            if (ten === 8) return 'quatre-vingt' + (unit > 0 ? '-' + units[unit] : 's');
            if (ten === 9) return 'quatre-vingt-' + units[10 + unit];
            if (unit === 1 && ten !== 8) return tens[ten] + ' et un';
            return tens[ten] + (unit > 0 ? '-' + units[unit] : '');
        }
        const hundred = Math.floor(num / 100);
        const rest = num % 100;
        let result = hundred === 1 ? 'cent' : units[hundred] + ' cent';
        if (rest > 0) result += ' ' + convertHundreds(rest);
        return result;
    }
    
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = '';
    
    if (thousands > 0) {
        if (thousands === 1) {
            result = 'mille';
        } else {
            result = convertHundreds(thousands) + ' mille';
        }
        if (remainder > 0) result += ' ';
    }
    
    if (remainder > 0) {
        result += convertHundreds(remainder);
    }
    
    return result.trim() + ' Francs CFA';
}

/* ══════════════════════════════════════════════════════════════════
   RECU DE PAIEMENT - Version professionnelle (2 A5 sur A4 portrait)
   - Orientation: Portrait
   - Calcul du prix unitaire automatique et robuste
══════════════════════════════════════════════════════════════════ */

// Convertir un nombre en lettres (français)
function numberToWordsFrench(n) {
    if (n === 0) return 'Zero';
    if (isNaN(n) || n === null) return 'Zero';
    
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    
    function convertHundreds(num) {
        if (num === 0) return '';
        if (num < 20) return units[num];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            if (ten === 7) return 'soixante-' + units[10 + unit];
            if (ten === 8) return 'quatre-vingt' + (unit > 0 ? '-' + units[unit] : 's');
            if (ten === 9) return 'quatre-vingt-' + units[10 + unit];
            if (unit === 1 && ten !== 8) return tens[ten] + ' et un';
            return tens[ten] + (unit > 0 ? '-' + units[unit] : '');
        }
        const hundred = Math.floor(num / 100);
        const rest = num % 100;
        let result = hundred === 1 ? 'cent' : units[hundred] + ' cent';
        if (rest > 0) result += ' ' + convertHundreds(rest);
        return result;
    }
    
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = '';
    
    if (thousands > 0) {
        if (thousands === 1) {
            result = 'mille';
        } else {
            result = convertHundreds(thousands) + ' mille';
        }
        if (remainder > 0) result += ' ';
    }
    
    if (remainder > 0) {
        result += convertHundreds(remainder);
    }
    
    return result.trim().toUpperCase() + ' FRANCS CFA';
}

// Generer le recu de paiement
async function generateInvoice(orderId) {
    console.log('Generation recu pour commande:', orderId);
    
    // Recuperer la commande complete
    let order = allOrders.find(o => o.id === orderId);
    if (!order) {
        const { data, error } = await sb
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();
        
        if (error || !data) {
            toast('Commande introuvable', 'error');
            return;
        }
        order = data;
    }
    
    // S'assurer que order_items existe
    if (!order.order_items || order.order_items.length === 0) {
        const { data, error } = await sb
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);
        
        if (error) {
            toast('Erreur chargement des produits', 'error');
            return;
        }
        order.order_items = data || [];
    }
    
    // Ouvrir la fenetre d'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        toast('Veuillez autoriser les popups pour imprimer', 'error');
        return;
    }
    
    // Formatage des prix
    const formatPrice = (p) => {
        if (isNaN(p) || p === null || p === undefined) return '0';
        return new Intl.NumberFormat('fr-FR').format(Math.round(p));
    };
    
    // Calcul du prix unitaire pour chaque produit avec gestion des erreurs
    const processedItems = order.order_items.map(item => {
        // Recuperer la quantite
        const quantity = parseInt(item.quantity) || 1;
        
        // Recuperer le subtotal
        let subtotal = parseFloat(item.subtotal);
        if (isNaN(subtotal) || subtotal === 0) {
            // Si pas de subtotal, essayer de calculer avec price * quantity
            const price = parseFloat(item.price);
            if (!isNaN(price) && price > 0) {
                subtotal = price * quantity;
            } else {
                subtotal = 0;
            }
        }
        
        // Calculer le prix unitaire
        let unitPrice = 0;
        if (quantity > 0 && subtotal > 0) {
            unitPrice = subtotal / quantity;
        } else {
            // Fallback: utiliser le prix stocke
            unitPrice = parseFloat(item.price) || 0;
        }
        
        // Arrondir a l'entier le plus proche
        unitPrice = Math.round(unitPrice);
        subtotal = Math.round(subtotal);
        
        console.log(`Produit: ${item.name}, Qte: ${quantity}, Subtotal: ${subtotal}, PU: ${unitPrice}`);
        
        return {
            id: item.id,
            name: item.name || 'Produit',
            quantity: quantity,
            subtotal: subtotal,
            unit_price: unitPrice
        };
    });
    
    // Generer les lignes du tableau
    let itemsRows = '';
    if (processedItems.length === 0) {
        itemsRows = `
            <tr>
                <td colspan="5" style="text-align:center; padding:8mm;">Aucun produit</td>
            </tr>
        `;
    } else {
        processedItems.forEach((item, index) => {
            itemsRows += `
                <tr>
                    <td class="col-number">${index + 1}</td>
                    <td class="col-designation">${escapeHTML(item.name)}</td>
                    <td class="col-qty">${item.quantity}</td>
                    <td class="col-price">${formatPrice(item.unit_price)}</td>
                    <td class="col-total">${formatPrice(item.subtotal)}</td>
                </tr>
            `;
        });
    }
    
    // Calcul des totaux
    const subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = order.total || subtotal;
    const orderNumber = order.order_number || `CMD-${order.id.slice(0, 8).toUpperCase()}`;
    const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const orderTime = new Date(order.created_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit'
    });
    
    const vendorName = currentVendor?.name || 'MAYI MARKETPLACE';
    const vendorNif = currentVendor?.nif || '---------';
    const vendorRccm = currentVendor?.rccm || '---------';
    
    // Generation du HTML
    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RECU ${orderNumber}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', 'Lucida Sans Typewriter', monospace;
            font-size: 9pt;
            line-height: 1.25;
            background: #fff;
            color: #000;
        }
        
        .receipt-container {
            display: flex;
            flex-direction: column;
            width: 210mm;
            min-height: 297mm;
            background: white;
        }
        
        .receipt {
            width: 210mm;
            height: 148mm;
            padding: 5mm 6mm;
            background: white;
            position: relative;
            page-break-inside: avoid;
            overflow: hidden;
            border-bottom: 0.5px solid #ccc;
        }
        
        .cut-line {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 1px;
            background: repeating-linear-gradient(90deg, #000, #000 3mm, transparent 3mm, transparent 6mm);
            z-index: 10;
        }
        
        .cut-mark-left {
            position: absolute;
            bottom: -2mm;
            left: -2mm;
            width: 5mm;
            height: 5mm;
            border-left: 0.5px solid #000;
            border-bottom: 0.5px solid #000;
        }
        
        .cut-mark-right {
            position: absolute;
            bottom: -2mm;
            right: -2mm;
            width: 5mm;
            height: 5mm;
            border-right: 0.5px solid #000;
            border-bottom: 0.5px solid #000;
        }
        
        .header {
            text-align: center;
            mption.value = p.description;
        productForm.price.value = p.price;
        productForm.old_price.value = p.old_price || '';
        productForm.stock.value = p.stock;
        document.getElementById('activeToggle').checked = !!p.active;

        const sel = document.getElementById('categoriesSelect');
        if (sel) sel.value = p.categories_id || '';
    } else {
        document.getElementById('activeToggle').checked = true;
    }

    setBadgeChip(p?.badge || '');

    uploadedImages = [];
    if (p) {
        const imgs = Array.isArray(p.images) && p.images.length ? p.images : (p.image_url ? [p.image_url] : []);
        imgs.forEach((url) => uploadedImages.push({ url, isExternal: true }));
    }
    renderImagePreviews();

    productColors = Array.isArray(p?.colors) ? [...p.colors] : [];
    renderColorTags();

    productFormWrap.style.display = 'block';
    productFormWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeProductModal() {
    productFormWrap.style.display = 'none';
    uploadedImages = [];
    productColors = [];
    productForm.reset();
}

/* Products list events */
productsList.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');

    if (edit) {
        try {
            const p = JSON.parse(edit.dataset.edit);
            openProductModal(p);
        } catch (err) {
            console.error('Erreur parsing produit:', err);
            toast('Impossible de charger ce produit', 'error');
        }
    }
    if (del) {
        if (!confirm('Supprimer ce produit ?')) return;

        const { error: orderItemsError } = await sb.from('order_items').delete().eq('product_id', del.dataset.del);
        if (orderItemsError) return toast(orderItemsError.message, 'error');

        const { data: prod } = await sb.from('products').select('images, image_url').eq('id', del.dataset.del).maybeSingle();

        const { error } = await sb.from('products').delete().eq('id', del.dataset.del);
        if (error) return toast(error.message, 'error');

        toast('Produit supprimé', 'success');
        loadProducts();
    }
});

/* Submit product form */
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enregistrement…';

    try {
        const fd = new FormData(productForm);
        const imageUrls = uploadedImages.map((i) => i.url).filter(Boolean);

        if (!imageUrls.length) {
            toast('Ajoutez au moins une image', 'error');
            return;
        }

        const name = (fd.get('name') || '').trim();
        const description = (fd.get('description') || '').trim();
        const price = parseInt(fd.get('price'), 10);
        const stock = parseInt(fd.get('stock'), 10);

        if (!name || !description || isNaN(price) || isNaN(stock)) {
            toast('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        const payload = {
            vendor_id: currentVendor.id,
            name,
            description,
            price,
            old_price: fd.get('old_price') ? parseInt(fd.get('old_price'), 10) : null,
            stock,
            active: document.getElementById('activeToggle').checked,
            categories_id: fd.get('categories_id') || null,
            badge: fd.get('badge') || null,
            image_url: imageUrls[0],
            images: imageUrls,
            colors: productColors,
        };

        const id = fd.get('id');
        const { error } = id
            ? await sb.from('products').update(payload).eq('id', id)
            : await sb.from('products').insert(payload);

        if (error) {
            console.error('Erreur Supabase:', error);
            toast(error.message || 'Erreur lors de l\'enregistrement', 'error');
            return;
        }

        toast(id ? 'Produit modifié ✓' : 'Produit ajouté ✓', 'success');
        closeProductModal();
        await loadProducts();
    } catch (err) {
        console.error('Erreur produit:', err);
        toast(err.message || 'Erreur inattendue', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
});

/* ══════════════════════════════════════════════════════════════════
   BADGE CHIPS
══════════════════════════════════════════════════════════════════ */
function setBadgeChip(value) {
    document.querySelectorAll('.badge-chip').forEach((chip) => {
        const input = chip.querySelector('input[type="radio"]');
        if (!input) return;
        input.checked = input.value === value;
    });
}

document.querySelectorAll('.badge-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
        const input = chip.querySelector('input[type="radio"]');
        if (input) setBadgeChip(input.value);
    });
});

/* ══════════════════════════════════════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════════════════════════════════════ */
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewsEl = document.getElementById('imagePreviews');
const progressWrap = document.getElementById('uploadProgress');
const progressBar = document.getElementById('uploadProgressBar');

uploadZone?.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') return;
    fileInput.click();
});

uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('is-drag-over');
});
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('is-drag-over'));
uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('is-drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
});

fileInput?.addEventListener('change', () => {
    handleFiles(Array.from(fileInput.files));
    fileInput.value = '';
});

async function handleFiles(files) {
    const remaining = MAX_IMAGES - uploadedImages.length;
    if (remaining <= 0) {
        toast(`Maximum ${MAX_IMAGES} images atteint`, 'error');
        return;
    }

    const toProcess = files.slice(0, remaining);

    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';

    for (let i = 0; i < toProcess.length; i++) {
        const file = toProcess[i];
        try {
            progressBar.style.width = `${Math.round(((i + 0.3) / toProcess.length) * 100)}%`;
            // Pour cet exemple, on simule l'upload
            const url = URL.createObjectURL(file);
            uploadedImages.push({ url });
            renderImagePreviews();
            progressBar.style.width = `${Math.round(((i + 1) / toProcess.length) * 100)}%`;
        } catch (err) {
            console.error('Upload error:', err);
            toast(`Erreur upload ${file.name} : ${err.message}`, 'error');
        }
    }

    setTimeout(() => { progressWrap.style.display = 'none'; }, 600);
}

function renderImagePreviews() {
    if (!previewsEl) return;
    previewsEl.innerHTML = uploadedImages.map((img, idx) => `
        <div class="image-preview ${idx === 0 ? 'image-preview--primary' : ''}">
            <img src="${escapeHTML(img.url)}" alt="Image ${idx + 1}" onerror="this.style.opacity='.3'">
            <button type="button" class="image-preview__del" data-imgidx="${idx}" title="Supprimer">×</button>
        </div>
    `).join('');
}

previewsEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-imgidx]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.imgidx, 10);
    uploadedImages.splice(idx, 1);
    renderImagePreviews();
});

/* ══════════════════════════════════════════════════════════════════
   COLOR MANAGEMENT
══════════════════════════════════════════════════════════════════ */
const colorPicker = document.getElementById('colorPicker');
const colorName = document.getElementById('colorName');
const addColorBtn = document.getElementById('addColorBtn');
const colorTags = document.getElementById('colorTags');

addColorBtn?.addEventListener('click', () => {
    const hex = colorPicker.value;
    const name = colorName.value.trim() || hex;
    if (productColors.some((c) => c.hex === hex)) {
        toast('Cette couleur est déjà ajoutée', 'error');
        return;
    }
    productColors.push({ hex, name });
    colorName.value = '';
    renderColorTags();
});

colorName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addColorBtn.click(); }
});

function renderColorTags() {
    if (!colorTags) return;
    colorTags.innerHTML = productColors.map((c, i) => `
        <div class="color-tag">
            <span class="color-tag__swatch" style="background:${escapeHTML(c.hex)}"></span>
            <span>${escapeHTML(c.name)}</span>
            <span class="color-tag__remove" data-coloridx="${i}" title="Retirer">×</span>
        </div>
    `).join('');
}

colorTags?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-coloridx]');
    if (!btn) return;
    productColors.splice(parseInt(btn.dataset.coloridx, 10), 1);
    renderColorTags();
});

// Styles additionnels pour le bouton facture
const style = document.createElement('style');
style.textContent = `
    .btn--invoice {
        background: #2e7d32;
        color: white;
        border: none;
    }
    .btn--invoice:hover {
        background: #1b5e20;
    }
`;
document.head.appendChild(style);
