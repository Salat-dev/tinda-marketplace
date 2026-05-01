/* =============================================================
   supabase.js — Tinda
   Client Supabase + constantes globales
============================================================= */

// ⚠️ Remplace par les valeurs de ton projet :
//    Dashboard Supabase → Project Settings → API Keys → Publishable key (sb_publishable_...)
const SUPABASE_URL = 'https://uytrjgtrpsbegifudosi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Pj_C1NLwxYiVSNOxuX6kUg_MukIHzga';

// Charge la lib depuis le CDN (ajoutée dans chaque HTML)
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Numéro WhatsApp du support (fallback si le vendeur n'a pas le sien)
const SUPPORT_WHATSAPP = '237693421348';
