/* Atelier — barre de navigation commune des pages d'administration.
   Utilisation : <script src="spellcraft-atelier-nav.js"></script> puis atelierNav('cartes' | 'boutique' | 'heros' | 'coffres' | 'succes').
   La barre s'insère tout en haut de la page. */
(function(){
  var PAGES = [
    { key:'cartes',   label:'🃏 Cartes',        href:'spellcraft-card-editor.html' },
    { key:'boutique', label:'🛒 Boutique & coffres', href:'spellcraft-atelier-boutique.html' },
    { key:'heros',    label:'🖼️ Écrans d\'annonce', href:'spellcraft-atelier-annonce.html' },
    { key:'succes',   label:'🏅 Succès',        href:'spellcraft-achievements-editor.html' }
  ];
  var CSS = '#atelier-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 16px;background:#110e1c;border-bottom:1px solid #3a3260;font-family:Inter,sans-serif;}'
    + '#atelier-nav .an-home{color:#d9cfae;text-decoration:none;font-size:12.5px;padding:7px 10px;border-radius:8px;}'
    + '#atelier-nav .an-title{font-family:Cinzel,serif;font-weight:700;color:#d4af37;margin:0 10px 0 4px;font-size:14px;}'
    + '#atelier-nav a.an-tab{color:#efe6c8;text-decoration:none;font-size:12.5px;font-weight:600;padding:7px 13px;border-radius:999px;border:1px solid #3a3260;background:#1f1a30;}'
    + '#atelier-nav a.an-tab:hover{border-color:#d4af37;}'
    + '#atelier-nav a.an-tab.active{background:#d4af37;color:#1c1830;border-color:#d4af37;}';
  window.atelierNav = function(active){
    if(document.getElementById('atelier-nav')) return;
    if(new URLSearchParams(location.search).get('embed') === '1') return; // intégré dans un onglet : pas de barre
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var nav = document.createElement('div'); nav.id = 'atelier-nav';
    nav.innerHTML = '<a class="an-home" href="spellcraft-hub.html">🏠 Hub</a><span class="an-title">Atelier</span>'
      + PAGES.map(function(p){ return '<a class="an-tab'+(p.key===active?' active':'')+'" href="'+p.href+'">'+p.label+'</a>'; }).join('');
    document.body.insertBefore(nav, document.body.firstChild);
  };
})();
