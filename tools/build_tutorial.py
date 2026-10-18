#!/usr/bin/env python3
"""Génère spellcraft-tutorial.html à partir du plateau réel (spellcraft-server-board.html).

Le tutoriel n'a plus sa propre copie du code du plateau : à chaque évolution du plateau
(animations, journal, icônes...), il suffit de relancer
    python3 tools/build_tutorial.py
pour que le tutoriel les récupère. Ce qui est propre au tutoriel vit dans :
    tools/tutorial/tutorial.css   (bande de narration, surbrillance, écran de fin)
    tools/tutorial/topbar.html    (bande de narration + écran de fin)
    spellcraft-tutorial-engine.js (scénario scripté, étape par étape)
Ne pas éditer spellcraft-tutorial.html à la main : il est régénéré.
"""
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
html = rd('spellcraft-server-board.html')

def sub_once(old, new, label):
    global html
    n = html.count(old)
    if n != 1:
        sys.exit(f"[build_tutorial] « {label} » : {n} occurrence(s) au lieu de 1 — le plateau a changé, adapter le générateur.")
    html = html.replace(old, new)

def sub_regex_once(pat, new, label, flags=re.S):
    global html
    m = list(re.finditer(pat, html, flags))
    if len(m) != 1:
        sys.exit(f"[build_tutorial] « {label} » : {len(m)} occurrence(s) au lieu de 1.")
    html = html[:m[0].start()] + new + html[m[0].end():]

sub_once("<title>Rimd'Orël — Plateau serveur</title>", "<title>Rimd'Orël — Tutoriel</title>", "titre")
# Pas d'horloge d'événements dans le tutoriel
sub_once('<script src="spellcraft-chrono.js"></script>\n', '', "chrono")
# Bande de narration en haut de la page
sub_once("<body>\n", "<body>\n\n" + rd('tools/tutorial/topbar.html') + "\n", "body")
# Le tutoriel remplace la barre du haut du plateau (56 px) par sa bande de narration
sub_regex_once(r'  <div id="board-topbar">.*?\n  </div>\n  <div class="enemy-hand-row"',
               '  <div class="enemy-hand-row"', "barre du haut du plateau")
sub_once('<div id="board-scale-outer">',
         '<div id="sc-auth-slot" style="text-align:center;margin-bottom:8px;"></div>\n<div id="sc-options-slot"></div>\n<div id="board-scale-outer">',
         "emplacements auth/options")
sub_once("const BOARD_REF_WIDTH = 1920, BOARD_REF_HEIGHT = 1080;",
         "const BOARD_REF_WIDTH = 1920, BOARD_REF_HEIGHT = 1024; // 1080 du vrai plateau moins sa barre du haut (56 px), remplacée par la bande de narration\n"
         "function tutTopbarHeight(){ return window.innerHeight <= 600 ? 66 : 92; }",
         "dimensions du plateau")
sub_once("SCBoardFit.fit(outer, {refW:BOARD_REF_WIDTH, baseH:BOARD_REF_HEIGHT, topReserve:0}); return; }\n  const scale = Math.min(window.innerWidth / BOARD_REF_WIDTH, window.innerHeight / BOARD_REF_HEIGHT);",
         "SCBoardFit.fit(outer, {refW:BOARD_REF_WIDTH, baseH:BOARD_REF_HEIGHT, topReserve:tutTopbarHeight()}); return; }\n  const scale = Math.min(window.innerWidth / BOARD_REF_WIDTH, (window.innerHeight - tutTopbarHeight()) / BOARD_REF_HEIGHT);",
         "mise à l'échelle")
# CSS du tutoriel : placé AVANT les scripts pour l'emporter sur les règles du plateau
sub_once('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
         "<style>\n/* ---- Spécifique au tutoriel ---- */\n" + rd('tools/tutorial/tutorial.css') +
         "#board-scale-outer{inset:auto;top:92px;left:0;right:0;bottom:0;}\n"
         "@media (max-height:600px){ #board-scale-outer{top:66px;} }\n"
         "#app-outer{display:none;} #app-outer.show{display:flex;}\n"
         "</style>\n"
         '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', "CSS tutoriel")
# Le plateau démarre via initFromUrl : ici c'est le moteur du tutoriel qui démarre
sub_once("initSpellcraftAuth().then(initFromUrl);\n</script>", "</script>\n<script src=\"spellcraft-tutorial-engine.js\"></script>", "démarrage")
first, rest = html.split("\n", 1)  # le commentaire vient APRÈS le doctype (sinon le navigateur passe en mode « quirks »)
out = first + "\n<!-- FICHIER GÉNÉRÉ par tools/build_tutorial.py à partir du plateau : ne pas éditer à la main. -->\n" + rest
open(os.path.join(ROOT, 'spellcraft-tutorial.html'), 'w', encoding='utf-8').write(out)
print("spellcraft-tutorial.html régénéré (", len(out), "octets )")
