/* ============================================================
   SPELLCRAFT — AUTHENTIFICATION (Supabase)
   ============================================================
   Chargé par les quatre pages, après spellcraft-shared.js ET après
   la librairie officielle Supabase :

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="spellcraft-shared.js"></script>
   <script src="spellcraft-auth.js"></script>

   Fournit :
   - le client Supabase (sb)
   - scSignUp / scSignIn / scSignOut / scGetCurrentUser / scGetProfile
   - un petit widget de compte (coin supérieur droit) + une modale
     de connexion/inscription, à afficher en appelant initSpellcraftAuth()
     une fois le DOM prêt.
   ============================================================ */

const SUPABASE_URL = 'https://jzjhfxaibqqhzgkdyrdn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6amhmeGFpYnFxaHpna2R5cmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzE1MDMsImV4cCI6MjA5OTk0NzUwM30.nlEHxKxeOvCe8RjIiIuC9RcfeqyzB5hYqJSttfWMc-A';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   FONCTIONS D'AUTHENTIFICATION
   ============================================================ */
async function scSignUp(email, password, username){
  if(!username || !username.trim()) return { error: "Choisis un nom d'utilisateur." };
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { username: username.trim() } }
  });
  if(error) return { error: error.message };
  // Le profil (table public.profiles) est créé automatiquement par un déclencheur
  // côté base de données (voir spellcraft-supabase-schema-addendum.sql), à partir
  // de ce nom d'utilisateur passé en métadonnée. Ça fonctionne même si la
  // confirmation par email est activée, contrairement à un insert direct ici
  // (qui échouerait tant que l'utilisateur n'a pas de session active).
  return { data, needsConfirmation: !data.session };
}

async function scSignIn(email, password){
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) return { error: error.message };
  return { data };
}

async function scSignOut(){
  await sb.auth.signOut();
}

async function scGetCurrentUser(){
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

async function scGetProfile(userId){
  try{
    const { data, error } = await sb.from('profiles').select('username').eq('id', userId).single();
    if(error) return null;
    return data ? data.username : null;
  }catch(e){ return null; }
}

/* ============================================================
   WIDGET DE COMPTE (coin supérieur droit) + MODALE
   ============================================================ */
function injectAuthStyles(){
  if(document.getElementById('sc-auth-style')) return;
  const style = document.createElement('style');
  style.id = 'sc-auth-style';
  style.textContent = `
    #sc-auth-widget{position:fixed;top:12px;right:16px;z-index:200;font-family:'Inter',sans-serif;}
    .sc-auth-account{display:flex;align-items:center;gap:8px;background:#171325;border:1px solid #3a3260;border-radius:20px;padding:6px 8px 6px 14px;box-shadow:0 4px 10px rgba(0,0,0,.4);}
    .sc-auth-name{font-size:12px;color:#efe6c8;white-space:nowrap;}
    .sc-auth-btn{background:#241f38;border:1px solid #3a3260;color:#efe6c8;border-radius:14px;padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;}
    .sc-auth-btn:hover{border-color:#d4af37;}
    .sc-auth-btn.primary{background:linear-gradient(180deg,#7c5cff,#5537c2);border:none;color:#fff;}
    .sc-auth-btn.primary:hover{filter:brightness(1.12);}
    #sc-auth-modal-overlay{position:fixed;inset:0;background:rgba(5,4,10,.88);display:none;align-items:center;justify-content:center;z-index:300;}
    #sc-auth-modal-overlay.show{display:flex;}
    .sc-auth-modal{background:#171325;border:1px solid #3a3260;border-radius:12px;padding:24px;width:340px;max-width:90vw;display:flex;flex-direction:column;gap:12px;font-family:'Inter',sans-serif;}
    .sc-auth-modal h2{font-family:'Cinzel',serif;font-size:16px;margin:0;color:#d4af37;}
    .sc-auth-modal input{width:100%;box-sizing:border-box;background:#1f1a30;border:1px solid #3a3260;color:#efe6c8;border-radius:8px;padding:10px 12px;font-size:13px;}
    .sc-auth-modal label{font-size:11px;color:#d9cfae;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;display:block;}
    .sc-auth-field{display:flex;flex-direction:column;}
    .sc-auth-error{font-size:12px;color:#e88;background:rgba(194,59,59,.12);border:1px solid rgba(194,59,59,.4);border-radius:6px;padding:8px 10px;display:none;}
    .sc-auth-error.show{display:block;}
    .sc-auth-info{font-size:12px;color:#4a9d6b;background:rgba(74,157,107,.12);border:1px solid rgba(74,157,107,.4);border-radius:6px;padding:8px 10px;display:none;}
    .sc-auth-info.show{display:block;}
    .sc-auth-toggle{font-size:12px;color:#d9cfae;text-align:center;cursor:pointer;text-decoration:underline;}
    .sc-auth-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px;}
  `;
  document.head.appendChild(style);
}

let scAuthMode = 'signin'; // 'signin' | 'signup'

function scOpenAuthModal(){
  scAuthMode = 'signin';
  renderAuthModal();
  document.getElementById('sc-auth-modal-overlay').classList.add('show');
}
function scCloseAuthModal(){
  document.getElementById('sc-auth-modal-overlay').classList.remove('show');
}
function scToggleAuthMode(){
  scAuthMode = scAuthMode==='signin' ? 'signup' : 'signin';
  renderAuthModal();
}

function renderAuthModal(){
  const box = document.getElementById('sc-auth-modal-box');
  const isSignup = scAuthMode==='signup';
  box.innerHTML = `
    <h2>${isSignup ? 'Créer un compte' : 'Connexion'}</h2>
    <div class="sc-auth-error" id="sc-auth-error"></div>
    <div class="sc-auth-info" id="sc-auth-info"></div>
    ${isSignup ? `<div class="sc-auth-field"><label>Nom d'utilisateur</label><input type="text" id="sc-auth-username" placeholder="TonPseudo"></div>` : ''}
    <div class="sc-auth-field"><label>Email</label><input type="email" id="sc-auth-email" placeholder="toi@exemple.com"></div>
    <div class="sc-auth-field"><label>Mot de passe</label><input type="password" id="sc-auth-password" placeholder="••••••••"></div>
    <div class="sc-auth-toggle" onclick="scToggleAuthMode()">${isSignup ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? En créer un"}</div>
    <div class="sc-auth-actions">
      <button class="sc-auth-btn" onclick="scCloseAuthModal()">Annuler</button>
      <button class="sc-auth-btn primary" onclick="scSubmitAuthForm()">${isSignup ? 'Créer le compte' : 'Se connecter'}</button>
    </div>
  `;
}

async function scSubmitAuthForm(){
  const errorEl = document.getElementById('sc-auth-error');
  const infoEl = document.getElementById('sc-auth-info');
  errorEl.classList.remove('show'); infoEl.classList.remove('show');
  const email = document.getElementById('sc-auth-email').value.trim();
  const password = document.getElementById('sc-auth-password').value;
  if(!email || !password){ errorEl.textContent = 'Email et mot de passe requis.'; errorEl.classList.add('show'); return; }

  if(scAuthMode==='signup'){
    const username = document.getElementById('sc-auth-username').value.trim();
    const res = await scSignUp(email, password, username);
    if(res.error){ errorEl.textContent = res.error; errorEl.classList.add('show'); return; }
    if(res.needsConfirmation){
      infoEl.textContent = "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.";
      infoEl.classList.add('show');
      return;
    }
    scCloseAuthModal();
    renderAuthWidget();
  } else {
    const res = await scSignIn(email, password);
    if(res.error){ errorEl.textContent = res.error; errorEl.classList.add('show'); return; }
    scCloseAuthModal();
    renderAuthWidget();
  }
}

async function renderAuthWidget(){
  const widget = document.getElementById('sc-auth-widget');
  if(!widget) return;
  const user = await scGetCurrentUser();
  if(user){
    const username = await scGetProfile(user.id);
    widget.innerHTML = `
      <div class="sc-auth-account">
        <span class="sc-auth-name">👤 ${escapeHtml(username || user.email)}</span>
        <button class="sc-auth-btn" onclick="scSignOut()">Déconnexion</button>
      </div>`;
  } else {
    widget.innerHTML = `<button class="sc-auth-btn primary" onclick="scOpenAuthModal()">Se connecter</button>`;
  }
}

async function initSpellcraftAuth(){
  injectAuthStyles();
  if(!document.getElementById('sc-auth-widget')){
    const widget = document.createElement('div');
    widget.id = 'sc-auth-widget';
    document.body.appendChild(widget);
  }
  if(!document.getElementById('sc-auth-modal-overlay')){
    const overlay = document.createElement('div');
    overlay.id = 'sc-auth-modal-overlay';
    overlay.onclick = (e)=>{ if(e.target===overlay) scCloseAuthModal(); };
    overlay.innerHTML = `<div class="sc-auth-modal" id="sc-auth-modal-box"></div>`;
    document.body.appendChild(overlay);
  }
  await renderAuthWidget();
  sb.auth.onAuthStateChange(()=>{ renderAuthWidget(); });
}
