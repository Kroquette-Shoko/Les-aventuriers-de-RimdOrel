/* Rendu "dessiné" des cartes (cadres SVG/CSS, sans images de cadre).
   FICHIER GÉNÉRÉ — ne pas éditer à la main (source : gen/build_module.py).
   Les cadres PNG ont été supprimés : seul le rendu dessiné existe.
   Les icônes (mana, force, endurance, rareté…) restent des images. */
(function(){
  'use strict';
  var PAL = /*@PAL*/;
  var FR = /*@FR*/;
  var FX = /*@FX*/;
  var CLIP = /*@CLIP*/;
  var LEG = /*@LEG*/;
  var ART_DEFS = /*@ARTDEFS*/;
  var CSS = /*@CSS*/;
  var TYPE = {'Créature':'creature','Sortilège':'spell','Piège':'trap','Artefact':'artefact','Région':'region','Héros':'hero'};
  var SPLIT = {big:'M190,0 H300 V423 H110 Z', small:'M150,0 H240 V240 H100 Z'};
  var DIMS = {big:[300,423], small:[240,240]};
  var counter = 0, installed = false;

  function ls(k, v){
    try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; }
  }
  function fromUrl(){
    try{
      var a = new URLSearchParams(location.search).get('anim');
      if(a === 'oui') ls('sc-card-anim', 'always'); else if(a === 'non') ls('sc-card-anim', 'hover');
    }catch(e){}
  }
  /* Conservés pour compatibilité : le style est toujours « dessiné ». */
  function getStyle(){ return 'drawn'; }
  function setStyle(){}
  function getAnim(){ return ls('sc-card-anim') === 'hover' ? 'hover' : 'always'; }
  function setAnim(v){ ls('sc-card-anim', v === 'always' ? 'always' : 'hover'); document.documentElement.classList.toggle('nd-anim-on', v === 'always'); }

  function install(){
    if(installed || !document.body) return;
    installed = true;
    var st = document.createElement('style'); st.id = 'nd-style'; st.textContent = CSS; document.head.appendChild(st);
    var holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    holder.innerHTML = '<svg width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs>' + ART_DEFS + '</defs></svg>';
    document.body.appendChild(holder);
    if(getAnim() === 'always') document.documentElement.classList.add('nd-anim-on');
  }
  function sub(s, u){ return s.split('@U@').join(u); }

  function bgSvg(size, type, src, src2, u){
    var d = DIMS[size], W = d[0], H = d[1];
    var s = '<svg class="nd-bg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="' + u + 'BB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient>'
      + '<clipPath id="' + u + 'CPB"><path d="' + CLIP[size][type][0] + '"/></clipPath>'
      + '<clipPath id="' + u + 'CPW"><path d="M-300,-300 H700 V800 H-300 Z ' + CLIP[size][type][1] + '" clip-rule="evenodd"/></clipPath>';
    if(src2) s += '<clipPath id="' + u + 'CPS"><path d="' + SPLIT[size] + '"/></clipPath>';
    s += '</defs><g clip-path="url(#' + u + 'CPB)"><g clip-path="url(#' + u + 'CPW)"><rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'BB)"/>' + sub(FX[src][size], u);
    if(src2){
      var c = PAL[src2];
      s += '<g clip-path="url(#' + u + 'CPS)" style="--c1:' + c[0] + ';--c2:' + c[1] + ';--c3:' + c[2] + ';--gem:' + c[3] + '">'
        + '<linearGradient id="' + u + 'BB2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient>'
        + '<rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'BB2)"/>' + sub(FX[src2][size], u + 'z') + '</g>';
    }
    return s + '</g></g></svg>';
  }

  /* Variante « plein cadre » : l'illustration occupe toute la carte, pas de cadre ;
     les zones de nom et de règles sont en verre, au cadre teinté par la classe.
     Réglages par variante : card.faGlass (0-85, % d'opacité) et card.faBlur (px). */
  function fullArt(root, card, size, type, src){
    var c = PAL[src];
    root.classList.add('n-drawn', 'n-fullart', 'nd-' + type);
    root.style.setProperty('--c1', c[0]); root.style.setProperty('--c2', c[1]);
    root.style.setProperty('--c3', c[2]); root.style.setProperty('--gem', c[3]);
    var g = (typeof card.faGlass === 'number') ? card.faGlass : 42, b = (typeof card.faBlur === 'number') ? card.faBlur : 3;
    root.style.setProperty('--fa-glass', (Math.max(0, Math.min(85, g)) / 100).toFixed(2));
    root.style.setProperty('--fa-blur', Math.max(0, Math.min(12, b)) + 'px');
    var old = root.querySelectorAll('img.nframe-layer, img.nframe-half-layer, .nname-wrap > img');
    for(var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var art = root.querySelector('.nart-layer');
    var sh = document.createElement('div'); sh.className = 'nf-shade';
    var rim = document.createElement('div'); rim.className = 'nf-rim';
    if(art && art.nextSibling) root.insertBefore(sh, art.nextSibling); else root.appendChild(sh);
    root.appendChild(rim);
  }

  /* Dessine le cadre d'une carte déjà construite par buildNewCardEl.
     Ne fait rien si ce type/format n'a pas de version dessinée. */
  function decorateFrame(root, card, size, opts){
    try{
      if(!root || !card) return root;
      var type = TYPE[card.type];
      if(!type) return root;
      if(size === 'small' && !FR.small[type]) return root;
      if(type === 'hero' && !(opts && opts.heroCardFrame)) return root;
      if(size !== 'big' && size !== 'small') return root;
      install();
      var src = PAL[card.class] ? card.class : 'Neutre';
      if(card.fullArt && type !== 'hero' && type !== 'region'){ fullArt(root, card, size, type, src); return root; }
      var src2 = (card.classSecondary && PAL[card.classSecondary] && card.classSecondary !== src) ? card.classSecondary : null;
      var c = PAL[src], u = 'nd' + (++counter) + '-';
      root.classList.add('n-drawn', 'nd-' + type);
      root.style.setProperty('--c1', c[0]); root.style.setProperty('--c2', c[1]);
      root.style.setProperty('--c3', c[2]); root.style.setProperty('--gem', c[3]);
      var old = root.querySelectorAll('img.nframe-layer, img.nframe-half-layer, .nname-wrap > img');
      for(var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
      var art = root.querySelector('.nart-layer');
      var tmp = document.createElement('div');
      tmp.innerHTML = bgSvg(size, type, src, src2, u + 'b') + sub(FR[size][type], u + 'f');
      var bg = tmp.firstChild, fr = tmp.lastChild;
      if(art && art.nextSibling){ root.insertBefore(bg, art.nextSibling); } else { root.appendChild(bg); }
      root.insertBefore(fr, bg.nextSibling);
      if(size === 'big' && type !== 'hero' && card.isLegendary){
        var lg = document.createElement('div'); lg.className = 'nd-leg'; lg.innerHTML = sub(LEG, u + 'l');
        root.appendChild(lg);
      }
    }catch(e){ if(window.console) console.warn('SCCardRender.decorate', e); }
    return root;
  }

  /* Cadres dessinés, puis finitions foil / premium (spellcraft-premium.js).
     Les finitions s'appliquent quel que soit le mode de cadre (plein cadre ou dessiné). */
  function decorate(root, card, size, opts){
    var r = decorateFrame(root, card, size, opts);
    try{ if(window.SCFinish) window.SCFinish.apply(root, card, size); }catch(e){ if(window.console) console.warn('SCFinish', e); }
    return r;
  }

  fromUrl();
  window.SCCardRender = { decorate: decorate, getStyle: getStyle, setStyle: setStyle, getAnim: getAnim, setAnim: setAnim };
})();
