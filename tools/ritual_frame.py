# Cadre du Rituel (set « La guerre élémentaire »). Lancer : python3 tools/ritual_frame.py
# Produit ritual_block.js : bloc à coller dans spellcraft-card-render.js et tools/module_tpl.js
# (juste après « var DIMS »), à la place de l ancien bloc « Rituel ».
import sys, json, math
import os; ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=open(os.path.join(ROOT,'tools','gen.py')).read().split('# ------- fragments HTML')[0]
sys.argv=['x','/tmp']; ns={}; exec(src,ns)
defs,ids,gem,PLATE,PARCH=ns['defs'],ns['ids'],ns['gem'],ns['PLATE'],ns['PARCH']
CX,CY,R=150,112,92
O="M150,2 L218,12 L284,24 Q296,28 296,40 V400 Q296,414 282,418 H18 Q4,414 4,400 V40 Q4,28 16,24 L82,12 Z"
W=f"M{CX-R},{CY} a{R},{R} 0 1,0 {2*R},0 a{R},{R} 0 1,0 {-2*R},0 Z"
def pt(r,a): return (CX+r*math.cos(math.radians(a)), CY+r*math.sin(math.radians(a)))
def heptagram(r, cx=CX, cy=CY):
    P=[(cx+r*math.cos(math.radians(-90+k*360/7)), cy+r*math.sin(math.radians(-90+k*360/7))) for k in range(7)]
    d='M'+' L'.join(f'{P[(i*3)%7][0]:.1f},{P[(i*3)%7][1]:.1f}' for i in range(8))
    return d, P
def ritual_svg(u):
    s=['<svg class="fr" viewBox="0 0 300 423" width="300" height="423" xmlns="http://www.w3.org/2000/svg">',defs()]
    s.append('<defs><linearGradient id="RK" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a7aa3"/><stop offset=".5" stop-color="#3a2a4e"/><stop offset="1" stop-color="#140c1e"/></linearGradient></defs>')
    # cadre extérieur : fer sombre + liseré lumineux de la source
    s.append(f'<path d="{O}" fill="none" stroke="url(#RK)" stroke-width="7"/>')
    s.append(f'<path d="{O}" fill="none" style="stroke:var(--gem)" stroke-opacity=".75" stroke-width="1.2" transform="translate(150 211.5) scale(.975) translate(-150 -211.5)"/>')
    s.append(f'<path d="{O}" fill="none" stroke="#0c0712" stroke-opacity=".8" stroke-width="1.5" transform="translate(150 211.5) scale(.95) translate(-150 -211.5)"/>')
    # étoile à 7 branches derrière le cercle (déborde du cercle)
    hd,P=heptagram(R+30)
    RO=R+12
    s.append(f'<clipPath id="RO"><path d="M-300,-300 H700 V800 H-300 Z M{CX-RO},{CY} a{RO},{RO} 0 1,0 {2*RO},0 a{RO},{RO} 0 1,0 {-2*RO},0 Z" clip-rule="evenodd"/></clipPath>')
    s.append(f'<g clip-path="url(#RO)"><path d="{hd}" fill="none" stroke="#0c0712" stroke-opacity=".7" stroke-width="5" stroke-linejoin="round"/>')
    s.append(f'<path d="{hd}" fill="none" style="stroke:var(--gem)" stroke-width="1.8" stroke-linejoin="round" class="pulse"/></g>')
    for (x,y) in P:
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.2" fill="url(#RK)" stroke="#0c0712" stroke-width="1"/><circle cx="{x:.1f}" cy="{y:.1f}" r="1.8" style="fill:var(--gem)" class="tw"/>')
    # anneau de runes qui tourne lentement
    ring=[f'<circle cx="{CX}" cy="{CY}" r="{R+6}" fill="none" stroke="#0c0712" stroke-opacity=".85" stroke-width="10"/>',
          f'<circle cx="{CX}" cy="{CY}" r="{R+1}" fill="none" stroke="url(#RK)" stroke-width="2"/>',
          f'<circle cx="{CX}" cy="{CY}" r="{R+11}" fill="none" stroke="url(#RK)" stroke-width="2"/>']
    runes=[]
    for k in range(28):
        a=k*360/28
        x,y=pt(R+6,a-90)
        v=k%4
        g=['M0,-3 V3 M0,-3 L2.5,-0.5','M0,-3 V3 M-2,-1 L2,1','M-2,-3 L0,3 L2,-3','M0,-3 V3 M0,0 L2.5,2.5 M0,0 L-2.5,2.5'][v]
        runes.append(f'<path d="{g}" transform="translate({x:.1f} {y:.1f}) rotate({a:.1f})"/>')
    ring.append('<g style="stroke:var(--gem)" stroke-width="1.1" fill="none" stroke-linecap="round">'+''.join(runes)+'</g>')
    s.append('<g class="rspin">'+''.join(ring)+'</g>')
    # cercle de la fenêtre
    s.append(f'<path d="{W}" fill="none" stroke="#0c0712" stroke-opacity=".7" stroke-width="7"/>')
    s.append(f'<path d="{W}" fill="none" stroke="url(#GG)" stroke-width="3.5"/><path d="{W}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>')
    # bandeau du nom, sceau, gemme, parchemin (même mise en page que les autres types)
    s.append(f'<path d="{PLATE}" fill="#0c0712" fill-opacity=".5" transform="translate(0 3)"/><path d="{PLATE}" fill="url(#PP)" stroke="url(#RK)" stroke-width="3"/><path d="{PLATE}" fill="none" style="stroke:var(--gem)" stroke-opacity=".7" stroke-width=".8" transform="translate(150 210) scale(.965 .8) translate(-150 -210)"/>')
    hd2,_=heptagram(10.5,0,0)
    s.append(f'<g transform="translate(38 210) scale(.895)"><circle r="19" fill="url(#RK)" stroke="#0c0712" stroke-width="1"/><circle r="15" fill="#140c1e" style="stroke:var(--gem)" stroke-width="1"/><path d="{hd2}" fill="none" style="stroke:var(--gem)" stroke-width="1.6" stroke-linejoin="round"/></g>')
    s.append(gem(262,210,1))
    s.append(f'<clipPath id="CP"><path d="{PARCH}"/></clipPath><path d="{PARCH}" fill="url(#PP)"/><rect x="28" y="232" width="244" height="144" filter="url(#NN)" clip-path="url(#CP)"/>')
    s.append(f'<path d="{PARCH}" fill="none" stroke="url(#RK)" stroke-width="3.5"/><path d="{PARCH}" fill="none" style="stroke:var(--gem)" stroke-opacity=".6" stroke-width=".8" transform="translate(150 304) scale(.96 .93) translate(-150 -304)"/>')
    s.append('<path d="M70,357 H230" stroke="#a98a52" stroke-width=".8" stroke-opacity=".8"/>')
    s.append('<ellipse cx="150" cy="397" rx="23" ry="28" fill="#140c1e" stroke="url(#RK)" stroke-width="3.5"/>')
    s.append('</svg>')
    out=ids(''.join(s),u).replace('id="RK"',f'id="{u}RK"').replace('url(#RK)',f'url(#{u}RK)').replace('id="RO"',f'id="{u}RO"').replace('url(#RO)',f'url(#{u}RO)')
    return out
U='@U@'
fr=ritual_svg(U)
for c in ('pulse','tw','rspin'): fr=fr.replace(f'class="{c}"',f'class="nd-{c}"')
fr=fr.replace('width="300" height="423"','width="100%" height="100%" preserveAspectRatio="none"').replace('class="fr"','class="nd-fr"')
x,y,w,h=CX-R,CY-R,2*R,2*R
artdef=f'<clipPath id="ncd-art-big-ritual" clipPathUnits="objectBoundingBox"><path d="{W}" transform="scale({1/w:.6f} {1/h:.6f}) translate({-x} {-y})"/></clipPath>'
Wb,Hb=300,423.2
css=('.ncard.n-drawn.nd-ritual.n-big .nart-layer{'+f'left:{x/Wb*100:.3f}%;top:{y/Hb*100:.3f}%;width:{w/Wb*100:.3f}%;height:{h/Hb*100:.3f}%;clip-path:url(#ncd-art-big-ritual);'+'}\n'
 '.ncard.n-drawn .nd-fr .nd-rspin{transform-box:view-box;transform-origin:150px 112px;animation:nd-rspin 48s linear infinite;animation-play-state:paused}\n'
 '.ncard.n-drawn:hover .nd-fr .nd-rspin,html.nd-anim-on .ncard.n-drawn .nd-fr .nd-rspin{animation-play-state:running}\n'
 '.ncard.n-drawn .nd-fr .nd-pulse,.ncard.n-drawn .nd-fr .nd-tw{animation-play-state:paused}\n'
 '.ncard.n-drawn:hover .nd-fr .nd-pulse,.ncard.n-drawn:hover .nd-fr .nd-tw,html.nd-anim-on .ncard.n-drawn .nd-fr .nd-pulse,html.nd-anim-on .ncard.n-drawn .nd-fr .nd-tw{animation-play-state:running}\n'
 '@keyframes nd-rspin{to{transform:rotate(360deg)}}\n'
 '@media (prefers-reduced-motion:reduce){.ncard.n-drawn .nd-fr .nd-rspin{animation:none!important}}')
block=('\n  /* ---- Rituel (set « La guerre élémentaire ») : cadre dédié, ajouté à la main (tools/ritual_frame.py) ---- */\n'
 f'  FR.big.ritual = {json.dumps(fr,ensure_ascii=False)};\n'
 f'  CLIP.big.ritual = {json.dumps([O,W])};\n'
 f'  ART_DEFS += {json.dumps(artdef)};\n'
 f'  CSS += {json.dumps(chr(10)+css)};\n')
open('ritual_block.js','w').write(block)
open('ritual_preview.svg','w').write(ritual_svg('').replace('class="pulse"','').replace('class="tw"','').replace('class="rspin"','').replace('var(--gem)','#c98bff'))
print(len(block))
