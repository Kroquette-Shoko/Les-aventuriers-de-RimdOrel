/* ============================================================
   FINITIONS DE CARTES : FOIL ET PREMIUM
   ------------------------------------------------------------
   Une carte peut porter deux marqueurs (champs de l'objet carte) :
     card.foil     → reflet arc-en-ciel qui défile sur la carte
     card.premium  → effet de profondeur : la carte s'incline avec le
                     pointeur, l'illustration se décale derrière le cadre,
                     le reflet blanc a été retiré.
   Les deux se cumulent.

   Tout passe par SCFinish.apply(root, card, size), appelé automatiquement
   à la fin de SCCardRender.decorate (donc par tous les buildNewCardEl).
   Le module ne touche pas aux cartes sans marqueur.

   Technique : les enfants de .ncard sont regroupés dans un calque .nfin
   (même boîte que la carte) qui reçoit l'inclinaison 3D. Le pointeur est
   suivi sur .ncard ; sa position (de -1 à 1) est écrite dans les variables
   CSS --px / --py, tout le reste est du CSS.
   ============================================================ */
(function(){
  // Sortilèges et pièges : l'illustration (cercle / losange) dépasse au-dessus du cadre.
  // Le foil est découpé selon la vraie silhouette de la carte : cadre + illustration.
  // Coordonnées = celles du dessin de la carte (300 x 423), vue étendue de 24 vers le haut.
  function maskCss(sel, shapes){
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 -24 300 447' preserveAspectRatio='none'>" + shapes + "</svg>";
    var u = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    return sel + '{top:-5.674%;height:105.674%;clip-path:none;-webkit-mask:' + u + ' 0 0/100% 100% no-repeat;mask:' + u + ' 0 0/100% 100% no-repeat;}';
  }
  var K = "fill='black' stroke='black'";
  var MASKS = maskCss('.ncard.nd-spell .nfoil',
      "<path d='M22,5 Q150,-3 278,5 Q292,12 292,28 Q283,211 296,396 Q292,412 278,418 Q150,426 22,418 Q8,412 4,396 Q17,211 8,28 Q8,12 22,5 Z' " + K + " stroke-width='7'/>"
    + "<path d='M25,112 a125,125 0 1,0 250,0 a125,125 0 1,0 -250,0 Z' " + K + " stroke-width='10'/>")
  + maskCss('.ncard.nd-trap .nfoil',
      "<path d='M26,4 H274 L296,26 V397 L274,419 H26 L4,397 V26 Z' " + K + " stroke-width='7' stroke-linejoin='round'/>"
    + "<path d='M150,-14 L282,109 L150,232 L18,109 Z' " + K + " stroke-width='10' stroke-linejoin='round'/>");
  var CSS = ''
  + '.ncard.n-finish{isolation:isolate;}'
  + '.ncard.n-prem{perspective:700px;}'
  + '.ncard .nfin{position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;}'
  + '.ncard.n-prem .nfin{transform:rotateX(calc(var(--py,0)*-11deg)) rotateY(calc(var(--px,0)*14deg));transition:transform .22s ease-out;will-change:transform;}'
  + '.ncard.n-prem.n-live .nfin{transition:transform .06s linear;}'
  // Au repos, une carte premium se balance doucement toute seule (variables animées sur .nfin,
  // les enfants héritent de --px / --py). Dès que le pointeur est dessus, le pointeur reprend la main.
  + '@property --px{syntax:"<number>";inherits:true;initial-value:0}'
  + '@property --py{syntax:"<number>";inherits:true;initial-value:0}'
  + '.ncard.n-prem:not(.n-live) .nfin{animation:nprem-sway 7s ease-in-out infinite;}'
  + '@keyframes nprem-sway{0%{--px:-.7;--py:-.3}25%{--px:0;--py:.4}50%{--px:.7;--py:-.3}75%{--px:0;--py:.4}100%{--px:-.7;--py:-.3}}'
  + '.ncard .nart-in{position:absolute;left:0;top:0;width:100%;height:100%;background-repeat:no-repeat;}'
  + '.ncard.n-prem .nart-in{transform:translate(calc(var(--px,0)*-5%),calc(var(--py,0)*-4%)) scale(1.12);transition:transform .22s ease-out;}'
  + '.ncard.n-prem.n-live .nart-in{transition:transform .06s linear;}'
  + '.ncard .nfoil{clip-path:polygon(12px 0,calc(100% - 12px) 0,100% 12px,100% calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,0 calc(100% - 12px),0 12px);}'
  + MASKS
  + '.ncard .nfoil{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:31;mix-blend-mode:hard-light;opacity:.5;'
  +   'background:linear-gradient(115deg,transparent 5%,rgba(255,90,90,.75) 22%,rgba(255,210,80,.75) 34%,rgba(120,255,150,.75) 46%,rgba(80,190,255,.75) 58%,rgba(190,110,255,.75) 70%,rgba(255,120,200,.75) 82%,transparent 95%);'
  +   'background-size:260% 100%;background-position:calc(50% + var(--px,0)*50%) 0;}'
  + '.ncard:not(.n-live) .nfoil{animation:nfoil-idle 6s ease-in-out infinite alternate;}'
  + '@keyframes nfoil-idle{0%{background-position:0% 0}100%{background-position:100% 0}}'
  + '@media (prefers-reduced-motion:reduce){.ncard .nfoil{animation:none!important}.ncard.n-prem .nfin,.ncard.n-prem .nart-in{transition:none}.ncard.n-prem .nfin{animation:none!important}}';
  var installed = false;
  function install(){
    if(installed) return; installed = true;
    var st = document.createElement('style'); st.setAttribute('data-sc-finish','1'); st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function liftArt(root){
    // L'illustration doit bouger DANS la fenêtre découpée par le cadre : on la déplace
    // dans un enfant (le calque garde sa forme et son découpage).
    var art = root.querySelector('.nart-layer');
    if(!art || art.children.length) return;
    var cs = art.style;
    if(!cs.backgroundImage) return;
    var inner = document.createElement('div'); inner.className = 'nart-in';
    inner.style.backgroundImage = cs.backgroundImage;
    inner.style.backgroundPosition = cs.backgroundPosition || '50% 50%';
    inner.style.backgroundSize = cs.backgroundSize || 'cover';
    art.style.backgroundImage = '';
    art.appendChild(inner);
  }

  // Le foil prend la forme exacte du cadre dessiné (le même contour que le fond de la carte),
  // pour ne rien laisser dépasser dans les coins ni sur les bords courbes.
  function shapeMask(root, f){
    try{
      var bg = root.querySelector('svg.nd-bg');
      var path = bg && bg.querySelector('clipPath[id$="CPB"] path');
      if(!path) return;
      var vb = (bg.getAttribute('viewBox') || '0 0 300 423').split(/[ ,]+/).map(Number);
      var PAD = 30; // l'illustration d'un sortilège / piège dépasse au-dessus du fond
      var hole = '';
      var cpw = bg.querySelector('clipPath[id$="CPW"] path');
      if(cpw){ var parts = (cpw.getAttribute('d') || '').split(/[Zz]/); if(parts.length > 2) hole = "<path d='" + parts[1].trim() + " Z' stroke='black' stroke-width='9'/>"; }
      var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='" + vb[0] + ' ' + (vb[1] - PAD) + ' ' + vb[2] + ' ' + (vb[3] + PAD) + "' preserveAspectRatio='none'><path d='" + path.getAttribute('d') + "'/>" + hole + "</svg>";
      var url = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
      f.style.webkitMaskImage = url; f.style.maskImage = url;
      f.style.webkitMaskSize = '100% 100%'; f.style.maskSize = '100% 100%';
      f.style.webkitMaskRepeat = 'no-repeat'; f.style.maskRepeat = 'no-repeat';
      f.style.clipPath = 'none';
      f.style.top = (-PAD / vb[3] * 100).toFixed(3) + '%'; f.style.height = ((vb[3] + PAD) / vb[3] * 100).toFixed(3) + '%';
    }catch(e){}
  }

  function track(root){
    var raf = 0, nx = 0, ny = 0;
    function flush(){ raf = 0; root.style.setProperty('--px', nx.toFixed(3)); root.style.setProperty('--py', ny.toFixed(3)); }
    function move(e){
      var r = root.getBoundingClientRect(); if(!r.width || !r.height) return;
      nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2));
      ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
      root.classList.add('n-live');
      if(!raf) raf = requestAnimationFrame(flush);
    }
    function leave(){ nx = 0; ny = 0; root.classList.remove('n-live'); if(!raf) raf = requestAnimationFrame(flush); }
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerenter', move);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('pointercancel', leave);
  }

  function apply(root, card, size){
    if(!root || !card || (!card.foil && !card.premium)) return root;
    if(root.querySelector(':scope > .nfin')) return root;      // déjà traitée
    install();
    root.classList.add('n-finish');
    if(card.premium) liftArt(root);
    // regroupe tous les enfants dans .nfin
    var fin = document.createElement('div'); fin.className = 'nfin';
    while(root.firstChild) fin.appendChild(root.firstChild);
    root.appendChild(fin);
    if(card.premium){
      root.classList.add('n-prem');
      fin.style.animationDelay = '-' + (Math.random()*7).toFixed(2) + 's';
      track(root);
    }
    if(card.foil){
      root.classList.add('n-foil');
      var f = document.createElement('div'); f.className = 'nfoil'; fin.appendChild(f);
      shapeMask(root, f);
      if(!card.premium) track(root);
    }
    return root;
  }

  window.SCFinish = { apply: apply };
})();
