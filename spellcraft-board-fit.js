/* Adaptation du plateau à l'écran réel (ordinateur, tablette, téléphone en paysage).

   Avant : le plateau était dessiné pour 1920×1080 puis réduit en bloc, avec des
   bandes noires dès que le ratio de l'écran n'était pas 16:9.
   Maintenant : la LARGEUR de référence reste 1920, mais la HAUTEUR du plateau
   suit le ratio de l'écran (dans des bornes), donc le plateau remplit l'écran.
   Sur écran peu haut (téléphone), la classe "bd-compact" est posée sur <html> :
   les pages y branchent des règles CSS qui resserrent la mise en page.
   Sur écran tactile, la classe "bd-touch" est posée ; en portrait sur petit
   écran, un message demande de passer en paysage (la partie y est obligatoire). */
(function(){
  'use strict';
  var MIN_H = 760, MAX_H = 1300;
  var root = document.documentElement;

  function isSmallTouch(){
    var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return coarse && Math.min(window.innerWidth, window.innerHeight) < 700;
  }

  function ensureRotateOverlay(){
    var el = document.getElementById('bd-rotate-overlay');
    if(el) return el;
    el = document.createElement('div');
    el.id = 'bd-rotate-overlay';
    el.innerHTML = '<div class="bd-rot-box"><div class="bd-rot-icon">⟳</div>'
      + '<div class="bd-rot-title">Tourne ton téléphone</div>'
      + '<div class="bd-rot-text">La partie se joue en <strong>mode paysage</strong>. Passe ton téléphone à l\'horizontale (et désactive le verrouillage de rotation si besoin).</div></div>';
    var st = document.createElement('style');
    st.textContent = '#bd-rotate-overlay{display:none;position:fixed;inset:0;z-index:2147483000;background:#0b0a12;color:#efe6c8;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:Inter,sans-serif;}'
      + 'html.bd-need-landscape #bd-rotate-overlay{display:flex;}'
      + '.bd-rot-box{max-width:320px;}.bd-rot-icon{font-size:64px;color:#d4af37;line-height:1;margin-bottom:12px;animation:bd-rot 2.4s ease-in-out infinite;}'
      + '@keyframes bd-rot{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}'
      + '.bd-rot-title{font-family:Cinzel,serif;font-weight:700;font-size:20px;color:#d4af37;margin-bottom:10px;}.bd-rot-text{font-size:14px;line-height:1.5;color:#b9ae8e;}';
    document.head.appendChild(st);
    document.body.appendChild(el);
    return el;
  }

  /* outer : élément à mettre à l'échelle ; opts : { refW, baseH, topReserve }
     (topReserve = hauteur d'écran occupée par une barre hors plateau, ex. tutoriel) */
  function fit(outer, opts){
    if(!outer) return;
    var refW = opts.refW || 1920, baseH = opts.baseH || 1080, top = opts.topReserve || 0;
    var vw = window.innerWidth, vh = window.innerHeight;
    var availH = Math.max(100, vh - top);
    var touchSmall = isSmallTouch();
    var portrait = vh > vw;
    root.classList.toggle('bd-touch', !!(window.matchMedia && matchMedia('(pointer: coarse)').matches));
    root.classList.toggle('bd-need-landscape', touchSmall && portrait);
    if(touchSmall && portrait) ensureRotateOverlay();
    // Petit écran (téléphone, ou fenêtre très peu haute) : hauteur du plateau = ratio de l'écran,
    // bornée à MIN_H, et mode compact si ça reste nettement sous la hauteur d'origine.
    // Écran « normal » : on garde la hauteur d'origine (jamais en dessous, comme avant — bandes noires
    // éventuelles) mais on profite d'un écran plus haut que 16:9 (jusqu'à MAX_H).
    var small = touchSmall || vh < 640;
    var ch = Math.round(refW * availH / vw);
    var lo = small ? Math.min(MIN_H, baseH) : baseH, hi = Math.max(MAX_H, baseH);
    ch = Math.max(lo, Math.min(hi, ch));
    root.classList.toggle('bd-compact', small && ch < baseH - 40);
    outer.style.height = ch + 'px';
    var scale = Math.min(vw / refW, availH / ch);
    outer.style.transform = 'scale(' + scale + ')';
    root.style.setProperty('--bd-scale', String(scale));
    root.style.setProperty('--bd-canvas-h', ch + 'px');
    // Écrans plein-fenêtre hors plateau (mulligan…) : cartes de 300 px de large, jusqu'à 5 côte à côte,
    // + titre et bouton → on réduit pour que tout tienne dans la fenêtre réelle.
    root.style.setProperty('--bd-ovl-zoom', String(Math.max(0.2, Math.min(1, (vh - 100) / 440, (vw - 40) / 1580))));
    root.style.setProperty('--bd-prev-zoom', String(Math.max(0.5, Math.min(1, (vh - 24) / 430))));
  }

  window.SCBoardFit = { fit: fit };
  // Verrouillage paysage quand le navigateur l'autorise (plein écran / appli installée) : sans effet sinon.
  try{ if(screen.orientation && screen.orientation.lock && isSmallTouch()) screen.orientation.lock('landscape').catch(function(){}); }catch(e){}
})();
