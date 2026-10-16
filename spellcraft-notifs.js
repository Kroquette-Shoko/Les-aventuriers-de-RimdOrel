// ============================================================
// SPELLCRAFT — Pastilles de nouveautés (point d'exclamation jaune)
// ============================================================
// Un petit « ! » jaune signale, sur un menu ou un onglet, qu'il y a
// quelque chose de nouveau à voir ou à récupérer.
//
// Où il apparaît :
//   Hub        : Notes de version (nouvelle note non lue), Hauts-faits
//                (récompense à réclamer), Quêtes (quête terminée à
//                récupérer, ou ouverture possible dans la grille),
//                Boutique (boutique renouvelée depuis la dernière visite,
//                ou boosters à récupérer).
//   Hauts-faits: chaque onglet de catégorie qui contient une récompense à réclamer.
//   Quêtes     : l'onglet « Les coffres de Velkrin » (ouverture possible) et
//                chaque section qui contient une quête terminée à récupérer.
//   Boutique   : « Mes boosters » (boosters à récupérer) et « Cartes à
//                l'unité » (offres du jour renouvelées).
//
// « Boutique renouvelée » : on garde, sur CET appareil, une empreinte de ce
// que la boutique proposait à la dernière visite. Si l'empreinte change,
// la boutique est « neuve ». (Un autre appareil ou un navigateur vidé
// repart donc de zéro : la pastille s'affiche une fois.)
// ============================================================
(function () {
  'use strict';

  // ---------- Style ----------
  const css = `
.sc-notif{position:absolute;top:8px;right:8px;z-index:6;display:flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:50%;background:#ffd23f;color:#3a2a00;
  font:900 14px/1 'Inter',sans-serif;pointer-events:none;
  box-shadow:0 0 0 2px rgba(0,0,0,.55), 0 0 12px rgba(255,210,63,.8);
  animation:sc-notif-pulse 1.8s ease-in-out infinite;}
.sc-notif.sc-notif-out{top:-8px;right:-8px;}
.sc-notif.sc-notif-inline{position:static;display:inline-flex;width:18px;height:18px;font-size:12px;margin-left:8px;vertical-align:middle;}
@keyframes sc-notif-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.14);}}
@media (prefers-reduced-motion: reduce){.sc-notif{animation:none;}}
`;
  const st = document.createElement('style');
  st.setAttribute('data-sc-notifs', '1');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // ---------- Outils ----------
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignoré */ } }

  async function uid() {
    try {
      const { data: { user } } = await sb.auth.getUser();
      return user ? user.id : null;
    } catch (e) { return null; }
  }

  // Ajoute / retire la pastille dans un élément. mode : 'in' (coin intérieur),
  // 'out' (déborde du coin) ou 'inline' (à la suite du texte).
  function mark(el, on, mode) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    let b = el.querySelector(':scope > .sc-notif');
    if (!on) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('span');
    b.className = 'sc-notif' + (mode === 'out' ? ' sc-notif-out' : mode === 'inline' ? ' sc-notif-inline' : '');
    b.textContent = '!';
    b.setAttribute('aria-label', 'Nouveauté');
    if (mode !== 'inline' && getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(b);
  }

  // Empreinte courte d'une liste d'identifiants.
  function signature(ids) {
    const s = ids.filter(Boolean).map(String).sort().join('|');
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return ids.length + ':' + (h >>> 0).toString(36);
  }

  // ---------- Sources de nouveautés (chacune renvoie vrai / faux, jamais d'erreur) ----------
  async function hasClaimableAchievement() {
    try {
      const { data, error } = await sb.rpc('get_achievements');
      if (error || !data || data.error) return false;
      return (data.achievements || []).some(a => a.completed && !a.claimed);
    } catch (e) { return false; }
  }
  async function hasClaimableQuest() {
    try {
      const { data, error } = await sb.rpc('get_active_quests');
      if (error || !data || data.error) return false;
      return (data.quests || []).some(q => q.completed && !q.claimed);
    } catch (e) { return false; }
  }
  async function hasCalendarTicket() {
    try {
      const f = await sb.from('app_flags').select('value').eq('key', 'calendar_enabled').maybeSingle();
      if (!f || !f.data || f.data.value !== true) return false; // la grille n'est pas ouverte à tous
      const { data, error } = await sb.rpc('get_calendar');
      if (error || !data || data.error || !data.season) return false;
      return !!(data.tickets && data.tickets.available > 0);
    } catch (e) { return false; }
  }
  async function boosterStock() {
    try {
      const { data, error } = await sb.rpc('get_user_boosters');
      if (error || !data || data.error) return 0;
      return (data.boosters || []).reduce((n, b) => n + (b.quantity || 0), 0);
    } catch (e) { return 0; }
  }
  // Ce que la boutique propose en ce moment : offres du jour + boosters + dos de cartes.
  async function shopDailyIds() {
    try {
      const { data, error } = await sb.rpc('get_daily_shop_offers');
      if (error || !data || data.error) return null;
      return (data.choices || []).map(c => 'o' + c.id);
    } catch (e) { return null; }
  }
  async function shopTableIds(table, prefix) {
    try { const r = await sb.from(table).select('id'); return (r.data || []).map(b => prefix + b.id); } catch (e) { return []; }
  }
  // Une empreinte par rayon : offres du jour, boosters, dos de cartes.
  async function shopSignatures() {
    const [daily, boosters, backs] = await Promise.all([shopDailyIds(), shopTableIds('boosters', 'b'), shopTableIds('card_backs', 'd')]);
    if (!daily) return null;
    return { daily: signature(daily), boosters: signature(boosters), backs: signature(backs) };
  }
  const SHOP_KEY = (u) => 'sc-shop-seen:' + u;
  // La boutique est-elle « neuve » depuis la dernière visite ? Par rayon + global.
  async function shopNewness() {
    const none = { dailyNew: false, boostersNew: false, backsNew: false, anyNew: false };
    const u = await uid(); if (!u) return none;
    const sig = await shopSignatures(); if (!sig) return none;
    let seen = null; try { seen = JSON.parse(safeGet(SHOP_KEY(u)) || 'null'); } catch (e) { /* ignoré */ }
    const r = {
      dailyNew: !seen || seen.daily !== sig.daily,
      boostersNew: !seen || seen.boosters !== sig.boosters,
      backsNew: !seen || seen.backs !== sig.backs
    };
    r.anyNew = r.dailyNew || r.boostersNew || r.backsNew;
    return r;
  }
  // À appeler quand le joueur a VU la boutique.
  async function markShopSeen() {
    const u = await uid(); if (!u) return;
    const sig = await shopSignatures(); if (!sig) return;
    safeSet(SHOP_KEY(u), JSON.stringify(sig));
  }

  // ---------- Hub ----------
  async function refreshHub() {
    const u = await uid(); if (!u) return;
    const tile = (href) => document.querySelector('a.sc-tile[href="' + href + '"]');
    const [ach, quest, cal, stock, shopN] = await Promise.all([
      hasClaimableAchievement(), hasClaimableQuest(), hasCalendarTicket(), boosterStock(), shopNewness()
    ]);
    mark(tile('spellcraft-achievements.html'), ach);
    mark(tile('spellcraft-quests.html'), quest || cal);
    mark(tile('spellcraft-shop.html'), stock > 0 || shopN.anyNew);
  }

  window.scNotif = {
    mark, signature,
    hasClaimableAchievement, hasClaimableQuest, hasCalendarTicket, boosterStock,
    shopNewness, markShopSeen, refreshHub
  };
})();
