/* Mini-jeux pour patienter pendant la recherche d'un adversaire.
 *   SCMini.start(conteneur)  → affiche les mini-jeux dans le conteneur
 *   SCMini.stop()            → arrête tout (minuteurs, clavier) et vide le conteneur
 * Jeux : « Serpent des sources » (flèches / ZQSD / balayage), « Mémoire des sources » (clic)
 * et « Fusion » (façon Suika, avec les icônes de mots-clés).
 * Les gemmes sont les fragments des six sources (images/gem-*.png, teintées comme dans la boutique). */
(function(){
  'use strict';

  var GEMS = [
    { key:'aube',      name:'Diamant',    img:'images/gem-aub.png',  color:'#d4af37' },
    { key:'crepuscule',name:'Obsidienne', img:'images/gem-crep.png', color:'#8a5cf0' },
    { key:'volonte',   name:'Rubis',      img:'images/gem-vol.png',  color:'#c23b3b' },
    { key:'prima',     name:'Émeraude',   img:'images/gem-prim.png', color:'#3fae5c' },
    { key:'arcane',    name:'Saphir',     img:'images/gem-arc.png',  color:'#5b9bd5' },
    { key:'opale',     name:'Opale',      img:'images/gem-multi.png',color:'#e8a6d8', raw:true }
  ];

  // --- images teintées (une fois) ---
  var SPRITES = {};          // key -> canvas 64x64
  var spritesReady = false, spritesLoading = false, spriteWaiters = [];
  function loadSprites(cb){
    if(spritesReady) return cb();
    spriteWaiters.push(cb);
    if(spritesLoading) return;
    spritesLoading = true;
    var left = GEMS.length;
    GEMS.forEach(function(g){
      var im = new Image();
      var done = function(ok){
        var c = document.createElement('canvas'); c.width = c.height = 64;
        var x = c.getContext('2d');
        if(ok){
          if(g.raw){ x.drawImage(im, 0, 0, 64, 64); }
          else {
            x.drawImage(im, 0, 0, 64, 64);
            x.globalCompositeOperation = 'source-in';
            x.fillStyle = g.color; x.fillRect(0, 0, 64, 64);
          }
        } else { // image introuvable : losange de la bonne couleur
          x.fillStyle = g.color; x.beginPath();
          x.moveTo(32,4); x.lineTo(58,32); x.lineTo(32,60); x.lineTo(6,32); x.closePath(); x.fill();
        }
        SPRITES[g.key] = c;
        if(--left === 0){ spritesReady = true; var w = spriteWaiters; spriteWaiters = []; w.forEach(function(f){ f(); }); }
      };
      im.onload = function(){ done(true); };
      im.onerror = function(){ done(false); };
      im.src = g.img;
    });
  }

  function store(k, v){ try{ if(v === undefined) return parseInt(localStorage.getItem(k) || '0', 10) || 0; localStorage.setItem(k, String(v)); }catch(e){ return 0; } }

  var root = null, current = null, tabBtns = {}, bodyEl = null, scoreEl = null, bestEl = null, hintEl = null;
  var keyHandler = null, resizeHandler = null, active = false;

  function sizeForBoard(){
    var w = (window.innerWidth || 360) - 40, h = (window.innerHeight || 600) - 360;
    return Math.max(200, Math.min(340, w, h));
  }

  // ====================== SERPENT ======================
  function SnakeGame(host){
    var N = 18, size = sizeForBoard(), cell = Math.floor(size / N); size = cell * N;
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    cv.style.cssText = 'display:block;margin:0 auto;border:1.5px solid var(--line,#444);border-radius:10px;background:#0d0b14;max-width:100%;touch-action:none;';
    host.appendChild(cv);
    var ctx = cv.getContext('2d');
    var snake, dir, nextDir, food, curColor, score, timer, speed, over, started, growing;

    function rndFood(){
      for(var t = 0; t < 400; t++){
        var f = { x:(Math.random()*N)|0, y:(Math.random()*N)|0, g:GEMS[(Math.random()*GEMS.length)|0] };
        if(!snake.some(function(s){ return s.x === f.x && s.y === f.y; })) return f;
      }
      return null;
    }
    function reset(){
      var mid = (N/2)|0;
      curColor = '#e8d9a8';
      snake = [ {x:mid,y:mid,c:curColor}, {x:mid-1,y:mid,c:curColor}, {x:mid-2,y:mid,c:curColor} ];
      dir = {x:1,y:0}; nextDir = dir; score = 0; speed = 150; over = false; started = false; growing = 0;
      food = rndFood(); setScore(0, bestKey());
      hint('Appuie sur une flèche pour commencer');
      draw();
    }
    function bestKey(){ return store('sc_mini_snake_best'); }
    function setScore(s, b){ if(scoreEl) scoreEl.textContent = 'Score : ' + s; if(bestEl) bestEl.textContent = 'Meilleur : ' + b; }
    function hint(t){ if(hintEl) hintEl.textContent = t; }
    function loop(){ clearTimeout(timer); if(over || !active) return; timer = setTimeout(function(){ step(); loop(); }, speed); }

    function step(){
      dir = nextDir;
      var h = snake[0], nx = h.x + dir.x, ny = h.y + dir.y;
      if(nx < 0 || ny < 0 || nx >= N || ny >= N) return die();
      var willGrow = growing > 0 || (food && nx === food.x && ny === food.y);
      var body = willGrow ? snake : snake.slice(0, -1);
      if(body.some(function(s){ return s.x === nx && s.y === ny; })) return die();
      if(food && nx === food.x && ny === food.y){
        curColor = food.g.color; score += 1; growing += 1;
        if(score > bestKey()) store('sc_mini_snake_best', score);
        setScore(score, bestKey());
        speed = Math.max(70, 150 - score * 3);
        snake.unshift({ x:nx, y:ny, c:curColor });
        growing -= 1;
        food = rndFood();
        if(!food) return die(true);
      } else {
        snake.unshift({ x:nx, y:ny, c:curColor });
        snake.pop();
      }
      draw();
    }
    function die(won){
      over = true; clearTimeout(timer); draw();
      ctx.fillStyle = 'rgba(8,6,14,.72)'; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#d4af37'; ctx.textAlign = 'center';
      ctx.font = '700 ' + Math.round(size/11) + 'px Cinzel, serif';
      ctx.fillText(won ? 'Plateau complet !' : 'Perdu !', size/2, size/2 - 6);
      ctx.fillStyle = '#e8e0d0'; ctx.font = Math.round(size/22) + 'px Inter, sans-serif';
      ctx.fillText('Score ' + score + ' — Entrée ou clic pour rejouer', size/2, size/2 + size/12);
    }
    function draw(){
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#0d0b14'; ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
      for(var i = 1; i < N; i++){
        ctx.beginPath(); ctx.moveTo(i*cell, 0); ctx.lineTo(i*cell, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*cell); ctx.lineTo(size, i*cell); ctx.stroke();
      }
      if(food){
        var sp = SPRITES[food.g.key];
        if(sp){ var gs = cell * 1.7; ctx.drawImage(sp, food.x*cell + cell/2 - gs/2, food.y*cell + cell/2 - gs/2, gs, gs); }
      }
      for(var k = snake.length - 1; k >= 0; k--){
        var s = snake[k], pad = k === 0 ? 0 : 1;
        ctx.fillStyle = s.c;
        ctx.globalAlpha = k === 0 ? 1 : 0.88;
        roundRect(ctx, s.x*cell + pad, s.y*cell + pad, cell - pad*2, cell - pad*2, cell/4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      var hd = snake[0]; // yeux
      ctx.fillStyle = '#0d0b14';
      var ex = dir.x, ey = dir.y, ox = hd.x*cell + cell/2, oy = hd.y*cell + cell/2, e = cell/5;
      var px = -ey, py = ex;
      ctx.beginPath(); ctx.arc(ox + ex*e + px*e, oy + ey*e + py*e, cell/10 + .5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(ox + ex*e - px*e, oy + ey*e - py*e, cell/10 + .5, 0, 7); ctx.fill();
    }
    function roundRect(c, x, y, w, h, r){
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function turn(dx, dy){
      if(over) return;
      if(dx === -dir.x && dy === -dir.y && snake.length > 1) return; // pas de demi-tour
      nextDir = { x:dx, y:dy };
      if(!started){ started = true; hint('Mange les fragments de gemme : le serpent prend leur couleur'); loop(); }
    }
    var KEYS = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0], w:[0,-1], s:[0,1], a:[-1,0], d:[1,0], z:[0,-1], q:[-1,0], W:[0,-1], S:[0,1], A:[-1,0], D:[1,0], Z:[0,-1], Q:[-1,0] };
    function onKey(e){
      var m = KEYS[e.key];
      if(m){ e.preventDefault(); turn(m[0], m[1]); return; }
      if(over && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); reset(); }
    }
    cv.addEventListener('click', function(){ if(over) reset(); });
    var tx = 0, ty = 0;
    cv.addEventListener('touchstart', function(e){ var t = e.touches[0]; tx = t.clientX; ty = t.clientY; if(over) reset(); }, { passive:true });
    cv.addEventListener('touchend', function(e){
      var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if(Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
    }, { passive:true });
    reset();
    return { onKey:onKey, destroy:function(){ over = true; clearTimeout(timer); }, restartIfOver:function(){ } };
  }

  // ====================== MÉMOIRE ======================
  function MemoryGame(host){
    var size = sizeForBoard();
    var grid = document.createElement('div');
    var cols = 4, gap = 8, tile = Math.floor((size - gap*(cols-1)) / cols);
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(' + cols + ',' + tile + 'px);gap:' + gap + 'px;justify-content:center;margin:0 auto;';
    host.appendChild(grid);
    var tiles, first, lock, moves, found, t0, tickTimer, finished;

    function shuffle(a){ for(var i = a.length - 1; i > 0; i--){ var j = (Math.random()*(i+1))|0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function best(){ return store('sc_mini_memory_best'); }
    function reset(){
      clearInterval(tickTimer);
      grid.innerHTML = ''; first = null; lock = false; moves = 0; found = 0; t0 = 0; finished = false;
      var deck = shuffle(GEMS.concat(GEMS).map(function(g){ return g; }));
      tiles = deck.map(function(g, i){
        var b = document.createElement('button');
        b.type = 'button';
        b.style.cssText = 'width:' + tile + 'px;height:' + tile + 'px;border-radius:10px;border:1.5px solid var(--line,#444);background:linear-gradient(160deg,#2a2140,#14101f);color:#d4af37;font-size:' + Math.round(tile/2.2) + 'px;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;transition:transform .15s;';
        b.textContent = '✦';
        var tl = { el:b, g:g, open:false, done:false };
        b.onclick = function(){ flip(tl); };
        grid.appendChild(b);
        return tl;
      });
      setStats(); hint('Retrouve les paires de gemmes');
    }
    function show(tl, on){
      tl.open = on; tl.el.textContent = ''; tl.el.style.background = on ? '#171226' : 'linear-gradient(160deg,#2a2140,#14101f)';
      tl.el.style.borderColor = on ? tl.g.color : '';
      if(on){ var c = SPRITES[tl.g.key]; if(c){ var i = document.createElement('canvas'); i.width = i.height = 64; i.getContext('2d').drawImage(c, 0, 0); i.style.cssText = 'width:70%;height:70%;'; tl.el.appendChild(i); } else tl.el.textContent = tl.g.name[0]; }
      else tl.el.textContent = '✦';
    }
    function setStats(){
      var sec = t0 ? Math.floor((Date.now() - t0)/1000) : 0;
      if(scoreEl) scoreEl.textContent = 'Coups : ' + moves + ' · ' + sec + ' s';
      if(bestEl) bestEl.textContent = best() ? 'Meilleur : ' + best() + ' coups' : 'Meilleur : –';
    }
    function flip(tl){
      if(lock || tl.open || tl.done || finished) return;
      if(!t0){ t0 = Date.now(); tickTimer = setInterval(function(){ if(!finished) setStats(); }, 500); }
      show(tl, true);
      if(!first){ first = tl; return; }
      moves++;
      var a = first; first = null;
      if(a.g.key === tl.g.key){
        a.done = tl.done = true; found++;
        a.el.style.boxShadow = tl.el.style.boxShadow = '0 0 10px ' + tl.g.color;
        if(found === GEMS.length){
          finished = true; clearInterval(tickTimer);
          if(!best() || moves < best()) store('sc_mini_memory_best', moves);
          hint('Bravo ! ' + moves + ' coups. Clique ici pour rejouer.');
          hintEl.style.cursor = 'pointer'; hintEl.onclick = function(){ hintEl.onclick = null; hintEl.style.cursor = ''; reset(); };
        }
      } else {
        lock = true;
        setTimeout(function(){ show(a, false); show(tl, false); lock = false; }, 650);
      }
      setStats();
    }
    function hint(t){ if(hintEl) hintEl.textContent = t; }
    reset();
    return { onKey:function(e){ if(finished && e.key === 'Enter'){ reset(); } }, destroy:function(){ clearInterval(tickTimer); } };
  }

  // ====================== FUSION (façon Suika) ======================
  // 11 mots-clés, du plus petit au plus gros : deux icônes identiques qui se touchent fusionnent en la suivante.
  var KW_CHAIN = ['fugace','peureux','discret','charge','portee','vol','initiative','toxique','brutalite','armure','tenace'];
  var KW_LABEL = ['Fugace','Peureux','Discret','Charge','Portée','Vol','Initiative','Toxique','Brutalité','Armure','Tenace'];
  var KW_IMG = {}, kwReady = false, kwLoading = false, kwWaiters = [];
  function loadKw(cb){
    if(kwReady) return cb();
    kwWaiters.push(cb);
    if(kwLoading) return;
    kwLoading = true;
    var left = KW_CHAIN.length;
    KW_CHAIN.forEach(function(k){
      var im = new Image();
      var fin = function(){ KW_IMG[k] = im; if(--left === 0){ kwReady = true; var w = kwWaiters; kwWaiters = []; w.forEach(function(f){ f(); }); } };
      im.onload = fin; im.onerror = function(){ im = null; KW_IMG[k] = null; if(--left === 0){ kwReady = true; var w = kwWaiters; kwWaiters = []; w.forEach(function(f){ f(); }); } };
      im.src = 'images/kw-' + k + '.png';
    });
  }
  var KW_COLORS = ['#5aa2e0','#c9955a','#3a4a73','#d8661e','#4aa63a','#e7dcc0','#8a3aa8','#8cc22a','#b52a2a','#4f7fa8','#b58090'];

  function FusionGame(host){
    var W = 300, H = 400, LINE = 64, G = 1100;
    var RAD = [13,18,23,29,36,43,51,60,70,80,92];
    var wpx = Math.max(220, Math.min(300, (window.innerWidth || 360) - 48)), k = wpx / W, hpx = Math.round(H * k);
    var cv = document.createElement('canvas'); cv.width = wpx; cv.height = hpx;
    cv.style.cssText = 'display:block;margin:0 auto;border:1.5px solid var(--line,#444);border-radius:10px;background:#0d0b14;max-width:100%;touch-action:none;cursor:crosshair;';
    host.appendChild(cv);
    var chain = document.createElement('div');
    chain.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:2px;margin-top:8px;flex-wrap:wrap;';
    KW_CHAIN.forEach(function(kw, i){
      var im = document.createElement('img'); im.src = 'images/kw-' + kw + '.png'; im.title = KW_LABEL[i]; im.alt = KW_LABEL[i];
      im.style.cssText = 'width:' + (14 + i*1.6) + 'px;height:' + (14 + i*1.6) + 'px;';
      chain.appendChild(im);
      if(i < KW_CHAIN.length - 1){ var ar = document.createElement('span'); ar.textContent = '›'; ar.style.cssText = 'color:var(--parchment-dim,#aaa);font-size:11px;'; chain.appendChild(ar); }
    });
    host.appendChild(chain);
    var ctx = cv.getContext('2d');
    var balls, effects, aimX, cur, next, cool, score, over, danger, raf, last, nid;

    function rndLevel(){ return (Math.random() * 5) | 0; }
    function best(){ return store('sc_mini_fusion_best'); }
    function setScore(){ if(scoreEl) scoreEl.textContent = 'Score : ' + score; if(bestEl) bestEl.textContent = 'Meilleur : ' + best(); }
    function hint(t){ if(hintEl) hintEl.textContent = t; }
    function reset(){
      balls = []; effects = []; aimX = W/2; cur = rndLevel(); next = rndLevel(); cool = 0; score = 0; over = false; danger = 0; nid = 1; last = 0;
      setScore(); hint('Souris, ← → ou doigt pour viser · clic, Espace ou ↓ pour lâcher');
    }
    function clampAim(){ var r = RAD[cur]; aimX = Math.max(r, Math.min(W - r, aimX)); }
    function drop(){
      if(over || cool > 0) return;
      clampAim();
      balls.push({ id:nid++, x:aimX, y:RAD[cur] + 6, vx:0, vy:0, l:cur, age:0 });
      cur = next; next = rndLevel(); cool = 0.55;
    }
    function merge(a, b){
      var l = a.l;
      effects.push({ x:(a.x + b.x)/2, y:(a.y + b.y)/2, r:RAD[l], t:0, c:KW_COLORS[l] });
      balls.splice(balls.indexOf(a), 1); balls.splice(balls.indexOf(b), 1);
      if(l === RAD.length - 1){ score += 200; }
      else {
        balls.push({ id:nid++, x:(a.x + b.x)/2, y:(a.y + b.y)/2, vx:(a.vx + b.vx)/2, vy:(a.vy + b.vy)/2, l:l + 1, age:0.5 });
        score += (l + 1) * (l + 2) / 2 * 2;
      }
      if(score > best()) store('sc_mini_fusion_best', score);
      setScore();
    }
    function physics(dt){
      var i, j, a, b;
      for(i = 0; i < balls.length; i++){ a = balls[i]; a.vy += G * dt; a.x += a.vx * dt; a.y += a.vy * dt; a.age += dt; }
      for(var it = 0; it < 5; it++){
        for(i = 0; i < balls.length; i++){
          a = balls[i]; var r = RAD[a.l];
          if(a.x < r){ a.x = r; if(a.vx < 0) a.vx *= -0.1; }
          if(a.x > W - r){ a.x = W - r; if(a.vx > 0) a.vx *= -0.1; }
          if(a.y > H - r){ a.y = H - r; if(a.vy > 0) a.vy *= -0.1; a.vx *= 0.985; }
        }
        for(i = 0; i < balls.length; i++){
          for(j = i + 1; j < balls.length; j++){
            a = balls[i]; b = balls[j];
            var dx = b.x - a.x, dy = b.y - a.y, min = RAD[a.l] + RAD[b.l];
            if(Math.abs(dx) > min || Math.abs(dy) > min) continue;
            var d2 = dx*dx + dy*dy;
            if(d2 >= min*min) continue;
            var d = Math.sqrt(d2) || 0.0001, nx = dx / d, ny = dy / d, ov = min - d;
            var ma = RAD[a.l] * RAD[a.l], mb = RAD[b.l] * RAD[b.l], tm = ma + mb;
            a.x -= nx * ov * mb / tm; a.y -= ny * ov * mb / tm;
            b.x += nx * ov * ma / tm; b.y += ny * ov * ma / tm;
            if(it === 0){
              var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if(vn < 0){
                var jn = -(1.05) * vn / (1/ma + 1/mb);
                a.vx -= jn * nx / ma; a.vy -= jn * ny / ma; b.vx += jn * nx / mb; b.vy += jn * ny / mb;
              }
              a.vx *= 0.995; a.vy *= 0.995; b.vx *= 0.995; b.vy *= 0.995; // frottement de contact
            }
          }
        }
      }
      // fusions
      var done = true, guard = 0;
      while(done && guard++ < 20){
        done = false;
        for(i = 0; i < balls.length && !done; i++){
          for(j = i + 1; j < balls.length; j++){
            a = balls[i]; b = balls[j];
            if(a.l !== b.l) continue;
            var ddx = b.x - a.x, ddy = b.y - a.y, mm = RAD[a.l] + RAD[b.l] + 1.5;
            if(ddx*ddx + ddy*ddy <= mm*mm){ merge(a, b); done = true; break; }
          }
        }
      }
    }
    function checkOver(dt){
      var risk = false;
      balls.forEach(function(b){
        if(b.age > 1.2 && b.y - RAD[b.l] < LINE && Math.abs(b.vy) < 60) risk = true;
      });
      danger = risk ? danger + dt : Math.max(0, danger - dt * 2);
      if(danger > 2.2){ over = true; hint('Perdu ! Entrée ou clic pour rejouer'); }
    }
    function drawBall(x, y, l, alpha){
      var r = RAD[l], im = KW_IMG[KW_CHAIN[l]];
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      if(im){ var sz = r * 2.5; ctx.drawImage(im, x - sz/2, y - sz/2, sz, sz); }
      else { ctx.fillStyle = KW_COLORS[l]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    function draw(){
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d0b14'; ctx.fillRect(0, 0, W, H);
      // ligne de danger
      ctx.strokeStyle = danger > 0 ? 'rgba(224,88,79,' + (0.4 + Math.min(.5, danger/3)) + ')' : 'rgba(212,175,55,.35)';
      ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, LINE); ctx.lineTo(W, LINE); ctx.stroke(); ctx.setLineDash([]);
      balls.forEach(function(b){ drawBall(b.x, b.y, b.l); });
      effects.forEach(function(e){
        var p = e.t / 0.35; ctx.strokeStyle = e.c; ctx.globalAlpha = Math.max(0, 1 - p); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 + p * 0.5), 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      });
      if(!over){
        clampAim();
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(aimX, RAD[cur] + 6); ctx.lineTo(aimX, H); ctx.stroke(); ctx.setLineDash([]);
        drawBall(aimX, RAD[cur] + 6, cur, cool > 0 ? 0.35 : 1);
      }
      // prochaine pièce
      ctx.fillStyle = 'rgba(232,224,208,.6)'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('Suivante', W - 8, 14);
      drawBall(W - 22, 38, next, 1);
      if(over){
        ctx.fillStyle = 'rgba(8,6,14,.75)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#d4af37'; ctx.textAlign = 'center'; ctx.font = '700 28px Cinzel, serif';
        ctx.fillText('Perdu !', W/2, H/2 - 6);
        ctx.fillStyle = '#e8e0d0'; ctx.font = '13px Inter, sans-serif';
        ctx.fillText('Score ' + score + ' — Entrée ou clic pour rejouer', W/2, H/2 + 20);
      }
    }
    function frame(ts){
      if(!active) return;
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if(!over){
        if(cool > 0) cool = Math.max(0, cool - dt);
        var n = Math.max(1, Math.ceil(dt / (1/120))), h = dt / n;
        for(var i = 0; i < n; i++) physics(h);
        effects.forEach(function(e){ e.t += dt; });
        effects = effects.filter(function(e){ return e.t < 0.35; });
        checkOver(dt);
      }
      draw();
    }
    function aimFrom(clientX){
      var rc = cv.getBoundingClientRect();
      aimX = (clientX - rc.left) / rc.width * W;
    }
    cv.addEventListener('mousemove', function(e){ aimFrom(e.clientX); });
    cv.addEventListener('click', function(e){ if(over){ reset(); return; } aimFrom(e.clientX); drop(); });
    cv.addEventListener('touchstart', function(e){ if(over){ reset(); return; } aimFrom(e.touches[0].clientX); }, { passive:true });
    cv.addEventListener('touchmove', function(e){ aimFrom(e.touches[0].clientX); }, { passive:true });
    cv.addEventListener('touchend', function(e){ if(!over) drop(); e.preventDefault(); });
    function onKey(e){
      if(e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'a'){ e.preventDefault(); aimX -= 14; }
      else if(e.key === 'ArrowRight' || e.key === 'd'){ e.preventDefault(); aimX += 14; }
      else if(e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter'){ e.preventDefault(); if(over) reset(); else drop(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); }
    }
    reset();
    loadKw(function(){ if(active) raf = requestAnimationFrame(frame); });
    return { onKey:onKey, destroy:function(){ cancelAnimationFrame(raf); over = true; },
             _debug:function(){ return { balls:balls, drop:drop, setAim:function(x){ aimX = x; }, state:function(){ return { over:over, score:score }; }, force:function(l){ cur = l; } }; } };
  }

  // ====================== PANNEAU ======================
  var GAMES = { snake:{ label:'🐍 Serpent', make:SnakeGame }, memory:{ label:'🃏 Mémoire', make:MemoryGame }, fusion:{ label:'🔶 Fusion', make:FusionGame } };

  function select(name){
    if(current && current.destroy) current.destroy();
    current = null; bodyEl.innerHTML = '';
    Object.keys(tabBtns).forEach(function(k){
      var on = k === name;
      tabBtns[k].style.borderColor = on ? '#d4af37' : 'var(--line,#444)';
      tabBtns[k].style.color = on ? '#d4af37' : 'var(--parchment,#e8e0d0)';
    });
    loadSprites(function(){
      if(!active) return;
      current = GAMES[name].make(bodyEl);
      try{ localStorage.setItem('sc_mini_last_game', name); }catch(e){}
    });
  }

  function start(container){
    stop();
    if(!container) return;
    active = true; root = container;
    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:14px;padding:12px;border:1px solid var(--line,#444);border-radius:12px;background:rgba(20,16,31,.7);max-width:100%;';
    var tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:8px;';
    Object.keys(GAMES).forEach(function(k){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = GAMES[k].label;
      b.style.cssText = 'background:transparent;border:1.5px solid var(--line,#444);border-radius:8px;padding:6px 12px;font-size:12.5px;cursor:pointer;font-family:inherit;';
      b.onclick = function(){ select(k); };
      tabBtns[k] = b; tabs.appendChild(b);
    });
    var stats = document.createElement('div');
    stats.style.cssText = 'display:flex;justify-content:space-between;font-size:12px;color:var(--parchment-dim,#aaa);margin:2px 4px 8px;';
    scoreEl = document.createElement('span'); bestEl = document.createElement('span');
    stats.appendChild(scoreEl); stats.appendChild(bestEl);
    bodyEl = document.createElement('div');
    hintEl = document.createElement('div');
    hintEl.style.cssText = 'font-size:11.5px;color:var(--parchment-dim,#aaa);margin-top:8px;text-align:center;min-height:15px;';
    wrap.appendChild(tabs); wrap.appendChild(stats); wrap.appendChild(bodyEl); wrap.appendChild(hintEl);
    root.appendChild(wrap);

    keyHandler = function(e){ if(active && current && current.onKey) current.onKey(e); };
    document.addEventListener('keydown', keyHandler);
    var last = 'snake'; try{ last = localStorage.getItem('sc_mini_last_game') || 'snake'; }catch(e){}
    select(GAMES[last] ? last : 'snake');
  }

  function stop(){
    active = false;
    if(keyHandler){ document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if(current && current.destroy) current.destroy();
    current = null;
    if(root){ root.innerHTML = ''; root = null; }
    tabBtns = {}; bodyEl = scoreEl = bestEl = hintEl = null;
  }

  window.SCMini = { start:start, stop:stop, _cur:function(){ return current; } };
})();
