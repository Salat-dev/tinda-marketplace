    /* ══════════════════════════════════════
       CONFIG
    ══════════════════════════════════════ */
    const SUPABASE_URL             = 'https://uytrjgtrpsbegifudosi.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';
    const SUPPORT_WHATSAPP         = '237693421348';

    const { createClient } = supabase;
    const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23F2F2EF" width="200" height="200"/%3E%3C/svg%3E';

    /* ══════════════════════════════════════
       UTILS
    ══════════════════════════════════════ */
    function esc(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function formatXAF(n) {
      return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(n||0);
    }

    function genOrderNumber() {
      return 'TND-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
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
      setTimeout(() => el.remove(), 4200);
    }

    /* ══════════════════════════════════════
       CART
    ══════════════════════════════════════ */
    const Cart = {
      get()      { try { return JSON.parse(localStorage.getItem('tinda_cart')||'[]'); } catch{ return []; } },
      clear()    { localStorage.removeItem('tinda_cart'); },
      count()    { return this.get().reduce((s,i)=>s+i.qty,0); },
      subtotal() { return this.get().reduce((s,i)=>s+i.price*i.qty,0); },
    };

    /* ══════════════════════════════════════
       RENDER SUMMARY
    ══════════════════════════════════════ */
    function renderSummary() {
      const items = Cart.get();
      if (!items.length) { window.location.href = 'cart.html'; return; }

      document.getElementById('cartCount').textContent    = Cart.count();
      document.getElementById('summaryCount').textContent = Cart.count() + ' article' + (Cart.count()>1?'s':'');
      document.getElementById('summarySubtotal').textContent = formatXAF(Cart.subtotal());
      document.getElementById('summaryTotal').textContent    = formatXAF(Cart.subtotal());

      document.getElementById('summaryItems').innerHTML = items.map(item => `
        <div class="summary-item">
          <img class="summary-item__img"
               src="${esc(item.image||IMG_FALLBACK)}"
               alt="${esc(item.name)}"
               onerror="this.src='${IMG_FALLBACK}'">
          <div class="summary-item__body">
            <div class="summary-item__name">${esc(item.name)}</div>
            <div class="summary-item__meta">
              Qte ${item.qty}
              ${item.color
                ? ` · <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(item.color)};vertical-align:middle;border:1px solid rgba(0,0,0,.12)"></span>`
                : ''}
            </div>
          </div>
          <div class="summary-item__price">${formatXAF(item.price*item.qty)}</div>
        </div>`
      ).join('');
    }

    /* ══════════════════════════════════════
       FORM VALIDATION
    ══════════════════════════════════════ */
    const REQUIRED = ['customer_name','customer_phone','customer_address'];

    REQUIRED.forEach(id => {
      document.getElementById(id).addEventListener('input', function(){
        if (this.value.trim()) this.classList.remove('is-error');
      });
    });

    function validateForm() {
      let ok = true;
      REQUIRED.forEach(id => {
        const el = document.getElementById(id);
        if (!el.value.trim()) { el.classList.add('is-error'); ok = false; }
        else el.classList.remove('is-error');
      });
      return ok;
    }

    /* ══════════════════════════════════════
       SUBMIT - SUPABASE
       Groupe par vendor_id - fonctionne sans auth
    ══════════════════════════════════════ */
    async function submitOrder(fd) {
      const items = Cart.get();

      const byVendor = new Map();
      for (const item of items) {
        const vid = item.vendor_id || null;
        const key = vid || '__unknown__';
        if (!byVendor.has(key)) byVendor.set(key, { vendorId: vid, items: [] });
        byVendor.get(key).items.push(item);
      }

      const orderNumbers     = [];
      const errors           = [];
      const successVendorIds = [];

      for (const [, group] of byVendor) {
        const { vendorId, items: vendorItems } = group;
        const orderNumber = genOrderNumber();
        const orderTotal  = vendorItems.reduce((s,i) => s + i.price*i.qty, 0);

        const { data: order, error: oErr } = await sb
          .from('orders')
          .insert({
            order_number:     orderNumber,
            vendor_id:        vendorId,
            customer_name:    fd.customer_name,
            customer_phone:   fd.customer_phone,
            customer_address: fd.customer_address,
            customer_city:    fd.customer_city || null,
            total:            orderTotal,
            status:           'pending',
            notes:            fd.notes || null,
          })
          .select('id')
          .single();

        if (oErr || !order) {
          console.error('Erreur order insert:', oErr);
          errors.push(oErr?.message || 'Erreur creation commande');
          continue;
        }

        const { error: iErr } = await sb
          .from('order_items')
          .insert(vendorItems.map(item => ({
            order_id:   order.id,
            product_id: item.id || null,
            name:       item.name,
            unit_price: item.price,
            quantity:   item.qty,
            subtotal:   item.price * item.qty,
          })));

        if (iErr) {
          console.error('Erreur items insert:', iErr);
          errors.push(iErr.message);
        } else {
          orderNumbers.push(orderNumber);
          if (vendorId) successVendorIds.push(vendorId);
        }
      }

      return { orderNumbers, errors, successVendorIds };
    }

    /* ══════════════════════════════════════
       SUCCESS SCREEN (step 3)
       Affiche le WhatsApp du vendeur concerne
    ══════════════════════════════════════ */
    async function showSuccess(orderNumbers, fd, vendorIds = []) {
      const num = orderNumbers[0] || '-';

      const WA_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>';

      let vendors = [];
      if (vendorIds.length) {
        const { data } = await sb
          .from('vendors')
          .select('id, shop_name, whatsapp, phone')
          .in('id', vendorIds);
        vendors = data || [];
      }

      let waButtons = '';
      if (vendors.length) {
        waButtons = vendors.map(v => {
          const waNum  = (v.whatsapp || v.phone || SUPPORT_WHATSAPP).replace(/\D/g, '');
          const waText = encodeURIComponent(
            'Bonjour ' + v.shop_name + ",\nJ'ai passe une commande Tinda.\nNom : " + fd.customer_name + '\nTel : ' + fd.customer_phone + '\nCommande : ' + orderNumbers.join(', ') + '\nTotal : ' + formatXAF(Cart.subtotal())
          );
          return '<a href="https://wa.me/' + waNum + '?text=' + waText + '" target="_blank" rel="noopener" class="btn-sm-green">' + WA_ICON + ' Contacter ' + esc(v.shop_name) + '</a>';
        }).join('');
      } else {
        const waText = encodeURIComponent(
          "Bonjour, j'ai passe une commande Tinda.\nNom : " + fd.customer_name + '\nTel : ' + fd.customer_phone + '\nCommande : ' + orderNumbers.join(', ') + '\nTotal : ' + formatXAF(Cart.subtotal())
        );
        waButtons = '<a href="https://wa.me/' + SUPPORT_WHATSAPP.replace(/\D/g,'') + '?text=' + waText + '" target="_blank" rel="noopener" class="btn-sm-green">' + WA_ICON + ' Contacter le support</a>';
      }

      document.getElementById('mainPage').innerHTML =
        '<div class="success-screen">' +
          '<div class="steps" style="margin-bottom:40px">' +
            '<div class="step step--done"><span class="step__num"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="step__label">Panier</span></div>' +
            '<div class="step__sep step__sep--done"></div>' +
            '<div class="step step--done"><span class="step__num"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="step__label">Livraison</span></div>' +
            '<div class="step__sep step__sep--done"></div>' +
            '<div class="step step--active"><span class="step__num"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span><span class="step__label">Confirmation</span></div>' +
          '</div>' +
          '<div class="success-screen__icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></div>' +
          '<h2 class="success-screen__title">Commande confirmee !</h2>' +
          '<p class="success-screen__sub">Merci <strong>' + esc(fd.customer_name) + '</strong> !<br>Votre commande a bien ete enregistree. Le vendeur vous contactera au <strong>' + esc(fd.customer_phone) + '</strong> pour organiser la livraison.</p>' +
          '<div class="success-screen__order"><div class="success-screen__order-label">Numero de commande</div><div class="success-screen__order-num">' + esc(num) + '</div></div>' +
          '<div class="success-actions">' +
            waButtons +
            '<a href="shop.html" class="btn-sm-outline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> Retour boutique</a>' +
          '</div>' +
        '</div>';

      Cart.clear();
      document.getElementById('cartCount').textContent = '0';
    }

    /* ══════════════════════════════════════
       FORM SUBMIT
    ══════════════════════════════════════ */
    document.getElementById('checkoutForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!validateForm()) {
        toast('Veuillez remplir tous les champs obligatoires.', 'error');
        const first = document.querySelector('.is-error');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const btn = document.getElementById('confirmBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Envoi en cours...';

      const fd = {
        customer_name:    document.getElementById('customer_name').value.trim(),
        customer_phone:   document.getElementById('customer_phone').value.trim(),
        customer_address: document.getElementById('customer_address').value.trim(),
        customer_city:    document.getElementById('customer_city').value.trim(),
        notes:            document.getElementById('notes').value.trim(),
      };

      const { orderNumbers, errors, successVendorIds } = await submitOrder(fd);

      if (errors.length && !orderNumbers.length) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> Confirmer la commande';
        toast('Erreur : ' + errors[0], 'error');
        return;
      }

      await showSuccess(orderNumbers, fd, successVendorIds);
    });

    /* ══════════════════════════════════════
       WHATSAPP DIRECT
       Envoie au vendeur si panier mono-vendeur
    ══════════════════════════════════════ */
    document.getElementById('whatsappBtn').addEventListener('click', async function() {
      const name    = document.getElementById('customer_name').value.trim() || '(non renseigne)';
      const phone   = document.getElementById('customer_phone').value.trim() || '(non renseigne)';
      const address = document.getElementById('customer_address').value.trim() || '(non renseignee)';
      const city    = document.getElementById('customer_city').value.trim();
      const notes   = document.getElementById('notes').value.trim();
      const items   = Cart.get();
      const lines   = items.map(i => '- ' + i.name + ' x ' + i.qty + ' - ' + formatXAF(i.price*i.qty)).join('\n');

      const msgParts = [
        '*Nouvelle commande Tinda*',
        '',
        'Client : ' + name,
        'Tel : ' + phone,
        'Adresse : ' + address + (city ? ', ' + city : ''),
        notes ? 'Notes : ' + notes : '',
        '',
        'Articles :',
        lines,
        '',
        'Total : ' + formatXAF(Cart.subtotal()),
        'Paiement a la livraison.',
      ].filter(Boolean).join('\n');

      const vendorIds = [...new Set(items.map(i => i.vendor_id).filter(Boolean))];
      let waNum = SUPPORT_WHATSAPP.replace(/\D/g, '');
      if (vendorIds.length === 1) {
        const { data: v } = await sb.from('vendors').select('whatsapp, phone').eq('id', vendorIds[0]).single();
        if (v) waNum = (v.whatsapp || v.phone || SUPPORT_WHATSAPP).replace(/\D/g, '');
      }

      window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(msgParts), '_blank', 'noopener');
    });

    /* ══════════════════════════════════════
       INIT
    ══════════════════════════════════════ */
    renderSummary();
