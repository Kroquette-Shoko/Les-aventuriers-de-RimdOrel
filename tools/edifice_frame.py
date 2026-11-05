# Cadre « tour » des Édifices (Artefact de sous-type Édifice), format grand uniquement.
# Lancer : python3 tools/edifice_frame.py   -> insère/remplace le bloc dans spellcraft-card-render.js et tools/module_tpl.js
import sys, json, os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=open(os.path.join(ROOT,'tools','gen.py')).read().split('# ------- fragments HTML')[0]
sys.argv=['x','/tmp']; ns={}; exec(src,ns)
BIG=ns['BIG']; big_svg=ns['big_svg']
# Silhouette : 5 créneaux, corniche, corps légèrement en retrait, pied chanfreiné.
O=("M4,4 H48 V20 H66 V4 H110 V20 H128 V4 H172 V20 H190 V4 H234 V20 H252 V4 H296 "
   "V36 L288,44 V409 Q288,419 278,419 H22 Q12,419 12,409 V44 L4,36 Z")
W="M56,204 V114 Q56,52 150,52 Q244,52 244,114 V204 Z"   # fenêtre en arche
saved=BIG['artefact']
BIG['artefact']=dict(O=O,W=W,gems=[])
U='@U@'
svg=big_svg('artefact',U)
BIG['artefact']=saved
# pierre : joints discrets sur la corniche et le pied
extra=('<path d="M12,44 H288" stroke="#2a1a08" stroke-opacity=".55" stroke-width="2"/>'
       '<path d="M4,36 H296" stroke="#fff" stroke-opacity=".28" stroke-width=".8"/>'
       '<g stroke="var(--c3)" stroke-opacity=".45" stroke-width="1.6" fill="none"><path d="M48,20 V36 M110,20 V36 M172,20 V36 M234,20 V36"/><path d="M66,20 V36 M128,20 V36 M190,20 V36 M252,20 V36"/></g>')
svg=svg.replace('</svg>',extra+'</svg>')
for c in ('spark','pulse','tw','sway','gear','mist1','mist2','mist3'):
    svg=svg.replace(f'class="{c}"',f'class="nd-{c}"')
svg=svg.replace('width="300" height="423"','width="100%" height="100%" preserveAspectRatio="none"').replace('class="fr"','class="nd-fr"')
x,y,w,h=56,52,188,152
Wb,Hb=300,423.2
artdef=f'<clipPath id="ncd-art-big-edifice" clipPathUnits="objectBoundingBox"><path d="{W}" transform="scale({1/w:.6f} {1/h:.6f}) translate({-x} {-y})"/></clipPath>'
css=f'.ncard.n-drawn.nd-edifice.n-big .nart-layer{{left:{x/Wb*100:.3f}%;top:{y/Hb*100:.3f}%;width:{w/Wb*100:.3f}%;height:{h/Hb*100:.3f}%;clip-path:url(#ncd-art-big-edifice);}}'
START='  /* ---- Édifice : cadre « tour » (tools/edifice_frame.py) ---- */'
END='  /* ---- fin Édifice ---- */'
block=(f'\n{START}\n  FR.big.edifice = {json.dumps(svg,ensure_ascii=False)};\n  CLIP.big.edifice = {json.dumps([O,W])};\n'
       f'  ART_DEFS += {json.dumps(artdef)};\n  CSS += {json.dumps(chr(10)+css)};\n{END}\n')
for rel in ('spellcraft-card-render.js','tools/module_tpl.js'):
    p=os.path.join(ROOT,rel); s=open(p,encoding='utf-8').read()
    s=re.sub(re.escape(START)+r'.*?'+re.escape(END)+r'\n','',s,flags=re.S).replace('\n\n'+'\n','\n') if START in s else s
    anchor='  var counter = 0, installed = false;'
    assert anchor in s,(rel,'ancre')
    s=s.replace(anchor,block.lstrip('\n')+anchor,1)
    open(p,'w',encoding='utf-8').write(s)
print('ok',len(svg))
open('/tmp/edifice_preview.svg','w').write(svg.replace('@U@','p').replace('var(--c3)','#8a6a2a').replace('var(--c1)','#3a6a3a').replace('var(--c2)','#6aa86a').replace('var(--gem)','#9fe08f').replace('100%','300').replace(' preserveAspectRatio="none"',''))
