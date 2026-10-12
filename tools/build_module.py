import sys, re, json
SP='tools/gen.py'
OUTJS=sys.argv[1]
src=open(SP).read().split('# ------- fragments HTML')[0]
sys.argv=['x','/tmp']
ns={}
exec(src,ns)
BIG,SMALL,PAL,FXSRC=ns['BIG'],ns['SMALL'],ns['PAL'],ns['FXSRC']
ids,fx2,defs=ns['ids'],ns['fx2'],ns['defs']
big_svg,small_svg,leg_A=ns['big_svg'],ns['small_svg'],ns['leg_A']
U='@U@'
def cls(s):
    for c in ('spark','pulse','tw','sway','gear','mist1','mist2','mist3'):
        s=s.replace(f'class="{c}"',f'class="nd-{c}"')
    return s
def fit(s): return s.replace('width="300" height="423"','width="100%" height="100%" preserveAspectRatio="none"').replace('width="240" height="240"','width="100%" height="100%" preserveAspectRatio="none"').replace('class="fr"','class="nd-fr"')
FR={'big':{t:cls(fit(big_svg(t,U))) for t in BIG},'small':{t:cls(fit(small_svg(t,U))) for t in SMALL}}
FX={}
for s,k in {'Aube':'aube','Crépuscule':'crepuscule','Volonté':'volonte','Prima':'prima','Arcane':'arcane','Neutre':'neutre'}.items():
    FX[s]={'big':cls(ids(fx2(FXSRC[s],300,423),U)),'small':cls(ids(fx2(FXSRC[s],240,240),U))}
CLIP={'big':{t:[BIG[t]['O'],BIG[t]['W']] for t in BIG},'small':{t:[SMALL[t]['O'],SMALL[t]['W']] for t in SMALL}}
LEG=cls(leg_A()).replace('id="LGg"',f'id="{U}LGg"').replace('url(#LGg)',f'url(#{U}LGg)').replace('id="LGh"',f'id="{U}LGh"').replace('url(#LGh)',f'url(#{U}LGh)')
LEG=LEG.replace('width="100%" height="100%"','width="100%" height="100%" preserveAspectRatio="none"')
# fenêtres d'illustration : (x,y,w,h) + chemin
BB={'big':{'creature':(28,24,244,168),'spell':(25,-13,250,250),'trap':(18,-14,264,246),'artefact':(50,24,200,200),'region':(26,24,248,200),'hero':(30,24,240,314)},
    'small':{'creature':(48,31,144,116),'artefact':(65,30,110,110)}}
DIM={'big':(300,423.2),'small':(240,240)}
art_defs=[]; css=[]
for sz in ('big','small'):
    W,H=DIM[sz]
    for t,(x,y,w,h) in BB[sz].items():
        wp=(BIG if sz=='big' else SMALL)[t]['W']
        art_defs.append(f'<clipPath id="ncd-art-{sz}-{t}" clipPathUnits="objectBoundingBox"><path d="{wp}" transform="scale({1/w:.6f} {1/h:.6f}) translate({-x} {-y})"/></clipPath>')
        css.append(f'.ncard.n-drawn.nd-{t}.n-{sz} .nart-layer{{left:{x/W*100:.3f}%;top:{y/H*100:.3f}%;width:{w/W*100:.3f}%;height:{h/H*100:.3f}%;clip-path:url(#ncd-art-{sz}-{t});}}')
P=lambda v,d:f'{v/d*100:.3f}%'
Wb,Hb=300,423.2
css+= [
 f'.ncard.n-drawn.n-big .nname-wrap{{left:{P(60,Wb)};top:{P(194,Hb)};width:{P(182,Wb)};height:{P(32,Hb)};aspect-ratio:auto;transform:none;}}',
 '.ncard.n-drawn .nname-wrap .nname-text{transform:none;width:100%;max-width:100%;}',
 f'.ncard.n-drawn.n-big .ncard-text{{left:{P(42,Wb)};top:{P(240,Hb)};width:{P(216,Wb)};height:{P(114,Hb)};padding-top:0;}}',
 f'.ncard.n-drawn.n-big .n-text-lost-stamp{{left:{P(42,Wb)};top:{P(240,Hb)};width:{P(216,Wb)};height:{P(114,Hb)};}}',
 f'.ncard.n-drawn.n-big .ntypeline{{top:{P(357,Hb)};bottom:auto;width:{P(216,Wb)};}}',
 f'.ncard.n-drawn.n-big .nrarity-gem{{top:{P(373,Hb)};bottom:auto;width:12%;}}',
 '.ncard.n-drawn.n-big .nlegendary-gem{display:none;}',
 f'.ncard.n-drawn.n-big .nstat-wrap.n-atk{{left:3%;bottom:{-15.8/Hb*100:.3f}%;width:26%;}}',
 f'.ncard.n-drawn.n-big .nstat-wrap.n-end{{right:3%;bottom:{-15.8/Hb*100:.3f}%;width:26%;}}',
 f'.ncard.n-drawn.n-big .nstat-wrap.n-art{{right:3%;bottom:{-15.8/Hb*100:.3f}%;width:26%;}}',
 '.ncard.n-drawn.n-big .nstat-wrap.n-art .nstat-txt{font-size:27px;}',
 # héros : le nom se pose sur le bandeau du bas
 f'.ncard.n-drawn.nd-hero.n-big .nname-curved{{left:{P(60,Wb)};top:{P(338,Hb)}!important;width:{P(182,Wb)};height:{P(32,Hb)};transform:none;align-items:center;font-size:16px;color:#2a1f10;text-shadow:none;}}',
 '.ncard.n-drawn.nd-hero.n-big .nname-curved span{transform:none!important;}',
 f'.ncard.n-drawn.nd-hero.n-big .ncard-text{{top:{P(372,Hb)};height:{P(46,Hb)};font-size:10px;padding:2px 6px;}}',
 # petit format
 f'.ncard.n-drawn.n-small .nname-wrap{{left:{P(28,240)};top:{P(150,240)};width:{P(184,240)};height:{P(24,240)};aspect-ratio:auto;transform:none;}}',
 f'.ncard.n-drawn.n-small .ntypeline{{top:{P(193,240)};bottom:auto;width:{P(124,240)};transform:translate(-50%,-50%);line-height:1.2;}}',
 f'.ncard.n-drawn.n-small .nrarity-gem{{top:{P(207,240)};bottom:auto;width:{P(26,240)};}}',
 '.ncard .nd-bg,.ncard .nd-fr{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;}',
 '.ncard .nd-bg{z-index:2;}.ncard .nd-fr{z-index:5;}',
 f'.ncard .nd-leg{{position:absolute;left:0;top:{-26/Hb*100:.3f}%;width:100%;height:{80/Hb*100:.3f}%;z-index:7;pointer-events:none;}}',
 '.ncard .nd-leg svg{overflow:visible;}',
 # animations : en pause sauf survol / réglage « toujours »
 '.ncard.n-drawn .nd-bg *,.ncard.n-drawn .nd-leg *{animation-play-state:paused;}',
 '.ncard.n-drawn:hover .nd-bg *,.ncard.n-drawn:hover .nd-leg *,html.nd-anim-on .ncard.n-drawn .nd-bg *,html.nd-anim-on .ncard.n-drawn .nd-leg *{animation-play-state:running;}',
 '@media (prefers-reduced-motion:reduce){.ncard.n-drawn .nd-bg *,.ncard.n-drawn .nd-leg *,.ncard.n-drawn:hover .nd-bg *,html.nd-anim-on .ncard.n-drawn .nd-bg *{animation:none!important;}}',
 '.nd-spark{animation:nd-rise 3s linear infinite}@keyframes nd-rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-70px);opacity:0}}',
 '.nd-pulse{animation:nd-pulse 3s ease-in-out infinite}@keyframes nd-pulse{0%,100%{opacity:.6}50%{opacity:1}}',
 '.nd-tw{animation:nd-tw 2.4s ease-in-out infinite}@keyframes nd-tw{0%,100%{opacity:.2}50%{opacity:1}}',
 '.nd-sway{transform-box:fill-box;transform-origin:0% 50%;animation:nd-sway 3.2s ease-in-out infinite alternate}@keyframes nd-sway{0%{transform:rotate(-11deg)}100%{transform:rotate(11deg)}}',
 '.nd-gear{transform-box:fill-box;transform-origin:50% 50%;animation:nd-gstep 4.5s ease-in-out infinite}@keyframes nd-gstep{0%,40%{transform:rotate(0deg)}65%,100%{transform:rotate(var(--d))}}',
 '.nd-mist1{animation:nd-mist1 7s ease-in-out infinite alternate}.nd-mist2{animation:nd-mist2 9s ease-in-out infinite alternate}.nd-mist3{animation:nd-mist3 5s ease-in-out infinite alternate}',
 '@keyframes nd-mist1{0%{transform:translate(-45px,6px)}100%{transform:translate(45px,-8px)}}@keyframes nd-mist2{0%{transform:translate(50px,-6px)}100%{transform:translate(-50px,10px)}}@keyframes nd-mist3{0%{transform:translate(-30px,0);opacity:.5}100%{transform:translate(30px,-12px);opacity:1}}',
]
tpl=open(sys.argv[0] if False else 'tools/module_tpl.js').read()
js=(tpl.replace('/*@PAL*/',json.dumps(PAL,ensure_ascii=False))
 .replace('/*@FR*/',json.dumps(FR,ensure_ascii=False)).replace('/*@FX*/',json.dumps(FX,ensure_ascii=False))
 .replace('/*@CLIP*/',json.dumps(CLIP)).replace('/*@LEG*/',json.dumps(LEG))
 .replace('/*@ARTDEFS*/',json.dumps(''.join(art_defs))).replace('/*@CSS*/',json.dumps('\n'.join(css))))
open(OUTJS,'w').write(js)
print(len(js)//1024,'Ko')
