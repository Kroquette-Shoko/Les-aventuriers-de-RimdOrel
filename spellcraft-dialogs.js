/* ============================================================
   spellcraft-dialogs.js — boîtes de dialogue du site
   ------------------------------------------------------------
   Remplace alert() / confirm() / prompt() du navigateur, que les
   navigateurs (ou les joueurs) peuvent bloquer, ce qui figerait le site.

     await scAlert('Message')                       → rien
     await scConfirm('Question ?', {danger:true})   → true / false
     await scPrompt('Nom :', 'valeur par défaut')   → texte, ou null si annulé

   Options : { title, okText, cancelText, danger }
   window.alert est redirigé vers scAlert (sans attente : alert ne renvoie rien).
   confirm() et prompt() ne peuvent pas être remplacés « en place » (ils sont
   synchrones) : les appels doivent utiliser await scConfirm / await scPrompt.
   Les jetons de couleur viennent de spellcraft-ui-kit.css (avec valeurs de repli).
   ============================================================ */
(function(){
  if(window.scConfirm) return;
  var queue = [], showing = false, root = null, lastFocus = null;

  var CSS = ''
  + '#sc-dlg-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,4,10,.78);}'
  + '#sc-dlg-overlay[hidden]{display:none;}'
  + '#sc-dlg{width:min(440px,100%);max-height:86vh;overflow:auto;background:var(--bg-panel,#17142a);color:var(--parchment,#f2ead2);border:1.5px solid var(--gold,#d4af37);border-radius:14px;padding:22px 22px 18px;box-shadow:0 18px 50px rgba(0,0,0,.7);font-family:Inter,system-ui,sans-serif;}'
  + '#sc-dlg.danger{border-color:var(--blood,#c23b3b);}'
  + '#sc-dlg h2{margin:0 0 10px;font-family:Cinzel,serif;font-size:20px;color:var(--gold,#d4af37);}'
  + '#sc-dlg.danger h2{color:var(--blood,#e06666);}'
  + '#sc-dlg .sc-dlg-msg{font-size:16px;line-height:1.55;white-space:pre-wrap;margin:0 0 16px;}'
  + '#sc-dlg input{width:100%;box-sizing:border-box;margin:0 0 16px;padding:10px 12px;font-size:16px;border-radius:8px;border:1px solid var(--line,#3a3560);background:var(--bg-void,#0c0a18);color:inherit;font-family:inherit;}'
  + '#sc-dlg input:focus{outline:2px solid var(--gold,#d4af37);outline-offset:1px;}'
  + '#sc-dlg .sc-dlg-btns{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;}'
  + '#sc-dlg button{font-family:inherit;font-size:16px;font-weight:600;padding:10px 20px;border-radius:9px;cursor:pointer;border:1.5px solid var(--line,#3a3560);background:var(--bg-panel-3,#231f3d);color:inherit;}'
  + '#sc-dlg button:hover{border-color:var(--gold,#d4af37);}'
  + '#sc-dlg button.sc-ok{background:linear-gradient(180deg,var(--arcane,#6b4fe0),#4a35b0);border-color:transparent;color:#fff;}'
  + '#sc-dlg.danger button.sc-ok{background:linear-gradient(180deg,#c94a4a,#8f2a2a);}'
  + '#sc-dlg button:focus-visible{outline:2px solid var(--gold,#d4af37);outline-offset:2px;}';

  function ensureRoot(){
    if(root && root.isConnected) return root;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'sc-dlg-overlay'; root.hidden = true;
    root.setAttribute('role', 'presentation');
    document.body.appendChild(root);
    return root;
  }

  function next(){
    if(showing || !queue.length) return;
    showing = true;
    var d = queue.shift();
    var ov = ensureRoot();
    lastFocus = document.activeElement;
    ov.innerHTML = '';
    var box = document.createElement('div');
    box.id = 'sc-dlg';
    box.setAttribute('role', d.kind === 'alert' ? 'alertdialog' : 'dialog');
    box.setAttribute('aria-modal', 'true');
    if(d.danger) box.className = 'danger';
    var h = document.createElement('h2'); h.textContent = d.title; box.appendChild(h);
    var m = document.createElement('p'); m.className = 'sc-dlg-msg'; m.textContent = d.message; box.appendChild(m);
    var inp = null;
    if(d.kind === 'prompt'){
      inp = document.createElement('input'); inp.type = 'text'; inp.value = d.value || ''; box.appendChild(inp);
    }
    var row = document.createElement('div'); row.className = 'sc-dlg-btns';
    var cancel = null, ok = document.createElement('button');
    ok.type = 'button'; ok.className = 'sc-ok'; ok.textContent = d.okText;
    if(d.kind !== 'alert'){
      cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = d.cancelText;
      row.appendChild(cancel);
    }
    row.appendChild(ok);
    box.appendChild(row);
    ov.appendChild(box);
    ov.hidden = false;

    var done = false;
    function close(result){
      if(done) return; done = true;
      document.removeEventListener('keydown', onKey, true);
      ov.hidden = true; ov.innerHTML = '';
      showing = false;
      try{ if(lastFocus && lastFocus.focus) lastFocus.focus(); }catch(e){}
      d.resolve(result);
      next();
    }
    function onKey(e){
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(d.kind === 'confirm' ? false : d.kind === 'prompt' ? null : undefined); }
      else if(e.key === 'Enter' && (d.kind === 'prompt' || document.activeElement !== cancel)){ e.preventDefault(); e.stopPropagation(); ok.click(); }
      else if(e.key === 'Tab'){
        var f = box.querySelectorAll('button,input'); if(!f.length) return;
        var first = f[0], last = f[f.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    ok.onclick = function(){ close(d.kind === 'confirm' ? true : d.kind === 'prompt' ? inp.value : undefined); };
    if(cancel) cancel.onclick = function(){ close(d.kind === 'confirm' ? false : null); };
    ov.onmousedown = function(e){ if(e.target === ov && d.kind !== 'alert') close(d.kind === 'confirm' ? false : null); };
    setTimeout(function(){ (inp || (d.danger && cancel) || ok).focus(); if(inp) inp.select(); }, 0);
  }

  function open(kind, message, opts, value){
    opts = opts || {};
    return new Promise(function(resolve){
      queue.push({
        kind: kind, message: String(message == null ? '' : message), value: value, resolve: resolve,
        title: opts.title || (kind === 'confirm' ? 'Confirmation' : kind === 'prompt' ? 'Saisie' : 'Information'),
        okText: opts.okText || (kind === 'confirm' ? 'Confirmer' : 'OK'),
        cancelText: opts.cancelText || 'Annuler',
        danger: !!opts.danger
      });
      if(document.body) next(); else document.addEventListener('DOMContentLoaded', next);
    });
  }

  window.scAlert = function(message, opts){ return open('alert', message, opts); };
  window.scConfirm = function(message, opts){ return open('confirm', message, opts); };
  window.scPrompt = function(message, value, opts){ return open('prompt', message, opts, value); };
  window.alert = function(message){ open('alert', message); };
})();
