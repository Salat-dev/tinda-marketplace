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
            margin-bottom: 2mm;
            padding-bottom: 1.5mm;
            border-bottom: 1.5px solid #000;
        }
        
        .logo {
            font-size: 13pt;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 0.5mm;
        }
        
        .shop-name {
            font-size: 8.5pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 0.3mm;
        }
        
        .shop-details {
            font-size: 6pt;
            letter-spacing: 0.3px;
        }
        
        .doc-type {
            text-align: center;
            margin: 1.5mm 0;
        }
        
        .doc-type div {
            display: inline-block;
            font-weight: bold;
            font-size: 9pt;
            letter-spacing: 2px;
            border: 0.8px solid #000;
            padding: 1mm 5mm;
            background: #f0f0f0;
        }
        
        .payment-box {
            margin: 2mm 0;
            padding: 1.5mm;
            background: #e8f0e8;
            border: 0.5px solid #2e7d32;
            text-align: center;
        }
        
        .payment-status {
            font-weight: bold;
            font-size: 9pt;
            color: #2e7d32;
        }
        
        .info-table {
            width: 100%;
            margin-bottom: 2mm;
            border-collapse: collapse;
            font-size: 7.5pt;
        }
        
        .info-table td {
            padding: 0.8mm 0;
            vertical-align: top;
        }
        
        .info-label {
            font-weight: bold;
            width: 35%;
        }
        
        .info-value {
            width: 65%;
        }
        
        .client-box {
            margin: 2mm 0;
            padding: 1.5mm;
            border: 0.5px solid #000;
            background: #fafafa;
        }
        
        .client-title {
            font-weight: bold;
            margin-bottom: 1mm;
            text-transform: uppercase;
            font-size: 7pt;
        }
        
        .client-line {
            font-size: 7pt;
            margin-bottom: 0.3mm;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin: 2mm 0;
            font-size: 7pt;
        }
        
        .products-table th {
            background: #e0e0e0;
            padding: 1mm 0.5mm;
            text-align: left;
            border: 0.3px solid #000;
            font-weight: bold;
        }
        
        .products-table td {
            padding: 0.8mm 0.5mm;
            border: 0.3px solid #000;
        }
        
        .col-number { width: 8%; text-align: center; }
        .col-designation { width: 47%; }
        .col-qty { width: 10%; text-align: center; }
        .col-price { width: 15%; text-align: right; }
        .col-total { width: 20%; text-align: right; }
        
        .totals-table {
            width: 60%;
            margin-left: auto;
            border-collapse: collapse;
            margin-top: 1.5mm;
            margin-bottom: 1.5mm;
            font-size: 8pt;
        }
        
        .totals-table td {
            padding: 0.8mm;
        }
        
        .grand-total {
            background: #000;
            color: white;
            font-weight: bold;
        }
        
        .grand-total td {
            padding: 1.2mm;
        }
        
        .amount-words {
            margin: 2mm 0;
            padding: 1.5mm;
            border: 0.3px dashed #000;
            font-size: 6.5pt;
            font-style: italic;
        }
        
        .signature-section {
            margin: 3mm 0 2mm 0;
        }
        
        .signature-row {
            display: flex;
            justify-content: space-between;
            margin-top: 2mm;
        }
        
        .signature-box {
            width: 45%;
            text-align: center;
        }
        
        .signature-line {
            border-top: 0.3px solid #000;
            padding-top: 1.5mm;
            margin: 0 auto;
            width: 90%;
        }
        
        .signature-label {
            font-size: 6pt;
            margin-top: 0.5mm;
        }
        
        .footer {
            text-align: center;
            font-size: 5.5pt;
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 0.3px solid #ccc;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .receipt-container {
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            .receipt {
                page-break-inside: avoid;
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- PREMIER EXEMPLAIRE - ORIGINAL CLIENT -->
        <div class="receipt">
            <div class="cut-line"></div>
            <div class="cut-mark-left"></div>
            <div class="cut-mark-right"></div>
            
            <div class="header">
                <div class="logo">MAYI</div>
                <div class="shop-name">${escapeHTML(vendorName)}</div>
                <div class="shop-details">NIF: ${escapeHTML(vendorNif)} | RCCM: ${escapeHTML(vendorRccm)}</div>
            </div>
            
            <div class="doc-type">
                <div>RECU DE PAIEMENT</div>
            </div>
            
            <div class="payment-box">
                <div class="payment-status">PAIEMENT CONFIRME</div>
                <div style="font-size:7pt; margin-top:0.5mm;">Montant recu le ${orderDate} a ${orderTime}</div>
            </div>
            
            <table class="info-table">
                <tr>
                    <td class="info-label">N° COMMANDE :</td>
                    <td class="info-value">${orderNumber}</td>
                    <td class="info-label" style="width:25%">DATE :</td>
                    <td class="info-value" style="width:40%">${orderDate}</td>
                </tr>
            </table>
            
            <div class="client-box">
                <div class="client-title">CLIENT</div>
                <div class="client-line"><strong>Nom:</strong> ${escapeHTML(order.customer_name)}</div>
                <div class="client-line"><strong>Tel:</strong> ${escapeHTML(order.customer_phone)}</div>
                <div class="client-line"><strong>Adresse:</strong> ${escapeHTML(order.customer_address)}${order.customer_city ? ', ' + escapeHTML(order.customer_city) : ''}</div>
                ${order.notes ? `<div class="client-line"><strong>Notes:</strong> ${escapeHTML(order.notes)}</div>` : ''}
            </div>
            
            <table class="products-table">
                <thead>
                    <tr>
                        <th class="col-number">N</th>
                        <th class="col-designation">DESIGNATION</th>
                        <th class="col-qty">QTE</th>
                        <th class="col-price">P.U (FCFA)</th>
                        <th class="col-total">TOTAL (FCFA)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            
            <table class="totals-table">
                <tr>
                    <td style="width:60%; text-align:right;"><strong>SOUS-TOTAL :</strong></td>
                    <td style="width:40%; text-align:right;">${formatPrice(subtotal)} FCFA</td>
                </tr>
                <tr>
                    <td style="text-align:right;">TVA (0%) :</td>
                    <td style="text-align:right;">0 FCFA</td>
                </tr>
                <tr class="grand-total">
                    <td style="text-align:right;"><strong>TOTAL PAYE :</strong></td>
                    <td style="text-align:right;"><strong>${formatPrice(total)} FCFA</strong></td>
                </tr>
            </table>
            
            <div class="amount-words">
                Recu la somme de ${numberToWordsFrench(total)}
            </div>
            
            <div class="signature-section">
                <div class="signature-row">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Signature / Cachet</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Signature client</div>
                        <div class="signature-label" style="font-size:5pt;">(Bon pour reception)</div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <div>Support: 693 42 13 48 / 678 52 63 90 | www.mayi.cm</div>
                <div>Merci de votre confiance</div>
            </div>
        </div>
        
        <!-- DEUXIEME EXEMPLAIRE - DUPLICATA MAGASIN -->
        <div class="receipt">
            <div class="cut-line"></div>
            <div class="cut-mark-left"></div>
            <div class="cut-mark-right"></div>
            
            <div class="header">
                <div class="logo">MAYI</div>
                <div class="shop-name">${escapeHTML(vendorName)}</div>
            </div>
            
            <div class="doc-type">
                <div>DUPLICATA RECU</div>
            </div>
            
            <div class="payment-box">
                <div class="payment-status">PAIEMENT CONFIRME</div>
                <div style="font-size:7pt; margin-top:0.5mm;">Montant recu le ${orderDate}</div>
            </div>
            
            <table class="info-table">
                <tr>
                    <td class="info-label">N° COMMANDE :</td>
                    <td class="info-value">${orderNumber}</td>
                    <td class="info-label" style="width:25%">DATE :</td>
                    <td class="info-value" style="width:40%">${orderDate}</td>
                </tr>
            </table>
            
            <div class="client-box">
                <div class="client-title">CLIENT</div>
                <div class="client-line"><strong>Nom:</strong> ${escapeHTML(order.customer_name)}</div>
                <div class="client-line"><strong>Tel:</strong> ${escapeHTML(order.customer_phone)}</div>
                <div class="client-line"><strong>Adresse:</strong> ${escapeHTML(order.customer_address)}</div>
            </div>
            
            <table class="products-table">
                <thead>
                    <tr>
                        <th class="col-number">N</th>
                        <th class="col-designation">DESIGNATION</th>
                        <th class="col-qty">QTE</th>
                        <th class="col-price">P.U (FCFA)</th>
                        <th class="col-total">TOTAL (FCFA)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>
            
            <table class="totals-table">
                <tr class="grand-total">
                    <td style="width:60%; text-align:right;"><strong>TOTAL PAYE :</strong></td>
                    <td style="width:40%; text-align:right;"><strong>${formatPrice(total)} FCFA</strong></td>
                </tr>
            </table>
            
            <div class="signature-section">
                <div class="signature-row">
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Cachet magasin</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line"></div>
                        <div class="signature-label">Signature client</div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <div>Support: 693 42 13 48 / 678 52 63 90 | www.mayi.cm</div>
                <div>A conserver par le vendeur</div>
            </div>
        </div>
    </div>
</body>
</html>`;
    
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    
    printWindow.onload = function() {
        setTimeout(function() {
            printWindow.print();
        }, 500);
    };
    
    toast('Recu genere', 'success');
}

// Rendre la fonction accessible globalement
window.generateInvoice = generateInvoice;
/* ══════════════════════════════════════════════════════════════════
   CATEGORIES AVEC THUMBNAIL
══════════════════════════════════════════════════════════════════ */

const categoriesList = document.getElementById('categoriesList');

// Variables pour le thumbnail
let catThumbnailFile = null;
let isEditingCategory = false;
let editingCategoryId = null;

async function loadCategories() {
    const { data, error } = await sb
        .from('categories')
        .select('*')
        .eq('vendor_id', currentVendor.id)
        .order('position', { ascending: true, nullsFirst: false })
        .order('name');

    if (error) { 
        console.error(error); 
        return; 
    }
    allCategories = data || [];
    renderCategoriesSelect();
    renderCategoriesList();
}

function renderCategoriesSelect() {
    const sel = document.getElementById('categoriesSelect');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Sans categorie —</option>' +
        allCategories.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML((c.icon ? c.icon + ' ' : '') + c.name)}</option>`).join('');
    if (current) sel.value = current;
}

function renderCategoriesList() {
    if (!categoriesList) return;
    if (!allCategories.length) {
        showEmpty(categoriesList, 'Aucune categorie. Creez votre premiere categorie !');
        return;
    }
    
    categoriesList.innerHTML = `
        <div class="cat-list">
            ${allCategories.map((c) => `
                <div class="cat-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid var(--color-border); border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${c.thumbnail_url ? 
                            `<img src="${escapeHTML(c.thumbnail_url)}" style="width:45px; height:45px; object-fit:cover; border-radius:8px;" onerror="this.src='${IMG_FALLBACK}'">` :
                            `<div style="width:45px; height:45px; background:#f0f0f0; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px;">${c.icon || '📁'}</div>`
                        }
                        <div>
                            <div class="cat-item__name" style="font-weight:600;">${escapeHTML(c.name)}</div>
                            <div class="cat-item__slug" style="font-size:11px; color:var(--color-text-tertiary);">/categories/${escapeHTML(c.slug)}</div>
                        </div>
                    </div>
                    <div class="cat-item__actions" style="display:flex; gap:8px;">
                        <button class="btn btn--ghost btn--sm" data-editcat="${escapeHTML(c.id)}" data-editcat-name="${escapeHTML(c.name)}" data-editcat-icon="${escapeHTML(c.icon || '')}" data-editcat-thumb="${escapeHTML(c.thumbnail_url || '')}">Modifier</button>
                        <button class="btn btn--danger btn--sm" data-delcat="${escapeHTML(c.id)}">Supprimer</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Ajouter les event listeners pour les boutons modifier
    document.querySelectorAll('[data-editcat]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = btn.dataset.editcat;
            const name = btn.dataset.editcatName;
            const icon = btn.dataset.editcatIcon;
            const thumbUrl = btn.dataset.editcatThumb;
            
            openEditCategoryModal(id, name, icon, thumbUrl);
        });
    });
}

// Fonction pour uploader l'image d'une categorie
async function uploadCategoryThumbnail(file, categoryId) {
    if (!file) return null;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        toast('Format non supporte. Utilisez JPG, PNG ou WEBP', 'error');
        return null;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        toast('Image trop volumineuse. Maximum 2MB', 'error');
        return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${categoryId}-${Date.now()}.${fileExt}`;
    const filePath = `categories/${fileName}`;
    
    try {
        const { error } = await sb.storage
            .from('category-thumbnails')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });
        
        if (error) throw error;
        
        const { data: urlData } = sb.storage
            .from('category-thumbnails')
            .getPublicUrl(filePath);
        
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('Erreur upload:', error);
        toast('Erreur lors de l\'upload de l\'image', 'error');
        return null;
    }
}

// Fonction pour supprimer une thumbnail
async function deleteCategoryThumbnail(thumbnailUrl) {
    if (!thumbnailUrl) return;
    
    try {
        const urlParts = thumbnailUrl.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('category-thumbnails') + 1).join('/');
        
        if (filePath && filePath.includes('categories/')) {
            await sb.storage
                .from('category-thumbnails')
                .remove([filePath]);
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
    }
}

// Fonction pour creer une categorie
async function createCategoryWithThumbnail(name, icon, thumbnailFile) {
    name = (name || '').trim();
    if (!name) {
        toast('Donnez un nom a la categorie', 'error');
        return false;
    }

    const slug = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: newCategory, error: insertError } = await sb.from('categories').insert({
        vendor_id: currentVendor.id,
        name: name,
        slug: slug,
        icon: icon || null,
        thumbnail_url: null
    }).select().single();

    if (insertError) {
        toast(insertError.message, 'error');
        return false;
    }
    
    // Upload thumbnail si presente
    if (thumbnailFile) {
        const thumbnailUrl = await uploadCategoryThumbnail(thumbnailFile, newCategory.id);
        
        if (thumbnailUrl) {
            const { error: updateError } = await sb
                .from('categories')
                .update({ thumbnail_url: thumbnailUrl })
                .eq('id', newCategory.id);
            
            if (!updateError) {
                newCategory.thumbnail_url = thumbnailUrl;
            }
        }
    }
    
    toast(`Categorie "${name}" creee`, 'success');
    
    allCategories.push(newCategory);
    renderCategoriesSelect();
    renderCategoriesList();
    
    return true;
}

// Fonction pour mettre a jour une categorie
async function updateCategoryWithThumbnail(id, name, icon, thumbnailFile) {
    name = (name || '').trim();
    if (!name) {
        toast('Donnez un nom a la categorie', 'error');
        return false;
    }

    const slug = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const updates = {
        name: name,
        slug: slug,
        icon: icon || null
    };
    
    // Upload nouvelle thumbnail si presente
    if (thumbnailFile) {
        const oldCategory = allCategories.find(c => c.id === id);
        if (oldCategory?.thumbnail_url) {
            await deleteCategoryThumbnail(oldCategory.thumbnail_url);
        }
        
        const newThumbnailUrl = await uploadCategoryThumbnail(thumbnailFile, id);
        if (newThumbnailUrl) {
            updates.thumbnail_url = newThumbnailUrl;
        }
    }
    
    const { error } = await sb
        .from('categories')
        .update(updates)
        .eq('id', id);
    
    if (error) {
        toast(error.message, 'error');
        return false;
    }
    
    toast('Categorie mise a jour', 'success');
    await loadCategories();
    return true;
}

// Ouvrir le modal de creation
function openCreateCategoryModal() {
    isEditingCategory = false;
    editingCategoryId = null;
    catFormName.value = '';
    catFormIcon.value = '';
    catThumbnailFile = null;
    if (catThumbnailInput) catThumbnailInput.value = '';
    if (catThumbnailPreview) catThumbnailPreview.style.display = 'none';
    if (catFormWrap) catFormWrap.style.display = 'block';
    if (catFormName) catFormName.focus();
    if (document.getElementById('catModalTitle')) {
        document.getElementById('catModalTitle').textContent = 'Nouvelle categorie';
    }
}

// Ouvrir le modal de modification
function openEditCategoryModal(id, name, icon, thumbUrl) {
    isEditingCategory = true;
    editingCategoryId = id;
    catFormName.value = name;
    catFormIcon.value = icon || '';
    catThumbnailFile = null;
    
    if (thumbUrl && thumbUrl !== 'undefined' && thumbUrl !== '') {
        if (catThumbnailPreview) {
            catThumbnailPreview.style.display = 'flex';
            if (catThumbnailImg) catThumbnailImg.src = thumbUrl;
        }
    } else {
        if (catThumbnailPreview) catThumbnailPreview.style.display = 'none';
    }
    
    if (catThumbnailInput) catThumbnailInput.value = '';
    if (catFormWrap) catFormWrap.style.display = 'block';
    if (document.getElementById('catModalTitle')) {
        document.getElementById('catModalTitle').textContent = 'Modifier la categorie';
    }
}

// Sauvegarder la categorie (creation ou modification)
async function saveCategory() {
    const name = catFormName.value;
    const icon = catFormIcon.value;
    const thumbnail = catThumbnailFile;
    
    if (isEditingCategory && editingCategoryId) {
        await updateCategoryWithThumbnail(editingCategoryId, name, icon, thumbnail);
    } else {
        await createCategoryWithThumbnail(name, icon, thumbnail);
    }
    
    // Fermer le modal
    catFormWrap.style.display = 'none';
    catFormName.value = '';
    catFormIcon.value = '';
    catThumbnailFile = null;
    if (catThumbnailInput) catThumbnailInput.value = '';
    if (catThumbnailPreview) catThumbnailPreview.style.display = 'none';
}

// Supprimer une categorie
async function deleteCategory(categoryId) {
    if (!confirm('Supprimer cette categorie ? Les produits associes ne seront pas supprimer.')) return;
    
    const category = allCategories.find(c => c.id === categoryId);
    if (category?.thumbnail_url) {
        await deleteCategoryThumbnail(category.thumbnail_url);
    }
    
    const { error } = await sb.from('categories').delete().eq('id', categoryId);
    if (error) return toast(error.message, 'error');
    
    toast('Categorie supprimee', 'success');
    await loadCategories();
}

/* ─────────── INITIALISATION DES EVENT LISTENERS ─────────── */

// Bouton nouvelle categorie
const newCatBtnMain = document.getElementById('newCatBtnMain');
if (newCatBtnMain) {
    newCatBtnMain.addEventListener('click', openCreateCategoryModal);
}

// Bouton annuler
const catFormCancel = document.getElementById('catFormCancel');
if (catFormCancel) {
    catFormCancel.addEventListener('click', () => {
        catFormWrap.style.display = 'none';
        catFormName.value = '';
        catFormIcon.value = '';
        catThumbnailFile = null;
        if (catThumbnailInput) catThumbnailInput.value = '';
        if (catThumbnailPreview) catThumbnailPreview.style.display = 'none';
    });
}

// Bouton sauvegarder (LE PLUS IMPORTANT)
const catFormSave = document.getElementById('catFormSave');
if (catFormSave) {
    // Supprimer les anciens event listeners
    const newSaveBtn = catFormSave.cloneNode(true);
    catFormSave.parentNode.replaceChild(newSaveBtn, catFormSave);
    
    // Ajouter le nouvel event listener
    newSaveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Bouton sauvegarder clique');
        saveCategory();
    });
}

// Zone d'upload thumbnail
const catThumbnailZone = document.getElementById('catThumbnailZone');
const catThumbnailInput = document.getElementById('catThumbnailInput');
const catThumbnailPreview = document.getElementById('catThumbnailPreview');
const catThumbnailImg = document.getElementById('catThumbnailImg');
const catThumbnailRemove = document.getElementById('catThumbnailRemove');

if (catThumbnailZone && catThumbnailInput) {
    catThumbnailZone.addEventListener('click', () => {
        catThumbnailInput.click();
    });
    
    catThumbnailInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            catThumbnailFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (catThumbnailImg) catThumbnailImg.src = event.target.result;
                if (catThumbnailPreview) catThumbnailPreview.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    });
}

if (catThumbnailRemove) {
    catThumbnailRemove.addEventListener('click', () => {
        catThumbnailFile = null;
        if (catThumbnailInput) catThumbnailInput.value = '';
        if (catThumbnailPreview) catThumbnailPreview.style.display = 'none';
        if (catThumbnailImg) catThumbnailImg.src = '';
    });
}

// Suppression d'une categorie
if (categoriesList) {
    categoriesList.addEventListener('click', async (e) => {
        const del = e.target.closest('[data-delcat]');
        if (del) {
            e.preventDefault();
            await deleteCategory(del.dataset.delcat);
        }
    });
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════════════════ */
const productsList = document.getElementById('productsList');
const productFormWrap = document.getElementById('productFormWrap');
const productForm = document.getElementById('productForm');

async function loadProducts() {
    showLoader(productsList);
    const { data, error } = await sb
        .from('products')
        .select('*, categories(name)')
        .eq('vendor_id', currentVendor.id)
        .order('created_at', { ascending: false });

    if (error) return showError(productsList, error);
    if (!data.length) return showEmpty(productsList, 'Aucun produit. Ajoutez votre premier produit !');

    productsList.innerHTML = `
        <div class="card" style="padding:0;overflow:hidden">
            <table class="table">
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th>Catégorie</th>
                        <th>Prix</th>
                        <th>Stock</th>
                        <th>Statut</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((p) => `
                        <tr>
                            <td style="display:flex;gap:12px;align-items:center">
                                <img src="${escapeHTML(p.image_url)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--color-border);flex-shrink:0" onerror="this.src='${IMG_FALLBACK}'" alt="">
                                <div>
                                    <div style="font-weight:600;font-size:14px">${escapeHTML(p.name)}</div>
                                    ${p.badge ? `<span class="pill" style="font-size:10px;margin-top:3px;background:var(--color-text);color:white;padding:2px 8px">${escapeHTML(badgeLabel(p.badge))}</span>` : ''}
                                </div>
                            </td>
                            <td style="font-size:13px;color:var(--color-text-tertiary)">${escapeHTML(p.categories?.name || '—')}</td>
                            <td style="font-weight:600">${formatXAF(p.price)}</td>
                            <td>${p.stock}</td>
                            <td>${p.active ? '<span class="pill pill--accepted">Actif</span>' : '<span class="pill">Inactif</span>'}</td>
                            <td style="text-align:right;white-space:nowrap">
                                <button class="btn btn--ghost btn--sm" data-edit='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Modifier</button>
                                <button class="btn btn--danger btn--sm" data-del="${escapeHTML(p.id)}" style="margin-left:6px">Supprimer</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/* Open / Close form */
document.getElementById('newProductBtn')?.addEventListener('click', () => openProductModal());
document.getElementById('cancelBtn')?.addEventListener('click', closeProductModal);
document.getElementById('cancelBtn2')?.addEventListener('click', closeProductModal);

function openProductModal(p = null) {
    document.getElementById('modalTitle').textContent = p ? 'Modifier le produit' : 'Nouveau produit';
    productForm.reset();
    productForm.id.value = p?.id || '';

    if (p) {
        productForm.name.value = p.name;
        productForm.description.value = p.description;
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