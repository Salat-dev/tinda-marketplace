    const SUPABASE_URL = "https://uytrjgtrpsbegifudosi.supabase.co";
        const SUPABASE_KEY = "sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga";
        const { createClient } = supabase;
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

        // Toast notifications
        function toast(msg, type = 'info') {
            const container = document.getElementById('toastContainer');
            const el = document.createElement('div');
            el.className = `toast toast--${type}`;
            el.textContent = msg;
            container.appendChild(el);
            setTimeout(() => el.remove(), 3500);
        }

        // Tab switching
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('is-active'));
                tab.classList.add('is-active');
                const tabName = tab.dataset.tab;
                loginForm.hidden = tabName !== 'login';
                signupForm.hidden = tabName !== 'signup';
            });
        });

        // Login
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;
            if (!email || !password) {
                toast('Veuillez remplir tous les champs', 'error');
                return;
            }
            const btn = document.getElementById('loginSubmit');
            btn.disabled = true;
            btn.innerHTML = 'Connexion en cours...';

            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) {
                toast(error.message || 'Erreur de connexion', 'error');
                btn.disabled = false;
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Se connecter`;
            } else {
                // Ensure vendor exists
                const { data: vendor } = await sb.from('vendors').select('id').eq('user_id', data.user.id).single();
                if (!vendor) {
                    // create vendor
                    await sb.from('vendors').insert({
                        user_id: data.user.id,
                        shop_name: email.split('@')[0],
                        email: email,
                        whatsapp: '' // optional
                    });
                }
                window.location.href = 'dashboard.html';
            }
        });

        // Signup
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const shop_name = signupForm.shop_name.value.trim();
            const email = signupForm.email.value.trim();
            const phone = signupForm.phone.value.trim();
            const password = signupForm.password.value;
            if (!shop_name || !email || !phone || !password) {
                toast('Veuillez remplir tous les champs', 'error');
                return;
            }
            if (password.length < 6) {
                toast('Le mot de passe doit contenir au moins 6 caractères', 'error');
                return;
            }
            const btn = document.getElementById('signupSubmit');
            btn.disabled = true;
            btn.innerHTML = 'Création en cours...';

            // Create user
            const { data: authData, error: authError } = await sb.auth.signUp({ email, password });
            if (authError) {
                toast(authError.message || 'Erreur lors de l\'inscription', 'error');
                btn.disabled = false;
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Créer ma boutique`;
                return;
            }

            // Create vendor profile
            const { error: vendorError } = await sb.from('vendors').insert({
                user_id: authData.user.id,
                shop_name: shop_name,
                email: email,
                whatsapp: phone
            });

            if (vendorError) {
                toast('Erreur création boutique : ' + vendorError.message, 'error');
                btn.disabled = false;
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Créer ma boutique`;
            } else {
                toast('Compte créé avec succès ! Redirection...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        });