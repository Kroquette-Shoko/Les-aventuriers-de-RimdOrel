// ============================================================
// Plateau de jeu — 00-balisage : le HTML du plateau (zones, modales, journal, chat…)
// Partagé par la page de jeu ET le tutoriel : une seule source, plus de copie à synchroniser.
// Écrit dans la page à l'endroit où ce script est chargé (avant tous les autres scripts du plateau).
// Tutoriel (window.SC_TUTORIAL) : pas de barre du haut (remplacée par la bande de narration),
// mais les emplacements de connexion / options restent présents.
// ============================================================
(function(){
  var TOPBAR = String.raw`  <div id="board-topbar">
    <button id="board-back-btn" title="Quitter la partie" onclick="uiLeaveGame()">← Menu principal</button>
    <div id="board-topbar-right">
      <div id="sc-auth-slot"></div>
      <div id="sc-options-slot"></div>
    </div>
  </div>
`;
  var MARKUP = String.raw`<div id="board-scale-outer">
<div id="app-outer">
  <div class="enemy-hand-row" id="enemy-hand-row"></div>
  <div id="app">
    <div id="board">
      <div id="board-scroll-area">
        <div class="board-row enemy">
          <div class="deck-zone" id="deck-zone-p2"></div>
          <div class="artifact-stack" id="artifacts-p2"></div>
          <div class="mana-box" id="mana-box-p2"></div>
          <div class="hero-frame" id="hero-frame-p2"></div>
        </div>
        <div class="lane enemy" id="lane-p2"></div>
        <div class="board-divider">
          <div class="divider-line"></div>
          <div id="turn-timer"></div>
          <div class="phase-bar-wrap">
            <div class="menu-toggles-row">
              <button id="emote-toggle-btn" title="Émotes" onclick="toggleEmotePanel()">😄</button>
              <button id="journal-toggle-btn" title="Journal" onclick="toggleJournal()">📜</button>
              <button id="chat-toggle-btn" title="Chat de la partie" onclick="toggleChatPanel()">💬<span id="chat-unread-badge" style="display:none;">0</span></button>
            </div>
            <div id="bug-report-panel">
              <h3>Signaler un problème</h3>
              <textarea id="bug-report-text" placeholder="Décris ce qui s'est passé (le plus précisément possible)..." rows="4"></textarea>
              <div id="bug-report-status"></div>
              <div id="bug-report-buttons">
                <button id="bug-report-cancel" onclick="closeBugReportPanel()">Annuler</button>
                <button id="bug-report-send" onclick="submitBugReport()">Envoyer</button>
              </div>
            </div>
            <div id="chat-panel">
              <h3>Chat <span class="close-journal-btn" onclick="toggleChatPanel()">✕</span></h3>
              <div id="chat-list"></div>
              <form id="chat-form" onsubmit="return uiSubmitChat(event)">
                <input id="chat-input" type="text" maxlength="200" autocomplete="off" placeholder="Écrire un message…">
                <button type="submit" id="chat-send-btn">Envoyer</button>
              </form>
              <div id="chat-hint">Joueurs et spectateurs peuvent écrire. Les messages ne sont pas conservés.</div>
            </div>
            <div id="journal-panel">
              <h3>Journal <span class="close-journal-btn" onclick="toggleJournal()">✕</span></h3>
              <div id="log"></div>
            </div>
            <div id="emote-panel">
              <div id="emote-grid"></div>
            </div>
            <div class="phase-bar" id="phase-bar"></div>
          </div>
        </div>
        <div class="lane self" id="lane-p1"></div>
        <div class="board-row self">
          <div class="mana-box" id="mana-box-p1"></div>
          <div class="hero-frame" id="hero-frame-p1"></div>
          <div class="artifact-stack" id="artifacts-p1"></div>
          <div class="deck-zone" id="deck-zone-p1"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="hand-row" id="hand-p1"></div>
</div>
</div>

<div class="tip" id="tip"></div>
<div id="card-preview"></div>

<svg id="targeting-layer">
  <g id="target-fixed"></g>
  <line id="target-line" x1="0" y1="0" x2="0" y2="0" style="display:none"/>
  <circle id="target-origin" cx="0" cy="0" r="11" style="display:none"/>
  <polygon id="target-arrow" points="0,0 0,0 0,0" style="display:none"/>
</svg>
<svg id="block-arrows-layer"></svg>
<button id="combat-skip-btn" type="button" title="Terminer les animations et afficher le résultat" onclick="abortCombatAnimations()">Passer ⏭</button>

<div id="mulligan-overlay">
  <h2>Ta main de départ</h2>
  <p class="mulligan-sub">Clique une carte pour la renvoyer et en repiocher une nouvelle. Tu ne peux le faire qu'une fois.</p>
  <div id="mulligan-cards"></div>
  <button class="mulligan-confirm-btn" onclick="confirmMulligan()">Confirmer ma main</button>
</div>

<div id="overlay">
  <h1 id="overlay-text"></h1>
  <div id="overlay-summary"></div>
  <button onclick="gsDisconnect(); window.location.href='spellcraft-lobby.html'">Retour au lobby</button>
</div>

<div id="match-announce-overlay"></div>

<div class="modal-overlay" id="discard-modal" onclick="if(event.target===this) closeDiscardModal()">
  <div class="modal-box">
    <h2 id="discard-modal-title">Défausse</h2>
    <div id="discard-modal-list"></div>
    <button class="close-btn" onclick="closeDiscardModal()">Fermer</button>
  </div>
</div>`;
  if(window.SC_TUTORIAL){
    document.write('<div id="sc-auth-slot" style="text-align:center;margin-bottom:8px;"></div>\n<div id="sc-options-slot"></div>\n' + MARKUP);
  } else {
    document.write(MARKUP.replace('<div id="app-outer">\n', '<div id="app-outer">\n' + TOPBAR));
  }
})();
