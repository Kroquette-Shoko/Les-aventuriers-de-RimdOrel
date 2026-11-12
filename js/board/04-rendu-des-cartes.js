// ============================================================
// Plateau de jeu — 04-rendu-des-cartes
// Rendu d une carte (cardEl), noms, aperçus au survol, infobulles de mots-clés
// (Chargé dans l ordre depuis spellcraft-server-board.html : tout est partagé, comme avant.)
// ============================================================
// ---------------- cardEl (adapté du prototype) ----------------

// ============================================================
// NOUVEAU TEMPLATE — frames illustrées (big / small), repris tel
// quel du deckbuilder/éditeur.
// ============================================================
const NCLASS_TO_SLUG = {
  'Aube':'aube', 'Crépuscule':'crepuscule', 'Volonté':'volonté',
  'Prima':'prima', 'Arcane':'arcane', 'Neutre':'neutre'
};
const NRARITY_TO_SLUG = {
  'Basique':'basique', 'Commune':'commun', 'Rare':'rare',
  'Épique':'epique', 'Mythique':'mythique'
};
function nEl(tag, cls){ const e = document.createElement(tag); if(cls) e.className = cls; return e; }
function nImg(src, cls){ const i = document.createElement('img'); i.src = src; if(cls) i.className = cls; return i; }

function buildCurvedNameText(name, card, size){
  const wrap = nEl('div', 'nname-curved');
  wrap.style.top = (card.heroNameCurveTop ?? 4) + '%';
  const chars = (name || '').split('');
  const n = chars.length;
  const strength = (card.heroNameCurveStrength ?? 34) / 100;
  const maxAngle = Math.min(60, n * 4.2) * strength;
  const start = -maxAngle / 2;
  const step = n > 1 ? maxAngle / (n - 1) : 0;
  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    const angle = start + step * i;
    span.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    wrap.appendChild(span);
  });
  applyNameSizing(wrap, card, size);
  return wrap;
}

function buildNewCardEl(card, size, effectiveCostOverride, opts={}){
  const root = nEl('div', `ncard n-${size}`);
  const slug = NCLASS_TO_SLUG[card.class] || 'neutre';
  const isHero = card.type==='Héros';
  const isRegion = card.type==='Région';
  const hasMana = !isHero && !isRegion;
  const isCreature = card.type==='Créature';
  const isArtifact = card.type==='Artefact';
  if(isHero) root.classList.add('n-hero-card');
  if(isArtifact) root.classList.add('n-artifact-card');

  const posX = isHero ? (card.imagePosXHeroCard ?? 50) : size==='big' ? (card.imagePosX ?? 50) : (card.imagePosXSmall ?? 50);
  const posY = isHero ? (card.imagePosYHeroCard ?? 50) : size==='big' ? (card.imagePosY ?? 50) : (card.imagePosYSmall ?? 50);
  const zoom = isHero ? (card.imageZoomHeroCard ?? 100) : size==='big' ? (card.imageZoom ?? 100) : (card.imageZoomSmall ?? 100);
  const art = nEl('div', 'nart-layer');
  if(card.image && !(typeof applyNCardArtFree==='function' && applyNCardArtFree(art, card, isHero ? 'HeroCard' : size==='big' ? '' : 'Small'))){
    art.style.backgroundImage = `url('${card.image.replace(/'/g,'')}')`;
    art.style.backgroundPosition = `${posX}% ${posY}%`;
    art.style.backgroundSize = zoom>100 ? zoom+'%' : 'cover';
  }
  root.appendChild(art);

  if(hasMana){
    const w = nEl('div','nstat-wrap n-mana');
    w.appendChild(nImg('images/card/icon/bubble/mana.png'));
    const shownCost = effectiveCostOverride ?? (card.cost ?? 0);
    const t = nEl('div','nstat-txt'); t.textContent = shownCost;
    // Coût comparé à celui du catalogue : réduit = vert, augmenté = rouge
    const baseCard = (typeof JOURNAL_CARD_LOOKUP!=='undefined' && card.id) ? JOURNAL_CARD_LOOKUP[card.id] : undefined;
    if(baseCard && typeof baseCard.cost==='number' && shownCost !== baseCard.cost){
      t.classList.add(shownCost < baseCard.cost ? 'n-up' : 'n-down');
      w.title = `Coût ${shownCost} (base ${baseCard.cost})`;
    }
    w.appendChild(t);
    root.appendChild(w);
  }
  if(isCreature){
    const wa = nEl('div','nstat-wrap n-atk');
    wa.appendChild(nImg('images/card/icon/bubble/attack.png'));
    const ta = nEl('div','nstat-txt'); ta.textContent = card.curAtk ?? card.atk ?? 0;
    wa.appendChild(ta);
    // Créature en jeu uniquement : force/PV colorés selon bonus/malus (+ infobulle)
    const live = opts.liveStats ? creatureStatInfo(card, (typeof JOURNAL_CARD_LOOKUP!=='undefined' ? JOURNAL_CARD_LOOKUP[card.id] : undefined), S && S.turn) : null;
    if(live && live.atk.cls){ ta.classList.add(live.atk.cls); wa.title = live.atk.title; }
    root.appendChild(wa);

    const we = nEl('div','nstat-wrap n-end');
    we.appendChild(nImg('images/card/icon/bubble/endurance.png'));
    const te = nEl('div','nstat-txt'); te.textContent = card.curHp ?? card.hp ?? 0;
    we.appendChild(te);
    if(live && live.hp.cls){ te.classList.add(live.hp.cls); we.title = live.hp.title; }
    root.appendChild(we);
  }
  const isEdiCard = isArtifact && (card.subtypes||[]).some(s=>String(s).trim().toLowerCase()==='\u00e9difice');
  if(isEdiCard){ // Édifice : Endurance à la place des charges
    const we = nEl('div','nstat-wrap n-end');
    we.appendChild(nImg('images/card/icon/bubble/endurance.png'));
    const te = nEl('div','nstat-txt'); te.textContent = (card.curHp ?? card.hp ?? 0);
    we.appendChild(te);
    we.title = "Endurance de l'Édifice";
    root.appendChild(we);
  }
  if(isArtifact && !isEdiCard){
    const wf = nEl('div','nstat-wrap n-art');
    wf.appendChild(nImg('images/card/icon/bubble/artefact.png'));
    const t = nEl('div','nstat-txt'); t.textContent = (card.charges ?? 0)+'x';
    wf.appendChild(t);
    wf.title = "Charges restantes : chaque utilisation retire 1 charge, et chaque déclenchement d'un effet passif aussi. À 0, l'artefact est détruit.";
    root.appendChild(wf);
  }
  if(isHero){
    const w = nEl('div','nstat-wrap n-mana');
    w.style.cssText += 'left:-6.5%;top:auto;bottom:-6.5%;';
    w.appendChild(nImg('images/card/icon/bubble/vie.png'));
    const t = nEl('div','nstat-txt'); t.textContent = card.curHp ?? card.hp ?? 0;
    if(typeof card.curHp==='number' && typeof card.hp==='number' && card.curHp !== card.hp) t.classList.add(card.curHp < card.hp ? 'n-down' : 'n-up'); // vie sous le maximum : rouge
    w.appendChild(t);
    root.appendChild(w);
  }

  if(isHero){
    root.appendChild(buildCurvedNameText(card.name || '', card, size));
  } else {
    const nw = nEl('div','nname-wrap');
    nw.appendChild(nImg('images/card/icon/bubble/nom.png'));
    const nameEl = nEl('div','nname-text'); nameEl.textContent = card.name || '';
    applyNameSizing(nameEl, card, size);
    nw.appendChild(nameEl);
    root.appendChild(nw);
  }

  if(size==='big' && (!isHero || opts.forceHeroText)){
    const textEl = nEl('div','ncard-text'); textEl.textContent = card.text || '';
    root.appendChild(textEl);
  }

  if(card.subtypes && card.subtypes.length && !isHero){
    const tl = nEl('div','ntypeline'); tl.textContent = card.subtypes.join(' - ');
    root.appendChild(tl);
  }

  if(!isHero && (card.isLegendary || (card.rarity && NRARITY_TO_SLUG[card.rarity]))){ const __gs = card.isLegendary ? 'legendaire' : NRARITY_TO_SLUG[card.rarity];
    root.appendChild(typeof rarityGemImg==='function' ? rarityGemImg(card, __gs, 'nrarity-gem', nImg) : nImg(`images/card/icon/rare/${__gs}.png`, 'nrarity-gem'));
  }

  // Icônes des mots-clés "Assaut" et "Finale" (pas "Début", volontairement
  // sans icône) — uniquement sur le plateau, format small, en rangée
  // au-dessus de la gemme de rareté.
  const kw = card.keywords || [];
  // (Assaut / Final sont maintenant dans la pile de badges en haut à droite, comme tous les autres mots-clés :
  //  même taille, même niveau — voir activeBadgeKeywords.)

  if(window.SCCardRender) SCCardRender.decorate(root, card, size, opts);
  return root;
}
// Applique le réglage manuel de taille de police du nom fait dans l'éditeur
// (card.nameFontSize / nameFontAuto / nameWrap) — sinon la taille auto
// (fitBoxFont, plus bas) prend le relais comme avant.
function applyNameSizing(nameEl, card, size){
  if(card.nameWrap){
    nameEl.style.whiteSpace = 'normal';
    nameEl.style.height = 'auto';
    nameEl.style.overflow = 'visible';
  }
  if(card.nameFontAuto === false){
    nameEl.dataset.auto = '0';
    // la taille choisie est calibrée sur le grand format (300px) ; on
    // l'adapte proportionnellement à la vraie taille du petit format ici (120px)
    const scale = size==='small' ? (120/300) : 1;
    nameEl.style.fontSize = ((card.nameFontSize || 14) * scale) + 'px';
  } else {
    nameEl.dataset.auto = '1';
  }
}
function fitBoxFont(el, minSize){
  if(!el) return;
  el.style.fontSize = '';
  let size = parseFloat(getComputedStyle(el).fontSize);
  const floor = minSize || 7;
  let attempts = 0;
  while(attempts < 26 && size > floor){
    const overflowH = el.scrollHeight > el.clientHeight + 1;
    const overflowW = el.scrollWidth > el.clientWidth + 1;
    if(!overflowH && !overflowW) break;
    size -= 0.5;
    el.style.fontSize = size + 'px';
    attempts++;
  }
}
function fitNewCard(rootEl){
  if(!rootEl) return;
  const nameEl = rootEl.querySelector('.nname-text') || rootEl.querySelector('.nname-curved');
  if(nameEl && nameEl.dataset.auto !== '0'){
    fitBoxFont(nameEl, 6);
  }
  fitBoxFont(rootEl.querySelector('.ncard-text'), 7);
}

// Miroir exact de getEffectiveCost côté serveur — pour que l'affichage et
// le calcul "carte jouable ou non" tiennent compte des réductions actives.
function getEffectiveCostClient(p, card){
  let cost = card.cost || 0;
  (p.activeCostReductions||[]).forEach(r=>{
    if(r.cardType && r.cardType!==card.type) return;
    if(r.subtype && !(card.subtypes||[]).includes(r.subtype)) return;
    cost -= r.amount || 0;
  });
  return Math.max(0, cost);
}

function cardEl(card, opts={}){
  const inPlay = !!opts.inPlay;
  const size = inPlay ? 'small' : 'big';
  // le coût effectif (réductions actives) n'a de sens que pour une carte pas
  // encore jouée, appartenant au joueur local (seule main visible)
  const effectiveCost = (!inPlay && !opts.isPreview && S && S[MY_KEY]) ? getEffectiveCostClient(S[MY_KEY], card) : undefined;
  const el = buildNewCardEl(card, size, effectiveCost, {liveStats: inPlay || (!opts.isPreview && !!card.instId)});
  if(card.instId) el.dataset.instid = card.instId;
  // carte à effet continu (aura) : BFX2.syncAuras lui pose un halo bleu quand elle est en jeu
  if(inPlay && (card.abilities||[]).some(a=>a && a.kind==='continuous')) el.classList.add('bfx-aura-card');
  requestAnimationFrame(()=>fitNewCard(el));

  if(opts.attacking) el.classList.add('attacking');
  if(opts.targetable) el.classList.add('targetable');
  const isSick = inPlay && card.summonSick && !card.keywords?.includes('charge');
  if(inPlay && opts.attackSelecting) el.classList.add('attack-selecting');
  if(isSick) el.classList.add('summon-sick');

  const kw = card.keywords || [];
  const hasArmorShield = inPlay && kw.includes('armor') && !card.armorUsed;
  // Même liste que celle comparée par les animations de badges (voir activeBadgeKeywords).
  const activeKeywordIcons = inPlay ? activeBadgeKeywords(card) : [];

  if(isSick){
    const zzz = nEl('div','zzz');
    zzz.innerHTML = '<span>Z</span><span>Z</span><span>Z</span>';
    el.appendChild(zzz);
  }
  if(hasArmorShield){
    const shield = nEl('div','card-armor-shield');
    shield.title = 'Armure';
    el.appendChild(shield);
  }
  if(activeKeywordIcons.length){
    const stack = nEl('div','status-stack-tr');
    activeKeywordIcons.forEach(k=>{
      const img = nImg(`images/${KEYWORD_ICON_FILES[k]}`, 'kw-icon');
      img.title = KEYWORD_LABELS[k]||k;
      img.dataset.kw = k; // repéré par les animations de gain/perte (playKeywordBadgeChanges)
      stack.appendChild(img);
    });
    el.appendChild(stack);
  }

  // Étourdie / gelée : créature grisée + pastille avec infobulle (le
  // serveur lui refuse déjà attaque, blocage et capacités).
  if(inPlay && card.stunned){
    el.classList.add('is-stunned');
    const badge = nEl('div','card-status-badge');
    badge.textContent = '💫';
    badge.title = ('Étourdie : ' + STATUS_DURATION_TEXT + '. ' + statusDurationNote(card, opts.ownerKey, S)).trim();
    el.appendChild(badge);
  } else if(inPlay && card.frozen){
    el.classList.add('is-frozen');
    const badge = nEl('div','card-status-badge');
    badge.textContent = '❄️';
    badge.title = ('Gelée : ' + STATUS_DURATION_TEXT + '. ' + statusDurationNote(card, opts.ownerKey, S)).trim();
    el.appendChild(badge);
  }

  // Indisponible pour l'action en cours (ne peut pas attaquer / bloquer, ou
  // ne peut pas être bloquée par le bloqueur choisi) : atténuée + contour
  // en pointillés + pastille ⛔ (distinct d'étourdie/gelée/malade). Le survol
  // (aperçu) reste actif.
  if(inPlay && opts.unavailableReason){
    el.classList.add('is-unavailable');
    const ub = nEl('div','card-unavailable-badge');
    ub.textContent = '⛔';
    ub.title = opts.unavailableReason.charAt(0).toUpperCase() + opts.unavailableReason.slice(1);
    el.appendChild(ub);
  }

  // survol : aperçu toujours en grande taille, avec le texte complet
  if(!opts.isPreview) attachHoverPreview(el, card, inPlay);

  if(opts.onClick) el.onclick = opts.onClick;
  return el;
}

// Aperçu au survol (toujours n-big, même pour une créature affichée en
// n-small sur le plateau — pour pouvoir lire le texte complet). Pour un
// artefact spécifiquement : léger délai de 1,5s avant l'affichage, plutôt
// qu'immédiat comme pour les autres cartes — annulé proprement si la
// souris quitte avant que ce délai ne soit écoulé.
// Élément survolé qui a déclenché l'aperçu. Quand le plateau est redessiné, la carte survolée est remplacée ou
// déplacée SANS événement « mouseleave » : l'aperçu restait alors affiché pour toujours. Un contrôle régulier
// le masque dès que cet élément n'est plus dans la page ou n'est plus sous la souris.
let __previewSrcEl = null;
setInterval(()=>{
  if(!__previewSrcEl) return;
  const box = document.getElementById('card-preview');
  if(!box || !box.classList.contains('show')){ __previewSrcEl = null; return; }
  if(__previewPinned) return;
  let hov = false;
  try{ hov = __previewSrcEl.isConnected && __previewSrcEl.matches(':hover'); }catch(e){}
  if(!hov){ __previewSrcEl = null; hidePreview(); }
}, 120);
function attachHoverPreview(el, card, inPlay){
  let pendingTimer = null;
  el.addEventListener('mouseenter', (ev)=>{
    if(card.type==='Artefact'){
      const evCopy = { clientX: ev.clientX, clientY: ev.clientY };
      pendingTimer = setTimeout(()=>{
        pendingTimer = null;
        let hov = false; try{ hov = el.isConnected && el.matches(':hover'); }catch(e){}
        if(!hov) return; // la carte a disparu / bougé pendant l'attente
        __previewSrcEl = el;
        showCardPreviewHover(card, evCopy, inPlay);
      }, 1500);
    } else {
      __previewSrcEl = el;
      showCardPreviewHover(card, ev, inPlay);
    }
  });
  el.addEventListener('mousemove', moveHeroPreview);
  el.addEventListener('mouseleave', ()=>{
    if(pendingTimer){ clearTimeout(pendingTimer); pendingTimer = null; }
    hidePreview();
  });
}
let __previewHoverToken = 0;
let __lastPreviewEvent = null;
// `classified` (optionnel, créature en jeu avec carte de base connue) : lignes
// { key, status:'base'|'added'|'lost', source } de classifyKeywordsVsBase.
// Ajouté = vert + « + » et sa source ; perdu = rouge, barré, « perdu ». Les
// mentions sont du TEXTE visible : l'aperçu ne reçoit pas la souris
// (pointer-events:none), une infobulle title ne s'afficherait jamais.
function buildKeywordTooltipCol(card, inPlay, classified){
  const rows = (classified || (card.keywords || []).map(key=>({ key, status:'base', source:null })))
    .filter(r=>KEYWORD_ICON_FILES[r.key] && KEYWORD_DESCRIPTIONS[r.key]
      && (r.status==='lost' || isKeywordActiveNow(r.key, card, inPlay)));
  if(!rows.length) return null;
  const col = document.createElement('div');
  col.className = 'kw-tooltip-col';
  rows.forEach(r=>{
    const k = r.key;
    const item = document.createElement('div');
    item.className = 'kw-tooltip-item' + (r.status==='added' ? ' kw-added' : r.status==='lost' ? ' kw-lost' : '');
    const icon = document.createElement('img');
    icon.className = 'kw-tooltip-icon';
    icon.src = `images/${KEYWORD_ICON_FILES[k]}`;
    const txt = document.createElement('div');
    txt.className = 'kw-tooltip-txt';
    let tag = '';
    if(r.status==='added') tag = ` <span class="kw-tooltip-tag">+ ajouté (${escapeHtmlGS(KEYWORD_SOURCE_LABELS[r.source]||r.source)})</span>`;
    else if(r.status==='lost') tag = ' <span class="kw-tooltip-tag">perdu</span>';
    txt.innerHTML = `<strong>${escapeHtmlGS(KEYWORD_LABELS[k]||k)}</strong>${tag}<br>${escapeHtmlGS(KEYWORD_DESCRIPTIONS[k])}`;
    item.appendChild(icon);
    item.appendChild(txt);
    col.appendChild(item);
  });
  return col;
}

// Carte du catalogue correspondant à cette instance (undefined si le catalogue
// n'est pas encore chargé — chargement en arrière-plan — ou si la carte n'y est
// pas : jeton généré par un effet).
function lookupBaseCard(card){
  const base = (typeof JOURNAL_CARD_LOOKUP!=='undefined' && card && card.id) ? JOURNAL_CARD_LOOKUP[card.id] : undefined;
  return (base && base.type==='Créature') ? base : undefined;
}
// Bloc « Modifications » affiché sous la carte (voir describeCreatureModifications).
function buildPreviewModsEl(mods){
  const box = nEl('div','preview-mods');
  const kwNames = (rs)=>rs.map(r=>escapeHtmlGS(KEYWORD_LABELS[r.key]||r.key) + (r.source ? ` (${escapeHtmlGS(KEYWORD_SOURCE_LABELS[r.source]||r.source)})` : '')).join(', ');
  const lines = [`<div class="preview-mods-title">Modifications</div>`];
  if(mods.silenced) lines.push(`<div class="pm-lost">Réduite au silence : les capacités du texte sont perdues.</div>`);
  if(mods.added.length) lines.push(`<div class="pm-added">+ Mots-clés ajoutés : ${kwNames(mods.added)}</div>`);
  if(mods.lost.length) lines.push(`<div class="pm-lost">Mots-clés perdus : ${kwNames(mods.lost)}</div>`);
  mods.statLines.forEach(t=>lines.push(`<div>${escapeHtmlGS(t)}</div>`));
  if(mods.added.some(r=>r.source==='temp')) lines.push(`<div class="pm-note">Un mot-clé temporaire est retiré au début du prochain tour de son contrôleur.</div>`);
  box.innerHTML = lines.join('');
  return box;
}

// ---- Bascule « voir la base » (touche Maj maintenue, ou bouton en tactile) ----
// L'aperçu agrandi d'une créature en jeu montre ses valeurs ACTUELLES ; la
// bascule affiche la carte telle qu'elle est au catalogue (stats, mots-clés et
// texte d'origine). Le bouton n'existe que sur les appareils sans survol
// ((hover: none), voir CSS) : l'aperçu ne reçoit pas la souris sur ordinateur.
let __previewPinned = false; // aperçu « épinglé » après un appui sur le bouton (tactile)
function setPreviewBaseView(on){
  const box = document.getElementById('card-preview');
  if(box && box.classList.contains('show') && typeof box._setBaseView==='function') box._setBaseView(!!on);
}
window.addEventListener('keydown', ev=>{ if(ev.key==='Shift') setPreviewBaseView(true); });
window.addEventListener('keyup', ev=>{ if(ev.key==='Shift') setPreviewBaseView(false); });
window.addEventListener('blur', ()=>setPreviewBaseView(false));
// Aperçu épinglé : un appui en dehors de lui le referme (sinon il resterait affiché)
document.addEventListener('pointerdown', ev=>{
  if(__previewPinned && !(ev.target.closest && ev.target.closest('#card-preview'))) hidePreview(true);
}, true);

// Branche la bascule sur l'aperçu d'une créature en jeu. `parts` = { col (colonne
// carte), big, modsEl, kwCol } ; le visuel de base est construit à la demande.
function attachBaseViewToggle(box, parts, baseCard, startOnBase){
  let baseBig = null, baseKwCol = null, on = false;
  const tag = nEl('div','preview-base-tag');
  tag.textContent = 'Carte de base (catalogue)';
  tag.style.display = 'none';
  parts.col.insertBefore(tag, parts.col.firstChild);
  const hint = nEl('div','preview-base-hint');
  const btn = nEl('button','preview-base-btn');
  btn.type = 'button';
  hint.innerHTML = '<span class="pbh-key">Maintenir Maj : voir la carte de base</span>';
  hint.appendChild(btn);
  parts.col.appendChild(hint);
  const setView = (wantBase)=>{
    wantBase = !!wantBase;
    if(wantBase === on) return;
    on = wantBase;
    if(on && !baseBig){
      baseBig = buildNewCardEl(baseCard, 'big', undefined, { heroCardFrame:true }); // sans liveStats : valeurs du catalogue
      parts.col.insertBefore(baseBig, parts.big);
      baseKwCol = buildKeywordTooltipCol(baseCard, false);
      if(baseKwCol){ baseKwCol.style.display = 'none'; box.appendChild(baseKwCol); }
    }
    parts.big.style.display = on ? 'none' : '';
    if(parts.modsEl) parts.modsEl.style.display = on ? 'none' : '';
    if(parts.kwCol) parts.kwCol.style.display = on ? 'none' : '';
    if(baseBig) baseBig.style.display = on ? '' : 'none';
    if(baseKwCol) baseKwCol.style.display = on ? '' : 'none';
    tag.style.display = on ? '' : 'none';
    btn.textContent = on ? "Voir l'état actuel" : 'Voir la base';
    if(on && baseBig) requestAnimationFrame(()=>fitNewCard(baseBig)); // mesure impossible tant qu'il était masqué
    if(__lastPreviewEvent) moveHeroPreview(__lastPreviewEvent);
  };
  btn.textContent = 'Voir la base';
  // pointerdown (et non click) : il précède les événements souris qui feraient
  // refermer l'aperçu (mouseleave de la carte) avant le clic.
  btn.addEventListener('pointerdown', ev=>{
    ev.preventDefault();
    __previewPinned = true;
    setView(!on);
  });
  box._setBaseView = setView;
  if(startOnBase) setView(true);
}

function showCardPreviewHover(card, ev, inPlay){
  if(DRAG_STATE) return; // pas d'aperçu pendant qu'on glisse une carte
  const box = document.getElementById('card-preview');
  const myToken = ++__previewHoverToken;
  __lastPreviewEvent = ev;
  __previewPinned = false;
  box._setBaseView = null;
  box.innerHTML = '';
  if(card.type==='Héros'){
    box.classList.add('hero-preview');
    const big = buildNewCardEl(card, 'big', undefined, {heroCardFrame:true, forceHeroText:true});
    box.appendChild(big);
    requestAnimationFrame(()=>fitNewCard(big));
    box.classList.add('show');
    moveHeroPreview(ev);
    // Cartes liées à ce héros — chargées à la demande (pas de catalogue
    // complet préchargé côté client) puis ajoutées à côté une fois prêtes.
    // Si le catalogue est déjà en mémoire (getCatalogOnce), on le filtre au
    // lieu de relire la base à chaque survol de héros (même critère exact que
    // loadCardsLinkedToHero : champ "hero" égal au nom).
    const catalogLoaded = JOURNAL_CARD_LOOKUP && Object.keys(JOURNAL_CARD_LOOKUP).length > 0;
    (catalogLoaded
      ? Promise.resolve(Object.values(JOURNAL_CARD_LOOKUP).filter(c=>c && c.hero === card.name))
      : loadCardsLinkedToHero(card.name)
    ).then(linked=>{
      // La souris a peut-être déjà quitté, ou survolé autre chose entre-
      // temps : on ignore ce résultat périmé plutôt que de l'ajouter au
      // mauvais aperçu.
      if(myToken !== __previewHoverToken) return;
      if(!linked.length) return;
      const col = document.createElement('div');
      col.className = 'hero-preview-linked';
      const title = document.createElement('div');
      title.className = 'hero-preview-linked-title';
      title.textContent = 'Cartes liées';
      col.appendChild(title);
      linked.forEach(lc=>{
        const item = document.createElement('div');
        item.className = 'hero-preview-linked-item';
        item.textContent = lc.name || '';
        col.appendChild(item);
      });
      box.appendChild(col);
      // La boîte vient de s'élargir — on recalcule sa position pour ne pas
      // déborder de l'écran (le premier calcul ne connaissait pas encore
      // la largeur finale, les cartes liées arrivant après coup).
      if(__lastPreviewEvent) moveHeroPreview(__lastPreviewEvent);
    }).catch(()=>{});
  } else if(inPlay && card.type==='Créature'){
    // Créature EN JEU (et seulement elle) : valeurs actuelles, écarts avec la
    // carte de base en couleur, bloc « Modifications », bascule « voir la base ».
    // Main, marché, deckbuilder, artefacts : chemin inchangé ci-dessous.
    box.classList.remove('hero-preview');
    const baseCard = lookupBaseCard(card);
    const mods = describeCreatureModifications(card, baseCard, S && S.turn);
    const col = nEl('div','preview-card-col');
    const big = buildNewCardEl(card, 'big', undefined, {heroCardFrame:true, liveStats:true});
    if(mods.silenced){
      // Le texte affiché est celui du catalogue (jamais modifié) : on l'atténue
      // et on l'estampille pour ne pas laisser croire que ces capacités agissent encore.
      big.classList.add('n-text-lost');
      const stamp = nEl('div','n-text-lost-stamp');
      stamp.innerHTML = '<span>Capacités perdues</span>';
      big.appendChild(stamp);
    }
    col.appendChild(big);
    const modsEl = mods.hasChanges ? buildPreviewModsEl(mods) : null;
    if(modsEl) col.appendChild(modsEl);
    box.appendChild(col);
    requestAnimationFrame(()=>fitNewCard(big));
    const kwCol = buildKeywordTooltipCol(card, true, mods.rows);
    if(kwCol) box.appendChild(kwCol);
    if(baseCard) attachBaseViewToggle(box, { col, big, modsEl, kwCol }, baseCard, !!(ev && ev.shiftKey));
    box.classList.add('show');
    moveHeroPreview(ev);
  } else {
    box.classList.remove('hero-preview');
    const big = buildNewCardEl(card, 'big', undefined, {heroCardFrame:true, liveStats: !!inPlay});
    box.appendChild(big);
    requestAnimationFrame(()=>fitNewCard(big));
    // Bulles contextuelles : une par mot-clé actuellement actif sur la
    // créature, affichées à côté de l'aperçu agrandi.
    const kwCol = buildKeywordTooltipCol(card, inPlay);
    if(kwCol) box.appendChild(kwCol);
    box.classList.add('show');
    moveHeroPreview(ev);
  }
}

