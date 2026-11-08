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
  var TYPE = {'Créature':'creature','Sortilège':'spell','Piège':'trap','Artefact':'artefact','Région':'region','Héros':'hero','Rituel':'ritual'};
  var SPLIT = {big:'M190,0 H300 V423 H110 Z', small:'M150,0 H240 V240 H100 Z'};
  /* Carte tri-source : 3 bandes obliques (2e source au milieu, 3e à droite) */
  var SPLIT3 = {big:['M130,0 H300 V423 H50 Z','M230,0 H300 V423 H150 Z'], small:['M110,0 H240 V240 H50 Z','M190,0 H240 V240 H130 Z']};
  var DIMS = {big:[300,423], small:[240,240]};

  /* ---- Rituel (set « La guerre élémentaire ») : cadre dédié, ajouté à la main (tools/ritual_frame.py) ---- */
  FR.big.ritual = "<svg class=\"nd-fr\" viewBox=\"0 0 300 423\" width=\"100%\" height=\"100%\" preserveAspectRatio=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"@U@BB\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" style=\"stop-color:var(--c2)\"/><stop offset=\"1\" style=\"stop-color:var(--c1)\"/></linearGradient><linearGradient id=\"@U@GG\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fbe9a6\"/><stop offset=\".45\" stop-color=\"#c9983a\"/><stop offset=\"1\" stop-color=\"#6f4a0e\"/></linearGradient><linearGradient id=\"@U@PP\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#f7ecd2\"/><stop offset=\"1\" stop-color=\"#dcc592\"/></linearGradient><radialGradient id=\"@U@OO\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#bff3ff\"/><stop offset=\".45\" stop-color=\"#4a8fe0\"/><stop offset=\"1\" stop-color=\"#6a2a9a\"/></radialGradient><pattern id=\"@U@LL\" width=\"12\" height=\"12\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\"><path d=\"M0 6H12M6 0V12\" stroke=\"#fff\" stroke-opacity=\".08\" stroke-width=\"1\"/></pattern><filter id=\"@U@NN\" x=\"0\" y=\"0\" width=\"100%\" height=\"100%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".85\" numOctaves=\"2\" seed=\"4\"/><feColorMatrix values=\"0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .12  0 0 0 .38 0\"/></filter></defs><defs><linearGradient id=\"@U@RK\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#8a7aa3\"/><stop offset=\".5\" stop-color=\"#3a2a4e\"/><stop offset=\"1\" stop-color=\"#140c1e\"/></linearGradient></defs><path d=\"M150,2 L218,12 L284,24 Q296,28 296,40 V400 Q296,414 282,418 H18 Q4,414 4,400 V40 Q4,28 16,24 L82,12 Z\" fill=\"none\" stroke=\"url(#@U@RK)\" stroke-width=\"7\"/><path d=\"M150,2 L218,12 L284,24 Q296,28 296,40 V400 Q296,414 282,418 H18 Q4,414 4,400 V40 Q4,28 16,24 L82,12 Z\" fill=\"none\" style=\"stroke:var(--gem)\" stroke-opacity=\".75\" stroke-width=\"1.2\" transform=\"translate(150 211.5) scale(.975) translate(-150 -211.5)\"/><path d=\"M150,2 L218,12 L284,24 Q296,28 296,40 V400 Q296,414 282,418 H18 Q4,414 4,400 V40 Q4,28 16,24 L82,12 Z\" fill=\"none\" stroke=\"#0c0712\" stroke-opacity=\".8\" stroke-width=\"1.5\" transform=\"translate(150 211.5) scale(.95) translate(-150 -211.5)\"/><clipPath id=\"@U@RO\"><path d=\"M-300,-300 H700 V800 H-300 Z M46,112 a104,104 0 1,0 208,0 a104,104 0 1,0 -208,0 Z\" clip-rule=\"evenodd\"/></clipPath><g clip-path=\"url(#@U@RO)\"><path d=\"M150.0,-10.0 L202.9,221.9 L54.6,35.9 L268.9,139.1 L31.1,139.1 L245.4,35.9 L97.1,221.9 L150.0,-10.0\" fill=\"none\" stroke=\"#0c0712\" stroke-opacity=\".7\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M150.0,-10.0 L202.9,221.9 L54.6,35.9 L268.9,139.1 L31.1,139.1 L245.4,35.9 L97.1,221.9 L150.0,-10.0\" fill=\"none\" style=\"stroke:var(--gem)\" stroke-width=\"1.8\" stroke-linejoin=\"round\" class=\"nd-pulse\"/></g><circle cx=\"150.0\" cy=\"-10.0\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"150.0\" cy=\"-10.0\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><circle cx=\"245.4\" cy=\"35.9\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"245.4\" cy=\"35.9\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><circle cx=\"268.9\" cy=\"139.1\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"268.9\" cy=\"139.1\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><circle cx=\"202.9\" cy=\"221.9\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"202.9\" cy=\"221.9\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><circle cx=\"97.1\" cy=\"221.9\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"97.1\" cy=\"221.9\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><circle cx=\"31.1\" cy=\"139.1\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"31.1\" cy=\"139.1\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><circle cx=\"54.6\" cy=\"35.9\" r=\"4.2\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle cx=\"54.6\" cy=\"35.9\" r=\"1.8\" style=\"fill:var(--gem)\" class=\"nd-tw\"/><g class=\"nd-rspin\"><circle cx=\"150\" cy=\"112\" r=\"98\" fill=\"none\" stroke=\"#0c0712\" stroke-opacity=\".85\" stroke-width=\"10\"/><circle cx=\"150\" cy=\"112\" r=\"93\" fill=\"none\" stroke=\"url(#@U@RK)\" stroke-width=\"2\"/><circle cx=\"150\" cy=\"112\" r=\"103\" fill=\"none\" stroke=\"url(#@U@RK)\" stroke-width=\"2\"/><g style=\"stroke:var(--gem)\" stroke-width=\"1.1\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(150.0 14.0) rotate(0.0)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(171.8 16.5) rotate(12.9)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(192.5 23.7) rotate(25.7)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(211.1 35.4) rotate(38.6)\"/><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(226.6 50.9) rotate(51.4)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(238.3 69.5) rotate(64.3)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(245.5 90.2) rotate(77.1)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(248.0 112.0) rotate(90.0)\"/><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(245.5 133.8) rotate(102.9)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(238.3 154.5) rotate(115.7)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(226.6 173.1) rotate(128.6)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(211.1 188.6) rotate(141.4)\"/><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(192.5 200.3) rotate(154.3)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(171.8 207.5) rotate(167.1)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(150.0 210.0) rotate(180.0)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(128.2 207.5) rotate(192.9)\"/><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(107.5 200.3) rotate(205.7)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(88.9 188.6) rotate(218.6)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(73.4 173.1) rotate(231.4)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(61.7 154.5) rotate(244.3)\"/><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(54.5 133.8) rotate(257.1)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(52.0 112.0) rotate(270.0)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(54.5 90.2) rotate(282.9)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(61.7 69.5) rotate(295.7)\"/><path d=\"M0,-3 V3 M0,-3 L2.5,-0.5\" transform=\"translate(73.4 50.9) rotate(308.6)\"/><path d=\"M0,-3 V3 M-2,-1 L2,1\" transform=\"translate(88.9 35.4) rotate(321.4)\"/><path d=\"M-2,-3 L0,3 L2,-3\" transform=\"translate(107.5 23.7) rotate(334.3)\"/><path d=\"M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5\" transform=\"translate(128.2 16.5) rotate(347.1)\"/></g></g><path d=\"M58,112 a92,92 0 1,0 184,0 a92,92 0 1,0 -184,0 Z\" fill=\"none\" stroke=\"#0c0712\" stroke-opacity=\".7\" stroke-width=\"7\"/><path d=\"M58,112 a92,92 0 1,0 184,0 a92,92 0 1,0 -184,0 Z\" fill=\"none\" stroke=\"url(#@U@GG)\" stroke-width=\"3.5\"/><path d=\"M58,112 a92,92 0 1,0 184,0 a92,92 0 1,0 -184,0 Z\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".35\" stroke-width=\".7\"/><path d=\"M20,210 L34,194 H266 L280,210 L266,226 H34 Z\" fill=\"#0c0712\" fill-opacity=\".5\" transform=\"translate(0 3)\"/><path d=\"M20,210 L34,194 H266 L280,210 L266,226 H34 Z\" fill=\"url(#@U@PP)\" stroke=\"url(#@U@RK)\" stroke-width=\"3\"/><path d=\"M20,210 L34,194 H266 L280,210 L266,226 H34 Z\" fill=\"none\" style=\"stroke:var(--gem)\" stroke-opacity=\".7\" stroke-width=\".8\" transform=\"translate(150 210) scale(.965 .8) translate(-150 -210)\"/><g transform=\"translate(38 210) scale(.895)\"><circle r=\"19\" fill=\"url(#@U@RK)\" stroke=\"#0c0712\" stroke-width=\"1\"/><circle r=\"15\" fill=\"#140c1e\" style=\"stroke:var(--gem)\" stroke-width=\"1\"/><path d=\"M0.0,-10.5 L4.6,9.5 L-8.2,-6.5 L10.2,2.3 L-10.2,2.3 L8.2,-6.5 L-4.6,9.5 L0.0,-10.5\" fill=\"none\" style=\"stroke:var(--gem)\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/></g><g transform=\"translate(262 210) scale(1)\"><polygon points=\"0,-12 8,0 0,12 -8,0\" fill=\"url(#@U@GG)\" stroke=\"#5a3d0c\" stroke-width=\".8\"/><polygon points=\"0,-8 5,0 0,8 -5,0\" style=\"fill:var(--gem)\"/><polygon points=\"0,-8 5,0 0,0\" fill=\"#fff\" fill-opacity=\".45\"/></g><clipPath id=\"@U@CP\"><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\"/></clipPath><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\" fill=\"url(#@U@PP)\"/><rect x=\"28\" y=\"232\" width=\"244\" height=\"144\" filter=\"url(#@U@NN)\" clip-path=\"url(#@U@CP)\"/><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\" fill=\"none\" stroke=\"url(#@U@RK)\" stroke-width=\"3.5\"/><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\" fill=\"none\" style=\"stroke:var(--gem)\" stroke-opacity=\".6\" stroke-width=\".8\" transform=\"translate(150 304) scale(.96 .93) translate(-150 -304)\"/><path d=\"M70,357 H230\" stroke=\"#a98a52\" stroke-width=\".8\" stroke-opacity=\".8\"/><ellipse cx=\"150\" cy=\"397\" rx=\"23\" ry=\"28\" fill=\"#140c1e\" stroke=\"url(#@U@RK)\" stroke-width=\"3.5\"/></svg>";
  CLIP.big.ritual = ["M150,2 L218,12 L284,24 Q296,28 296,40 V400 Q296,414 282,418 H18 Q4,414 4,400 V40 Q4,28 16,24 L82,12 Z", "M58,112 a92,92 0 1,0 184,0 a92,92 0 1,0 -184,0 Z"];
  ART_DEFS += "<clipPath id=\"ncd-art-big-ritual\" clipPathUnits=\"objectBoundingBox\"><path d=\"M58,112 a92,92 0 1,0 184,0 a92,92 0 1,0 -184,0 Z\" transform=\"scale(0.005435 0.005435) translate(-58 -20)\"/></clipPath>";
  CSS += "\n.ncard.n-drawn.nd-ritual.n-big .nart-layer{left:19.333%;top:4.726%;width:61.333%;height:43.478%;clip-path:url(#ncd-art-big-ritual);}\n.ncard.n-drawn .nd-fr .nd-rspin{transform-box:view-box;transform-origin:150px 112px;animation:nd-rspin 48s linear infinite;animation-play-state:paused}\n.ncard.n-drawn:hover .nd-fr .nd-rspin,html.nd-anim-on .ncard.n-drawn .nd-fr .nd-rspin{animation-play-state:running}\n.ncard.n-drawn .nd-fr .nd-pulse,.ncard.n-drawn .nd-fr .nd-tw{animation-play-state:paused}\n.ncard.n-drawn:hover .nd-fr .nd-pulse,.ncard.n-drawn:hover .nd-fr .nd-tw,html.nd-anim-on .ncard.n-drawn .nd-fr .nd-pulse,html.nd-anim-on .ncard.n-drawn .nd-fr .nd-tw{animation-play-state:running}\n@keyframes nd-rspin{to{transform:rotate(360deg)}}\n@media (prefers-reduced-motion:reduce){.ncard.n-drawn .nd-fr .nd-rspin{animation:none!important}}";
  /* ---- Édifice : cadre « tour » (tools/edifice_frame.py) ---- */
  FR.big.edifice = "<svg class=\"nd-fr\" viewBox=\"0 0 300 423\" width=\"100%\" height=\"100%\" preserveAspectRatio=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"@U@BB\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" style=\"stop-color:var(--c2)\"/><stop offset=\"1\" style=\"stop-color:var(--c1)\"/></linearGradient><linearGradient id=\"@U@GG\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fbe9a6\"/><stop offset=\".45\" stop-color=\"#c9983a\"/><stop offset=\"1\" stop-color=\"#6f4a0e\"/></linearGradient><linearGradient id=\"@U@PP\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#f7ecd2\"/><stop offset=\"1\" stop-color=\"#dcc592\"/></linearGradient><radialGradient id=\"@U@OO\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#bff3ff\"/><stop offset=\".45\" stop-color=\"#4a8fe0\"/><stop offset=\"1\" stop-color=\"#6a2a9a\"/></radialGradient><pattern id=\"@U@LL\" width=\"12\" height=\"12\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\"><path d=\"M0 6H12M6 0V12\" stroke=\"#fff\" stroke-opacity=\".08\" stroke-width=\"1\"/></pattern><filter id=\"@U@NN\" x=\"0\" y=\"0\" width=\"100%\" height=\"100%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".85\" numOctaves=\"2\" seed=\"4\"/><feColorMatrix values=\"0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .12  0 0 0 .38 0\"/></filter></defs><path d=\"M4,4 H48 V20 H66 V4 H110 V20 H128 V4 H172 V20 H190 V4 H234 V20 H252 V4 H296 V36 L288,44 V409 Q288,419 278,419 H22 Q12,419 12,409 V44 L4,36 Z\" fill=\"none\" stroke=\"url(#@U@GG)\" stroke-width=\"6\"/><path d=\"M4,4 H48 V20 H66 V4 H110 V20 H128 V4 H172 V20 H190 V4 H234 V20 H252 V4 H296 V36 L288,44 V409 Q288,419 278,419 H22 Q12,419 12,409 V44 L4,36 Z\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".35\" stroke-width=\".8\" transform=\"translate(150 211.5) scale(.985) translate(-150 -211.5)\"/><path d=\"M4,4 H48 V20 H66 V4 H110 V20 H128 V4 H172 V20 H190 V4 H234 V20 H252 V4 H296 V36 L288,44 V409 Q288,419 278,419 H22 Q12,419 12,409 V44 L4,36 Z\" fill=\"none\" stroke=\"#2a1a08\" stroke-opacity=\".7\" stroke-width=\"1.5\" transform=\"translate(150 211.5) scale(.955) translate(-150 -211.5)\"/><g stroke=\"var(--c3)\" stroke-opacity=\".5\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"><path d=\"M60,404 Q150,396 240,404\"/></g><path d=\"M56,204 V114 Q56,52 150,52 Q244,52 244,114 V204 Z\" fill=\"none\" stroke=\"#2a1a08\" stroke-opacity=\".6\" stroke-width=\"9\"/><path d=\"M56,204 V114 Q56,52 150,52 Q244,52 244,114 V204 Z\" fill=\"none\" stroke=\"url(#@U@GG)\" stroke-width=\"5\"/><path d=\"M56,204 V114 Q56,52 150,52 Q244,52 244,114 V204 Z\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".4\" stroke-width=\".8\"/><path d=\"M20,210 L34,194 H266 L280,210 L266,226 H34 Z\" fill=\"#2a1a08\" fill-opacity=\".45\" transform=\"translate(0 3)\"/><path d=\"M20,210 L34,194 H266 L280,210 L266,226 H34 Z\" fill=\"url(#@U@PP)\" stroke=\"url(#@U@GG)\" stroke-width=\"3\"/><path d=\"M20,210 L34,194 H266 L280,210 L266,226 H34 Z\" fill=\"none\" stroke=\"#a98a52\" stroke-width=\".8\" transform=\"translate(150 210) scale(.965 .8) translate(-150 -210)\"/><g transform=\"translate(38 210) scale(0.8947368421052632)\"><circle r=\"19\" fill=\"url(#@U@GG)\" stroke=\"#5a3d0c\" stroke-width=\"1\"/><circle r=\"15\" fill=\"#2a1a08\" stroke=\"#f3d77a\" stroke-width=\"1\"/><circle r=\"8.5\" fill=\"none\" stroke=\"#f3d77a\" stroke-width=\"4.2\" stroke-dasharray=\"3.34 3.34\"/><circle r=\"6.6\" fill=\"#f3d77a\"/><circle r=\"2.8\" fill=\"#2a1a08\"/></g><g transform=\"translate(262 210) scale(1)\"><polygon points=\"0,-12 8,0 0,12 -8,0\" fill=\"url(#@U@GG)\" stroke=\"#5a3d0c\" stroke-width=\".8\"/><polygon points=\"0,-8 5,0 0,8 -5,0\" style=\"fill:var(--gem)\"/><polygon points=\"0,-8 5,0 0,0\" fill=\"#fff\" fill-opacity=\".45\"/></g><clipPath id=\"@U@CP\"><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\"/></clipPath><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\" fill=\"url(#@U@PP)\"/><rect x=\"28\" y=\"232\" width=\"244\" height=\"144\" filter=\"url(#@U@NN)\" clip-path=\"url(#@U@CP)\"/><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\" fill=\"none\" stroke=\"url(#@U@GG)\" stroke-width=\"3.5\"/><path d=\"M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z\" fill=\"none\" stroke=\"#a98a52\" stroke-width=\".8\" transform=\"translate(150 304) scale(.96 .93) translate(-150 -304)\"/><path d=\"M70,357 H230\" stroke=\"#a98a52\" stroke-width=\".8\" stroke-opacity=\".8\"/><ellipse cx=\"150\" cy=\"397\" rx=\"23\" ry=\"28\" fill=\"#2a1a08\" stroke=\"url(#@U@GG)\" stroke-width=\"3.5\"/><path d=\"M12,44 H288\" stroke=\"#2a1a08\" stroke-opacity=\".55\" stroke-width=\"2\"/><path d=\"M4,36 H296\" stroke=\"#fff\" stroke-opacity=\".28\" stroke-width=\".8\"/><g stroke=\"var(--c3)\" stroke-opacity=\".45\" stroke-width=\"1.6\" fill=\"none\"><path d=\"M48,20 V36 M110,20 V36 M172,20 V36 M234,20 V36\"/><path d=\"M66,20 V36 M128,20 V36 M190,20 V36 M252,20 V36\"/></g></svg>";
  CLIP.big.edifice = ["M4,4 H48 V20 H66 V4 H110 V20 H128 V4 H172 V20 H190 V4 H234 V20 H252 V4 H296 V36 L288,44 V409 Q288,419 278,419 H22 Q12,419 12,409 V44 L4,36 Z", "M56,204 V114 Q56,52 150,52 Q244,52 244,114 V204 Z"];
  ART_DEFS += "<clipPath id=\"ncd-art-big-edifice\" clipPathUnits=\"objectBoundingBox\"><path d=\"M56,204 V114 Q56,52 150,52 Q244,52 244,114 V204 Z\" transform=\"scale(0.005319 0.006579) translate(-56 -52)\"/></clipPath>";
  CSS += "\n.ncard.n-drawn.nd-edifice.n-big .nart-layer{left:18.667%;top:12.287%;width:62.667%;height:35.917%;clip-path:url(#ncd-art-big-edifice);}";
  /* ---- fin Édifice ---- */
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

  function band(size, W, H, srcX, clipId, u){
    var c = PAL[srcX];
    return '<g clip-path="url(#' + clipId + ')" style="--c1:' + c[0] + ';--c2:' + c[1] + ';--c3:' + c[2] + ';--gem:' + c[3] + '">'
      + '<linearGradient id="' + clipId + 'G" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#' + clipId + 'G)"/>' + sub(FX[srcX][size], clipId + 'z') + '</g>';
  }
  function bgSvg(size, type, src, src2, u, src3){
    var d = DIMS[size], W = d[0], H = d[1];
    var s = '<svg class="nd-bg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="' + u + 'BB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient>'
      + '<clipPath id="' + u + 'CPB"><path d="' + CLIP[size][type][0] + '"/></clipPath>'
      + '<clipPath id="' + u + 'CPW"><path d="M-300,-300 H700 V800 H-300 Z ' + CLIP[size][type][1] + '" clip-rule="evenodd"/></clipPath>';
    if(src2 && src3){
      s += '<clipPath id="' + u + 'CPS"><path d="' + SPLIT3[size][0] + '"/></clipPath>'
        + '<clipPath id="' + u + 'CPT"><path d="' + SPLIT3[size][1] + '"/></clipPath>';
    } else if(src2) s += '<clipPath id="' + u + 'CPS"><path d="' + SPLIT[size] + '"/></clipPath>';
    s += '</defs><g clip-path="url(#' + u + 'CPB)"><g clip-path="url(#' + u + 'CPW)"><rect width="' + W + '" height="' + H + '" fill="url(#' + u + 'BB)"/>' + sub(FX[src][size], u);
    if(src2 && src3){
      s += band(size, W, H, src2, u + 'CPS', u) + band(size, W, H, src3, u + 'CPT', u);
    } else if(src2){
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

  /* Légendaire : anneau d'argent serti de pierres autour de l'illustration (au lieu de la couronne).
     Les pierres prennent les couleurs de la classe (--gem) et de la 2e classe (--gem2). */
  var RING_DK = '#2b3140';
  function ringGem(x, y, r, c, shape, rot){
    var col = 'var(--' + c + ')';
    var base = 'color-mix(in srgb,' + col + ' 72%,#000)', lite = 'color-mix(in srgb,' + col + ' 55%,#fff)';
    var o = '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (rot || 0) + ') scale(' + (r / 10).toFixed(3) + ')">';
    if(shape === 'oval'){
      o += '<ellipse rx="9" ry="13.5" fill="' + RING_DK + '"/><ellipse rx="8" ry="12.4" fill="url(#@S)"/><ellipse rx="5.8" ry="10" style="fill:' + base + '"/><ellipse rx="4.6" ry="8.6" style="fill:' + col + '"/>'
         + '<ellipse cx="-1.4" cy="-3.4" rx="2" ry="4" style="fill:' + lite + '" fill-opacity=".85"/><circle cx="-1.8" cy="-6" r="1.3" fill="#fff"/>';
    } else {
      o += '<circle r="11.5" fill="' + RING_DK + '"/><circle r="10.4" fill="url(#@S)"/><circle r="8" style="fill:' + base + '"/>'
         + '<polygon points="0,-8 5.7,-5.7 8,0 5.7,5.7 0,8 -5.7,5.7 -8,0 -5.7,-5.7" style="fill:' + col + '"/>'
         + '<polygon points="0,-8 5.7,-5.7 0,0" style="fill:' + lite + '" fill-opacity=".85"/><polygon points="-8,0 -5.7,-5.7 0,0" style="fill:' + lite + '" fill-opacity=".45"/>'
         + '<polygon points="0,0 5.7,5.7 0,8 -5.7,5.7" style="fill:' + base + '" fill-opacity=".7"/><circle cx="-2.6" cy="-3.2" r="1.7" fill="#fff" fill-opacity=".95"/>';
    }
    return o + '</g>';
  }
  function ringRivet(x, y){ return '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + RING_DK + '"/><circle cx="' + x + '" cy="' + y + '" r="5" fill="url(#@S)"/><circle cx="' + (x - 1) + '" cy="' + (y - 1.2) + '" r="1.7" fill="#fff"/>'; }
  function ringCimier(cx, y0){
    return '<path d="M' + (cx - 36) + ',' + (y0 + 2) + ' Q' + (cx - 22) + ',' + (y0 - 14) + ' ' + cx + ',' + (y0 - 20) + ' Q' + (cx + 22) + ',' + (y0 - 14) + ' ' + (cx + 36) + ',' + (y0 + 2) + ' Z" fill="url(#@S)" stroke="' + RING_DK + '" stroke-width="1.5"/>'
         + '<path d="M' + (cx - 30) + ',' + y0 + ' Q' + cx + ',' + (y0 - 12) + ' ' + (cx + 30) + ',' + y0 + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>'
         + ringGem(cx, y0 - 7, 14, 'gem', 'round', 0);
  }
  function ringPolar(cx, cy, rx, ry, deg){ var a = deg * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }
  /* Formes de l'illustration (repère 300 x 423) : tracé de l'anneau + pierres */
  function ringShape(type){
    var S = { d: '', st: '', cx: 150, top: 18 };
    function oval(p, rot){ return ringGem(p[0], p[1], 9, 'gem', 'oval', rot); }
    function round(p, r, c){ return ringGem(p[0], p[1], r, c || 'gem2', 'round', 0); }
    var i, p;
    if(type === 'creature'){
      /* suit la vraie ligne dorée du cadre (haut légèrement bombé, bas à y=194, juste au-dessus du bandeau du nom) */
      S.d = 'M26,44 Q26,31 38,29 Q150,12 262,29 Q274,31 274,44 V174 Q274,186 262,186 H38 Q26,186 26,174 Z'; S.top = 20.5; S.w = 8; S.k = .66;
      [[30,32],[270,32],[30,182],[270,182]].forEach(function(q){ S.st += ringRivet(q[0], q[1]); });
      S.st += round([72,24.6], 5.5) + round([228,24.6], 5.5) + round([150,185], 6.5, 'gem') + round([76,185], 4.6) + round([224,185], 4.6);
      S.st += round([26,76], 5) + round([26,136], 5) + round([274,76], 5) + round([274,136], 5) + oval([26,106], 90) + oval([274,106], 90);
    } else if(type === 'spell' || type === 'region'){
      var rx = type === 'spell' ? 131 : 130, ry = type === 'spell' ? 131 : 106, cy = type === 'spell' ? 138 : 124;
      S.d = 'M' + (150 - rx) + ',' + cy + ' a' + rx + ',' + ry + ' 0 1,0 ' + (2 * rx) + ',0 a' + rx + ',' + ry + ' 0 1,0 ' + (-2 * rx) + ',0 Z'; S.top = cy - ry;
      [45,135,225,315].forEach(function(a){ p = ringPolar(150, cy, rx, ry, a); S.st += ringRivet(p[0].toFixed(1), p[1].toFixed(1)); });
      [-130,-50,50,130].forEach(function(a){ S.st += round(ringPolar(150, cy, rx, ry, a), 6.5); });
      [-18,18,162,198].forEach(function(a){ S.st += round(ringPolar(150, cy, rx, ry, a), 6); });
      S.st += round(ringPolar(150, cy, rx, ry, 90), 9, 'gem') + oval(ringPolar(150, cy, rx, ry, 0), 90) + oval(ringPolar(150, cy, rx, ry, 180), 90);
    } else if(type === 'trap'){
      S.d = 'M150,-19 L287,109 L150,237 L13,109 Z'; S.top = -19;
      S.st += round([218,45], 6.5) + round([218,173], 6.5) + round([82,45], 6.5) + round([82,173], 6.5);
      S.st += round([150,237], 9, 'gem') + oval([13,109], 90) + oval([287,109], 90);
    } else if(type === 'artefact'){
      S.d = 'M106,18 H194 L256,80 V168 L194,230 H106 L44,168 V80 Z'; S.top = 18;
      [[106,18],[194,18],[106,230],[194,230]].forEach(function(q){ S.st += ringRivet(q[0], q[1]); });
      S.st += round([225,49], 6.5) + round([225,199], 6.5) + round([75,49], 6.5) + round([75,199], 6.5);
      S.st += round([150,230], 9, 'gem') + oval([44,124], 90) + oval([256,124], 90);
    } else { return null; }
    return S;
  }
  function ringSvg(type, u){
    if(type !== 'creature') return ''; /* anneau : cartes Créature seulement, les autres gardent la couronne */
    var S = ringShape(type); if(!S) return '';
    var g = '<defs><linearGradient id="' + u + 'rs" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" style="stop-color:color-mix(in srgb,var(--gem) 10%,#fff)"/><stop offset=".35" style="stop-color:color-mix(in srgb,var(--gem) 22%,#cfd5e0)"/>'
      + '<stop offset=".7" style="stop-color:color-mix(in srgb,var(--gem) 30%,#8a94a6)"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--gem) 14%,#dde2ea)"/></linearGradient></defs>';
    var band = '<path d="' + S.d + '" fill="none" stroke="' + RING_DK + '" stroke-width="' + ((S.w || 11) + 3) + '" stroke-linejoin="round"/>'
      + '<path d="' + S.d + '" fill="none" stroke="url(#@S)" stroke-width="' + (S.w || 11) + '" stroke-linejoin="round"/>'
      + '<path d="' + S.d + '" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.3" stroke-linejoin="round" transform="translate(-2 -2)"/>'
      + '<path d="' + S.d + '" fill="none" stroke="' + RING_DK + '" stroke-opacity=".45" stroke-width="' + ((S.w || 11) * .35).toFixed(1) + '" stroke-dasharray="1.6 4.2" stroke-linecap="round" stroke-linejoin="round"/>';
    var inner = band + S.st + (S.k ? '<g transform="translate(' + S.cx + ' ' + S.top + ') scale(' + S.k + ') translate(' + (-S.cx) + ' ' + (-S.top) + ')">' + ringCimier(S.cx, S.top) + '</g>' : ringCimier(S.cx, S.top));
    inner = inner.split('url(#@S)').join('url(#' + u + 'rs)');
    return '<svg viewBox="0 0 300 423" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;width:100%;height:100%">' + g + inner + '</svg>';
  }
  function isEdifice(c){ return !!c && c.type === 'Artefact' && (c.subtypes || []).some(function(s){ return String(s).trim().toLowerCase() === '\u00e9difice'; }); }
  function decorateFrame(root, card, size, opts){
    try{
      if(!root || !card) return root;
      var type = TYPE[card.type];
      if(!type) return root;
      var fk = (type === 'artefact' && size === 'big' && FR.big.edifice && isEdifice(card)) ? 'edifice' : type; /* Édifice : cadre en forme de tour */
      if(size === 'small' && !FR.small[type]) return root;
      if(type === 'hero' && !(opts && opts.heroCardFrame)) return root;
      if(size !== 'big' && size !== 'small') return root;
      install();
      var src = PAL[card.class] ? card.class : 'Neutre';
      if(card.fullArt && type !== 'hero' && type !== 'region'){ fullArt(root, card, size, type, src); return root; }
      var src2 = (card.classSecondary && PAL[card.classSecondary] && card.classSecondary !== src) ? card.classSecondary : null;
      var src3 = (src2 && card.classTertiary && PAL[card.classTertiary] && card.classTertiary !== src && card.classTertiary !== src2) ? card.classTertiary : null;
      var c = PAL[src], u = 'nd' + (++counter) + '-';
      root.classList.add('n-drawn', 'nd-' + type);
      if(fk === 'edifice') root.classList.add('nd-edifice');
      root.style.setProperty('--c1', c[0]); root.style.setProperty('--c2', c[1]);
      root.style.setProperty('--c3', c[2]); root.style.setProperty('--gem', c[3]);
      var old = root.querySelectorAll('img.nframe-layer, img.nframe-half-layer, .nname-wrap > img');
      for(var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
      var art = root.querySelector('.nart-layer');
      var tmp = document.createElement('div');
      tmp.innerHTML = bgSvg(size, fk, src, src2, u + 'b', src3) + sub(FR[size][fk], u + 'f');
      var bg = tmp.firstChild, fr = tmp.lastChild;
      if(art && art.nextSibling){ root.insertBefore(bg, art.nextSibling); } else { root.appendChild(bg); }
      root.insertBefore(fr, bg.nextSibling);
      if(size === 'big' && type !== 'hero' && card.isLegendary){
        var ringHtml = fk === 'edifice' ? '' : ringSvg(type, u);
        if(ringHtml){
          var c2 = src2 ? PAL[src2][3] : 'color-mix(in srgb,var(--gem) 55%,#fff)';
          root.style.setProperty('--gem2', c2);
          var rg = document.createElement('div'); rg.className = 'nd-ring';
          rg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:6;pointer-events:none;';
          rg.innerHTML = ringHtml;
          root.appendChild(rg);
        } else {
          var lg = document.createElement('div'); lg.className = 'nd-leg'; lg.innerHTML = sub(LEG, u + 'l');
          root.appendChild(lg);
        }
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
