import os, sys, json
OUT = sys.argv[1]            # dossier project/
LOCAL = len(sys.argv) > 2    # mode test local (icônes depuis le repo)
ICON = {
 'mana':'84a938fda5a6f6cf69b369544d9dfa0b','atk':'a81a97fc9c3d3cd0df71d953b8fe2e23',
 'end':'95b88e25e154bfd30daa325d45bc6ed1','art':'7ff510b1d4b81338d35c3f7be965821a',
 'basique':'99484d9af9218b2a2cb9f1e8fd9f4007','commune':'63ef46ff0de347eda3a4e3eee2283802',
 'rare':'e7a8a039ee30d1262b739c22ac6428ed','epique':'3950b2f2dba6b0ccf00caaa5f2002130',
 'mythique':'00da98971876cc91e7dc199308689172','legendaire':'85b9ef6511c0295715d1796b45aee811'}
REPO='file:///home/claude/kroquette-shoko/les-aventuriers-de-rimdorel/images/card/icon/'
LOCALF={'mana':'bubble/mana.png','atk':'bubble/attack.png','end':'bubble/endurance.png','art':'bubble/artefact.png',
 'basique':'rare/basique.png','commune':'rare/commun.png','rare':'rare/rare.png','epique':'rare/epique.png','mythique':'rare/mythique.png','legendaire':'rare/legendaire.png'}
def ic(k): return (REPO+LOCALF[k]) if LOCAL else '/_blob/'+ICON[k]

PAL = {  # c1 sombre, c2 moyen, c3 clair, gem
 'Aube':('#6b4a06','#c9921a','#f4d36a','#ffd54a'),
 'Crépuscule':('#26103a','#5e2a86','#a66ccf','#c98bff'),
 'Volonté':('#3d0910','#92202b','#d9626b','#ff6a72'),
 'Prima':('#0c3320','#24703f','#6fc58e','#62e69f'),
 'Arcane':('#0b2150','#2650a0','#6a9be0','#62b0ff'),
 'Neutre':('#35200f','#7e5232','#c79a70','#f2b06a')}
def vars_(s): c=PAL[s]; return f'--c1:{c[0]};--c2:{c[1]};--c3:{c[2]};--gem:{c[3]}'

GOLD='#e8c768'
def gem(cx,cy,s=1):
    return (f'<g transform="translate({cx} {cy}) scale({s})"><polygon points="0,-12 8,0 0,12 -8,0" fill="url(#GG)" stroke="#5a3d0c" stroke-width=".8"/>'
            f'<polygon points="0,-8 5,0 0,8 -5,0" style="fill:var(--gem)"/><polygon points="0,-8 5,0 0,0" fill="#fff" fill-opacity=".45"/></g>')
def orb(cx,cy,r):
    return (f'<g transform="translate({cx} {cy})"><circle r="{r}" fill="url(#OO)"/><path d="M{-r*.6:.1f},{-r*.1:.1f} Q0,{-r*1.1:.1f} {r*.7:.1f},{-r*.3:.1f}" stroke="#fff" stroke-opacity=".55" stroke-width="{r*.16:.1f}" fill="none" stroke-linecap="round"/>'
            f'<path d="M{-r*.5:.1f},{r*.4:.1f} Q0,{r*.9:.1f} {r*.6:.1f},{r*.3:.1f}" stroke="#ff7ad0" stroke-opacity=".6" stroke-width="{r*.2:.1f}" fill="none" stroke-linecap="round"/></g>')
def medal(kind,cx,cy,r):
    s=r/19
    inner={
     'creature':'<ellipse cx="0" cy="4.5" rx="6.5" ry="5.2" fill="#f3d77a"/><circle cx="-8.5" cy="-1.5" r="2.8" fill="#f3d77a"/><circle cx="-3.2" cy="-7.5" r="3" fill="#f3d77a"/><circle cx="3.2" cy="-7.5" r="3" fill="#f3d77a"/><circle cx="8.5" cy="-1.5" r="2.8" fill="#f3d77a"/>',
     'spell':'<circle r="11" fill="url(#OO)"/><path d="M-6,-1 Q0,-10 7,-3" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-5,4 Q1,9 7,3" stroke="#ff7ad0" stroke-opacity=".7" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
     'trap':'<polygon points="0,-12 3,-4 11,-8 6,-1 12,3 4,4 5,12 0,6 -5,12 -4,4 -12,3 -6,-1 -11,-8 -3,-4" fill="#f3d77a"/><circle r="3" fill="#2a1a08"/>',
     'artefact':'<circle r="8.5" fill="none" stroke="#f3d77a" stroke-width="4.2" stroke-dasharray="3.34 3.34"/><circle r="6.6" fill="#f3d77a"/><circle r="2.8" fill="#2a1a08"/>',
     'region':'<polygon points="0,-12 2.6,-2.6 12,0 2.6,2.6 0,12 -2.6,2.6 -12,0 -2.6,-2.6" fill="#f3d77a"/><polygon points="0,-6 1.3,-1.3 6,0 1.3,1.3 0,6 -1.3,1.3 -6,0 -1.3,-1.3" fill="#2a1a08" transform="rotate(45)"/>'}[kind]
    return (f'<g transform="translate({cx} {cy}) scale({s})"><circle r="19" fill="url(#GG)" stroke="#5a3d0c" stroke-width="1"/><circle r="15" fill="#2a1a08" stroke="#f3d77a" stroke-width="1"/>{inner}</g>')

def defs(u=''):
    return ('<defs>'
     '<linearGradient id="BB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c2)"/><stop offset="1" style="stop-color:var(--c1)"/></linearGradient>'
     '<linearGradient id="GG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9a6"/><stop offset=".45" stop-color="#c9983a"/><stop offset="1" stop-color="#6f4a0e"/></linearGradient>'
     '<linearGradient id="PP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7ecd2"/><stop offset="1" stop-color="#dcc592"/></linearGradient>'
     '<radialGradient id="OO" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#bff3ff"/><stop offset=".45" stop-color="#4a8fe0"/><stop offset="1" stop-color="#6a2a9a"/></radialGradient>'
     '<pattern id="LL" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 6H12M6 0V12" stroke="#fff" stroke-opacity=".08" stroke-width="1"/></pattern>'
     '<filter id="NN" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .12  0 0 0 .38 0"/></filter>'
     '</defs>')

def ids(svg,u):  # préfixe les ids pour qu'ils restent uniques dans une même page
    for k in ['BB','GG','PP','OO','LL','NN','CP','FXC','FXF','FXG','FXL','FXB','FXM','FXK']:
        svg=svg.replace(f'id="{k}"',f'id="{u}{k}"').replace(f'url(#{k})',f'url(#{u}{k})')
    return svg

BIG = {
 'creature':dict(O="M16,4 H284 L296,16 V407 L284,419 H16 L4,407 V16 Z",
   W="M40,30 Q150,18 260,30 Q272,32 272,44 V180 Q272,192 260,192 H40 Q28,192 28,180 V44 Q28,32 40,30 Z",
   gems=[(150,6,1),(15,108,.9),(285,108,.9)]),
 'spell':dict(O="M22,5 Q150,-3 278,5 Q292,12 292,28 Q283,211 296,396 Q292,412 278,418 Q150,426 22,418 Q8,412 4,396 Q17,211 8,28 Q8,12 22,5 Z",
   W="M25,112 a125,125 0 1,0 250,0 a125,125 0 1,0 -250,0 Z",gems=[(150,6,1),(34,64,.9),(266,64,.9),(34,148,.9),(266,148,.9)]),
 'trap':dict(O="M26,4 H274 L296,26 V397 L274,419 H26 L4,397 V26 Z",
   W="M150,-14 L282,109 L150,232 L18,109 Z",gems=[(150,6,1),(40,44,.9),(260,44,.9),(40,164,.9),(260,164,.9)]),
 'artefact':dict(O="M14,4 H286 Q296,4 296,14 V409 Q296,419 286,419 H14 Q4,419 4,409 V14 Q4,4 14,4 Z",
   W="M108.6,24 H191.4 L250,82.6 V165.4 L191.4,224 H108.6 L50,165.4 V82.6 Z",gems=[(150,6,1),(30,104,.9),(270,104,.9)]),
 'region':dict(O="M6,24 Q58,22 98,12 L150,1 L202,12 Q242,22 294,24 V399 Q242,401 202,411 L150,422 L98,411 Q58,401 6,399 Z",
   W="M26,124 a124,100 0 1,0 248,0 a124,100 0 1,0 -248,0 Z",gems=[(150,10,1),(13,106,.85),(287,106,.85)]),
 'hero':dict(O="M12,4 H288 Q296,4 296,12 V411 Q296,419 288,419 H12 Q4,419 4,411 V12 Q4,4 12,4 Z",
   W="M30,34 Q30,24 40,24 H260 Q270,24 270,34 V328 Q270,338 260,338 H40 Q30,338 30,328 Z",gems=[(15,180,.9),(285,180,.9)]),
}
PARCH="M36,236 H264 L270,242 V366 L264,372 H36 L30,366 V242 Z"
PLATE="M20,210 L34,194 H266 L280,210 L266,226 H34 Z"
PLATEH="M20,354 L34,338 H266 L280,354 L266,370 H34 Z"

def big_svg(t,u,fx='etincelles'):
    d=BIG[t]; o,w=d['O'],d['W']
    s=['<svg class="fr" viewBox="0 0 300 423" width="300" height="423" xmlns="http://www.w3.org/2000/svg">',defs()]
    s.append(f'<path d="{o}" fill="none" stroke="url(#GG)" stroke-width="6"/><path d="{o}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8" transform="translate(150 211.5) scale(.985) translate(-150 -211.5)"/>')
    s.append(f'<path d="{o}" fill="none" stroke="#2a1a08" stroke-opacity=".7" stroke-width="1.5" transform="translate(150 211.5) scale(.955) translate(-150 -211.5)"/>')
    sc='stroke="var(--c3)" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"'
    s.append(f'<g {sc}><path d="M60,404 Q150,396 240,404"/></g>')
    s.append(f'<path d="{w}" fill="none" stroke="#2a1a08" stroke-opacity=".6" stroke-width="9"/>')
    s.append(f'<path d="{w}" fill="none" stroke="url(#GG)" stroke-width="5"/><path d="{w}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".8"/>')
    pass  # diamants du cadre retirés
    pl=PLATEH if t=='hero' else PLATE
    py=354 if t=='hero' else 210
    s.append(f'<path d="{pl}" fill="#2a1a08" fill-opacity=".45" transform="translate(0 3)"/><path d="{pl}" fill="url(#PP)" stroke="url(#GG)" stroke-width="3"/><path d="{pl}" fill="none" stroke="#a98a52" stroke-width=".8" transform="translate(150 {py}) scale(.965 .8) translate(-150 -{py})"/>')
    if t!='hero':
        s.append(medal(t,38,210,17))
        s.append(gem(262,210,1))
        s.append(f'<clipPath id="CP"><path d="{PARCH}"/></clipPath><path d="{PARCH}" fill="url(#PP)"/><rect x="28" y="232" width="244" height="144" filter="url(#NN)" clip-path="url(#CP)"/>')
        s.append(f'<path d="{PARCH}" fill="none" stroke="url(#GG)" stroke-width="3.5"/><path d="{PARCH}" fill="none" stroke="#a98a52" stroke-width=".8" transform="translate(150 304) scale(.96 .93) translate(-150 -304)"/>')
        s.append('<path d="M70,357 H230" stroke="#a98a52" stroke-width=".8" stroke-opacity=".8"/>')
        s.append('<ellipse cx="150" cy="397" rx="23" ry="28" fill="#2a1a08" stroke="url(#GG)" stroke-width="3.5"/>')
    else:
        s.append(medal('spell',38,354,17)); s.append(gem(262,354,1))
        s.append('<circle cx="150" cy="397" r="26" fill="url(#GG)" stroke="#5a3d0c"/><circle cx="150" cy="397" r="21" fill="#2a1a08"/>'+orb(150,397,17))
    s.append('</svg>')
    return ids(''.join(s),u)


import random, math
def fx_svg(name,o,w):
    R=random.Random(11); g=[]
    cp=f'<clipPath id="FXC"><path d="{o} {w}" clip-rule="evenodd"/></clipPath><g clip-path="url(#FXC)">'
    if name=='brume':
        g.append('<filter id="FXF" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".011 .02" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .95  1.9 0 0 0 -.62"/></filter>')
        g.append('<g class="drift"><rect x="-60" y="-10" width="420" height="450" filter="url(#FXF)" opacity=".55"/></g>')
        g.append('<filter id="FXG" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".02 .035" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .9  1.7 0 0 0 -.62"/></filter>')
        g.append('<g class="drift2"><rect x="-60" y="-10" width="420" height="450" filter="url(#FXG)" opacity=".4"/></g>')
    elif name in ('etincelles','etincelles_s'):
        sm = name.endswith('_s'); W,H=(240,240) if sm else (300,423)
        g.append(f'<radialGradient id="FXG" cx=".5" cy="1" r=".9"><stop offset="0" style="stop-color:var(--gem)" stop-opacity=".5"/><stop offset="1" style="stop-color:var(--gem)" stop-opacity="0"/></radialGradient><rect x="0" y="{H*.45:.0f}" width="{W}" height="{H*.55:.0f}" fill="url(#FXG)"/>')
        for i in range(24 if sm else 46):
            x=R.uniform(3,W-3); y=R.uniform(H*.35,H); r=R.uniform(.7,2.0 if sm else 2.4)
            col=R.choice(["var(--gem)","#fff","var(--c3)","var(--gem)"])
            g.append(f'<circle class="spark" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" style="fill:{col};animation-delay:-{R.uniform(0,4):.1f}s;animation-duration:{R.uniform(2.4,4.4):.1f}s"/>')
    elif name=='lueur':
        g.append('<radialGradient id="FXG" cx=".5" cy=".25" r=".75"><stop offset="0" style="stop-color:var(--gem)" stop-opacity=".85"/><stop offset=".6" style="stop-color:var(--c3)" stop-opacity=".25"/><stop offset="1" style="stop-color:var(--c3)" stop-opacity="0"/></radialGradient>')
        g.append('<filter id="FXF" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>')
        g.append('<rect x="0" y="0" width="300" height="423" fill="url(#FXG)" class="pulse"/>')
        g.append(f'<path d="{o}" fill="none" style="stroke:var(--gem)" stroke-width="18" opacity=".7" filter="url(#FXF)" class="pulse"/>')
    elif name=='flamme':
        g.append('<linearGradient id="FXG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3a8"/><stop offset=".3" stop-color="#ffb03a"/><stop offset=".7" stop-color="#e8431c"/><stop offset="1" stop-color="#b3141c" stop-opacity="0"/></linearGradient>')
        def fl(x,h,wd,d,op=1):
            return (f'<path class="flame" d="M{x},422 C{x-wd},{422-h*.35} {x-wd*.5},{422-h*.7} {x},{422-h} C{x+wd*.2},{422-h*.65} {x+wd*1.1},{422-h*.5} {x+wd*.8},{422-h*.22} C{x+wd*.6},{422-h*.08} {x+wd*.3},422 {x},422 Z" fill="url(#FXG)" opacity="{op}" style="animation-delay:-{d:.1f}s"/>')
        for x in range(-4,310,15): g.append(fl(x,R.uniform(36,70),R.uniform(9,13),R.uniform(0,1),.9))
        for x in (10,288): g.append(fl(x,R.uniform(120,150),12,R.uniform(0,1)))
        for x in (22,276): g.append(fl(x,R.uniform(90,110),11,R.uniform(0,1),.9))
        for x in range(8,300,26): g.append(fl(x,R.uniform(26,40),7,R.uniform(0,1),.8))
    elif name=='rayons':
        n=24; rs=[]
        for i in range(n):
            a1=math.radians(i*360/n); a2=math.radians((i+.5)*360/n)
            rs.append(f'<path d="M150,104 L{150+700*math.cos(a1):.0f},{104+700*math.sin(a1):.0f} L{150+700*math.cos(a2):.0f},{104+700*math.sin(a2):.0f} Z"/>')
        g.append('<radialGradient id="FXG" cx=".5" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
        g.append('<g class="spin" style="fill:var(--c3)" opacity=".42">'+''.join(rs)+'</g><rect width="300" height="423" fill="url(#FXG)"/>')
    elif name=='feuillage':
        st='style="stroke:var(--c3)" stroke-width="1.8" fill="none" opacity=".7" stroke-linecap="round"'
        vl=[];lv=[]
        for side,x0 in ((1,16),(-1,284)):
            pts=[(x0+side*7*math.sin(y/17),y) for y in range(420,10,-6)]
            vl.append('<path d="M'+' L'.join(f'{x:.1f},{y}' for x,y in pts)+f'" {st}/>')
            for k,(x,y) in enumerate(pts[::4]):
                ang=(-40 if k%2 else 40)*side
                lv.append(f'<ellipse cx="{x+side*(6 if k%2 else -6):.1f}" cy="{y}" rx="8" ry="3.2" transform="rotate({ang} {x+side*(6 if k%2 else -6):.1f} {y})" style="fill:var(--c3)" opacity=".55"/>')
        pts=[(x,411+4*math.sin(x/15)) for x in range(10,292,6)]
        vl.append('<path d="M'+' L'.join(f'{x},{y:.1f}' for x,y in pts)+f'" {st}/>')
        for k,(x,y) in enumerate(pts[::5]): lv.append(f'<ellipse cx="{x}" cy="{y+(-5 if k%2 else 5):.1f}" rx="8" ry="3.2" transform="rotate({35 if k%2 else -35} {x} {y+(-5 if k%2 else 5):.1f})" style="fill:var(--c3)" opacity=".55"/>')
        pts=[(x,14+3*math.sin(x/12)) for x in range(30,272,6)]
        vl.append('<path d="M'+' L'.join(f'{x},{y:.1f}' for x,y in pts)+f'" {st}/>')
        g.append('<g>'+''.join(vl)+''.join(lv)+'</g>')
    elif name=='runes':
        GL=["M2,0 V16 M2,4 L10,0 M2,9 L10,5","M2,16 V0 L10,5 V16","M2,0 V16 M2,3 L9,7 L2,11","M2,0 V16 M2,2 L10,6 M2,7 L10,11","M2,16 V0 L9,4 L2,8 L10,16","M9,2 L3,8 L9,14","M2,2 L10,14 M10,2 L2,14","M2,0 V16 M10,0 V16 M2,6 L10,10"]
        out=[]
        for i,y in enumerate(range(34,340,26)):
            out.append(f'<path d="{GL[i%8]}" transform="translate(9 {y}) scale(.9)"/><path d="{GL[(i+3)%8]}" transform="translate(279 {y}) scale(.9)"/>')
        for i,x in enumerate(range(26,280,22)): out.append(f'<path d="{GL[(i+5)%8]}" transform="translate({x} 401) scale(.8)"/>')
        g.append('<g style="stroke:var(--gem);filter:drop-shadow(0 0 2px var(--gem))" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" class="pulse">'+''.join(out)+'</g>')
        g.append('<rect width="300" height="423" style="fill:var(--c1)" opacity=".18"/>')
    elif name=='lune':
        cres='M0,-15 A15,15 0 1,0 0,15 A11.5,11.5 0 1,1 0,-15 Z'
        g.append('<g fill="#fff3c8" opacity=".95"><path d="'+cres+'" transform="translate(16 380) rotate(-20) scale(1.3)"/><path d="'+cres+'" transform="translate(284 62) rotate(160) scale(1.1)"/><path d="'+cres+'" transform="translate(284 380) rotate(20) scale(.9)"/></g>')
        st=[]
        for i in range(60):
            x=R.uniform(3,297); y=R.choice([R.uniform(3,34),R.uniform(3,420),R.uniform(376,420)]); r=R.uniform(.9,3.2)
            if r>2.3: st.append(f'<path class="tw" d="M{x:.1f},{y-r*2.2:.1f} L{x+r*.6:.1f},{y-r*.6:.1f} L{x+r*2.2:.1f},{y:.1f} L{x+r*.6:.1f},{y+r*.6:.1f} L{x:.1f},{y+r*2.2:.1f} L{x-r*.6:.1f},{y+r*.6:.1f} L{x-r*2.2:.1f},{y:.1f} L{x-r*.6:.1f},{y-r*.6:.1f} Z" fill="#fff" style="animation-delay:-{R.uniform(0,2.4):.1f}s"/>')
            else: st.append(f'<circle class="tw" cx="{x:.1f}" cy="{y:.1f}" r="{r*.6:.1f}" fill="#fff" style="animation-delay:-{R.uniform(0,2.4):.1f}s"/>')
        g.append('<g>'+''.join(st)+'</g>')
        g.append('<rect width="300" height="423" style="fill:var(--c1)" opacity=".25"/>')
    elif name=='cuir':
        g.append('<filter id="FXF" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="5"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .04  0 0 0 0 .03  0 0 0 1.5 -.35"/></filter>')
        g.append('<rect width="300" height="423" filter="url(#FXF)" opacity=".85"/>')
        g.append('<filter id="FXG" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".003 .9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 -.25"/></filter>')
        g.append('<rect width="300" height="423" filter="url(#FXG)" opacity=".35"/>')
        g.append(f'<path d="{o}" fill="none" stroke="#f0dcaa" stroke-width="1.4" stroke-dasharray="6 4" transform="translate(150 211.5) scale(.93) translate(-150 -211.5)"/>')
        g.append('<radialGradient id="FXL" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#b8bcc4"/><stop offset="1" stop-color="#555a63"/></radialGradient>')
        for (x,y) in ((22,22),(278,22),(22,401),(278,401),(14,150),(286,150),(14,290),(286,290)):
            g.append(f'<circle cx="{x}" cy="{y}" r="4.2" fill="url(#FXL)" stroke="#2a2a30" stroke-width=".8"/>')
    return cp+''.join(g)+'</g>'


def _legsvg():
    import math
    def feathers(row):
        out=[]
        for i in range(9):
            t=i/8; px=150+26+t*118; py=(-2 if row==0 else 6)+(t**1.5)*34
            ang=-10+t*40; L=(52-t*16)*(1 if row==0 else .72); wd=(9-t*2.5)*(1 if row==0 else .8)
            out.append(f'<path d="M0,0 C{L*.3:.1f},{-wd:.1f} {L*.8:.1f},{-wd*.8:.1f} {L:.1f},0 C{L*.8:.1f},{wd*.9:.1f} {L*.3:.1f},{wd:.1f} 0,0 Z" transform="translate({px:.1f} {py:.1f}) rotate({ang:.1f})" fill="url(#LGg)" stroke="#5a3d0c" stroke-width=".8" stroke-linejoin="round"/>'
                       f'<path d="M3,0 L{L*.85:.1f},0" transform="translate({px:.1f} {py:.1f}) rotate({ang:.1f})" stroke="#5a3d0c" stroke-opacity=".5" stroke-width=".6"/>')
        return ''.join(out)
    wing=feathers(0)+feathers(1)
    scroll='<path d="M292,36 C298,46 292,56 284,54 C290,52 291,46 287,43" stroke="url(#LGg)" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    return ('<svg viewBox="0 -26 300 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">'
     '<defs><linearGradient id="LGg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".45" stop-color="#d9a73c"/><stop offset="1" stop-color="#7a5212"/></linearGradient>'
     '<radialGradient id="LGh"><stop offset="0" style="stop-color:var(--gem)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--gem)" stop-opacity="0"/></radialGradient></defs>'
     '<ellipse cx="150" cy="8" rx="150" ry="40" fill="url(#LGh)" class="pulse"/>'
     f'<g id="LGw">{wing}{scroll}</g><use href="#LGw" transform="translate(300 0) scale(-1 1)"/>'
     '<path d="M118,22 Q150,34 182,22" stroke="url(#LGg)" stroke-width="3" fill="none"/>'
     '<polygon points="126,20 121,-4 135,8 142,-10 150,-24 158,-10 165,8 179,-4 174,20" fill="url(#LGg)" stroke="#5a3d0c" stroke-width="1.1" stroke-linejoin="round"/>'
     '<rect x="126" y="17" width="48" height="8" rx="3" fill="url(#LGg)" stroke="#5a3d0c" stroke-width="1"/>'
     '<polygon points="150,-6 160,8 150,22 140,8" style="fill:var(--gem)" stroke="#5a3d0c" stroke-width="1"/><polygon points="150,-6 160,8 150,8" fill="#fff" fill-opacity=".5"/>'
     '<circle cx="121" cy="-5" r="3" fill="#fff"/><circle cx="179" cy="-5" r="3" fill="#fff"/><circle cx="142" cy="-11" r="2.6" fill="#fff"/><circle cx="158" cy="-11" r="2.6" fill="#fff"/><circle cx="150" cy="-26" r="3" fill="#fff"/>'
     '<circle cx="132" cy="21" r="1.8" fill="#fff"/><circle cx="168" cy="21" r="1.8" fill="#fff"/>'
     '<path class="tw" d="M30,-6 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2z M270,-6 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2z" fill="#fff"/>'
     '</svg>')
LEGSVG=_legsvg()

import math as _m
_DEFS=('<defs><linearGradient id="LGg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".45" stop-color="#d9a73c"/><stop offset="1" stop-color="#7a5212"/></linearGradient>'
 '<radialGradient id="LGh"><stop offset="0" style="stop-color:var(--gem)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--gem)" stop-opacity="0"/></radialGradient></defs>')
_ST='stroke="#5a3d0c" stroke-width=".9" stroke-linejoin="round"'
def _wrap(inner): return '<svg viewBox="0 -26 300 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">'+_DEFS+inner+'</svg>'
def _gemd(cx,cy,r=1.0):
    return f'<g transform="translate({cx} {cy}) scale({r})"><polygon points="0,-12 8,0 0,12 -8,0" style="fill:var(--gem)" {_ST}/><polygon points="0,-12 8,0 0,0" fill="#fff" fill-opacity=".5"/></g>'
def _pearl(x,y,r=2.4): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#fff" stroke="#c9b27a" stroke-width=".5"/>'

def leg_A():  # arche filigranée
    o="M6,38 C40,-8 108,-20 150,-20 C192,-20 260,-8 294,38"
    i="M20,38 C48,4 108,-8 150,-8 C192,-8 252,4 280,38"
    band=f'<path d="{o} L280,38 C252,4 192,-8 150,-8 C108,-8 48,4 20,38 Z" fill="url(#LGg)" {_ST}/>'
    sc=''
    for sx in (1,-1):
        t=f'transform="translate({150+sx*0} 0) scale({sx} 1) translate(-150 0)"' if sx==-1 else ''
        sc+=f'<g {t} fill="none" stroke="url(#LGg)" stroke-width="2.4" stroke-linecap="round"><path d="M24,36 C20,48 32,54 38,46 C42,40 34,36 31,41"/><path d="M60,14 C52,24 60,34 70,30 C76,26 70,20 65,24"/><path d="M104,-4 C96,6 102,16 112,14"/></g>'
    fin=''.join(f'<g transform="translate({x} {y}) rotate({a})"><polygon points="0,-9 4,0 0,9 -4,0" fill="url(#LGg)" {_ST}/></g>' for (x,y,a) in ((46,10,-40),(80,-2,-24),(124,-10,-8),(176,-10,8),(220,-2,24),(254,10,40)))
    cen=(f'<circle cx="150" cy="-8" r="19" fill="url(#LGg)" {_ST}/><circle cx="150" cy="-8" r="14.5" fill="#2a1a08" stroke="#f3d77a" stroke-width="1"/>'+_gemd(150,-8,1.15)
         +_pearl(150,-29,3)+_pearl(124,-16)+_pearl(176,-16))
    return _wrap('<ellipse cx="150" cy="6" rx="150" ry="34" fill="url(#LGh)" class="pulse"/>'+band+sc+fin+cen)

def leg_B():  # rayons
    rays=[]
    n=15
    for k in range(n):
        a=_m.radians(188-k*(196/(n-1)))
        bx,by=150+34*_m.cos(a),22+13*_m.sin(a)
        tx,ty=150+150*_m.cos(a),22+48*_m.sin(a)
        nx,ny=-_m.sin(a)*3.4,_m.cos(a)*3.4
        rays.append(f'<polygon points="{bx+nx:.1f},{by+ny:.1f} {tx:.1f},{ty:.1f} {bx-nx:.1f},{by-ny:.1f}" fill="url(#LGg)" {_ST}/>')
    for k in range(n-1):
        a=_m.radians(188-(k+.5)*(196/(n-1)))
        bx,by=150+34*_m.cos(a),22+13*_m.sin(a); tx,ty=150+104*_m.cos(a),22+32*_m.sin(a)
        nx,ny=-_m.sin(a)*2.2,_m.cos(a)*2.2
        rays.append(f'<polygon points="{bx+nx:.1f},{by+ny:.1f} {tx:.1f},{ty:.1f} {bx-nx:.1f},{by-ny:.1f}" fill="#f3d77a" fill-opacity=".85" {_ST}/>')
    crown=('<polygon points="126,22 121,-2 135,10 142,-8 150,-22 158,-8 165,10 179,-2 174,22" fill="url(#LGg)" '+_ST+'/><rect x="126" y="19" width="48" height="8" rx="3" fill="url(#LGg)" '+_ST+'/>'+_gemd(150,8,1.0)+_pearl(150,-24,3)+_pearl(121,-4)+_pearl(179,-4))
    return _wrap('<ellipse cx="150" cy="8" rx="150" ry="36" fill="url(#LGh)" class="pulse"/>'+''.join(rays)+f'<ellipse cx="150" cy="22" rx="38" ry="14" fill="url(#LGg)" {_ST}/>'+crown)

def leg_C():  # diadème
    base=f'<path d="M10,16 Q150,-8 290,16 V30 Q150,6 10,30 Z" fill="url(#LGg)" {_ST}/>'
    pts=''
    xs=list(range(24,277,26))
    for x in xs:
        d=abs(x-150)/126; h=26-18*d; yb=18-26*(1-((x-150)/150)**2)*0.0
        ytop=(15+ (-(1-((x-150)/140)**2))*20)  # suit la courbure
        pts+=f'<polygon points="{x-9},{ytop+12:.1f} {x},{ytop-h:.1f} {x+9},{ytop+12:.1f}" fill="url(#LGg)" {_ST}/>'+_pearl(x,ytop-h-1,2.2)
    gems=''.join(_gemd(x,ytop_c,.55) for x,ytop_c in [(x,(22-(1-((x-150)/140)**2)*20)) for x in range(37,264,26) if x!=150])
    cen=(f'<polygon points="132,20 150,-26 168,20" fill="url(#LGg)" {_ST}/>'+_gemd(150,4,1.2)+_pearl(150,-28,3))
    return _wrap('<ellipse cx="150" cy="6" rx="150" ry="30" fill="url(#LGh)" class="pulse"/>'+base+pts+gems+cen)

def leg_D():  # laurier + couronne
    def branch(sx):
        out=[]
        pts=[(150+sx*(26+t*118), 20+ (t**1.7)*28 - (1-t)*4) for t in [i/10 for i in range(11)]]
        out.append('<path d="M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in pts)+'" fill="none" stroke="url(#LGg)" stroke-width="2.6" stroke-linecap="round"/>')
        for k in range(1,11):
            x,y=pts[k]; x0,y0=pts[k-1]
            ang=_m.degrees(_m.atan2(y-y0,x-x0))
            for side in (-1,1):
                a=ang+side*38*(1 if sx==1 else -1)
                L=15-k*.5
                out.append(f'<path d="M0,0 C{L*.3:.1f},-5 {L*.8:.1f},-5 {L:.1f},0 C{L*.8:.1f},5 {L*.3:.1f},5 0,0 Z" transform="translate({x:.1f} {y:.1f}) rotate({a:.1f})" fill="url(#LGg)" {_ST}/>')
            if k%3==0: out.append(f'<circle cx="{x+sx*0:.1f}" cy="{y+5:.1f}" r="2.4" style="fill:var(--gem)" stroke="#5a3d0c" stroke-width=".6"/>')
        return ''.join(out)
    crown=('<polygon points="128,22 123,0 136,11 143,-6 150,-20 157,-6 164,11 177,0 172,22" fill="url(#LGg)" '+_ST+'/><rect x="128" y="19" width="44" height="7" rx="3" fill="url(#LGg)" '+_ST+'/>'+_gemd(150,8,.95)+_pearl(150,-22,2.8)+_pearl(123,-2)+_pearl(177,-2))
    return _wrap('<ellipse cx="150" cy="10" rx="150" ry="32" fill="url(#LGh)" class="pulse"/>'+branch(1)+branch(-1)+crown)
LEGSVG=leg_A()
LEGVARS=[('A · Arche filigranée',leg_A),('B · Couronne et rayons',leg_B),('C · Diadème',leg_C),('D · Couronne et laurier',leg_D)]

FXSRC={'Aube':'etincelles','Crépuscule':'brume','Volonté':'runes','Prima':'lianes','Arcane':'etoiles','Neutre':'rouages'}
def _gear(cx,cy,r,n,ht,phase,rot=0):
    p=2*_m.pi/n; rr=r-ht*.5; rt=r+ht*.5; pts=[]
    for k in range(n):
        a0=k*p+_m.radians(phase)
        for off,rad in ((-.42,rr),(-.24,rt),(.24,rt),(.42,rr)):
            a=a0+off*p; pts.append(f'{cx+rad*_m.cos(a):.1f},{cy+rad*_m.sin(a):.1f}')
    return 'M'+' L'.join(pts)+' Z'
def fx2(name,W,H):
    R=random.Random(5); o=[]; sm=W<260; k=.8 if sm else 1.0
    if name=='etincelles':
        o.append(f'<radialGradient id="FXG" cx=".5" cy="1" r=".9"><stop offset="0" style="stop-color:var(--gem)" stop-opacity=".5"/><stop offset="1" style="stop-color:var(--gem)" stop-opacity="0"/></radialGradient><rect x="0" y="{H*.45:.0f}" width="{W}" height="{H*.55:.0f}" fill="url(#FXG)"/>')
        for i in range(24 if sm else 46):
            x=R.uniform(3,W-3); y=R.uniform(H*.35,H); r=R.uniform(1.0,2.6 if sm else 3.0)
            col=R.choice(["#fff6c8","#ffffff","#ff9d3a","var(--gem)"])
            o.append(f'<circle class="spark" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" style="fill:{col};animation-delay:-{R.uniform(0,4):.1f}s;animation-duration:{R.uniform(2.4,4.4):.1f}s"/>')
    elif name=='brume':
        for fid,freq,seed,al,cls in (('FXF','.008 .014',3,.15,'mist1'),('FXG','.012 .02',8,.12,'mist2'),('FXK','.018 .03',14,.09,'mist3')):
            o.append(f'<filter id="{fid}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="3" seed="{seed}"/><feColorMatrix values="0 0 0 0 .86  0 0 0 0 .8  0 0 0 0 1  1.8 0 0 0 -.7"/></filter>')
            o.append(f'<g class="{cls}"><rect x="{-W*.4:.0f}" y="{-H*.1:.0f}" width="{W*1.8:.0f}" height="{H*1.2:.0f}" filter="url(#{fid})" opacity="{al}"/></g>')
    elif name=='lianes':
        m=11 if sm else 15; amp=5 if sm else 7
        st='style="stroke:var(--c3)" stroke-width="1.7" fill="none" opacity=".75" stroke-linecap="round"'
        def leaf(x,y,ang,L):
            return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.0f})"><g class="sway" style="animation-delay:-{R.uniform(0,3):.1f}s;animation-duration:{R.uniform(2.4,4):.1f}s">'
                    f'<path d="M0,0 C{L*.3:.1f},{-L*.36:.1f} {L*.7:.1f},{-L*.36:.1f} {L:.1f},0 C{L*.7:.1f},{L*.36:.1f} {L*.3:.1f},{L*.36:.1f} 0,0 Z" style="fill:var(--c3)" opacity=".8"/>'
                    f'<path d="M0,0 L{L*.85:.1f},0" style="stroke:var(--c1)" stroke-opacity=".45" stroke-width=".6"/></g></g>')
        for side in (1,-1):
            x0=m if side==1 else W-m
            pts=[(x0+side*amp*_m.sin(y/17),y) for y in range(int(H-6),6,-6)]
            o.append('<path d="M'+' L'.join(f'{x:.1f},{y}' for x,y in pts)+f'" {st}/>')
            for i,(x,y) in enumerate(pts[::4]):
                base=0 if side==1 else 180
                for sgn in (-1,1):
                    if (i+(sgn>0))%2==0: o.append(leaf(x,y,base+sgn*(38+R.uniform(-8,8)),(13+R.uniform(0,5))*k))
            for i,(x,y) in enumerate(pts[2::11]): o.append(f'<circle cx="{x:.1f}" cy="{y}" r="{2.2*k:.1f}" style="fill:var(--gem)" opacity=".9"/>')
        for yy in (9,):
            pts=[(x,yy+3*_m.sin(x/14)) for x in range(10,int(W-8),6)]
            o.append('<path d="M'+' L'.join(f'{x},{y:.1f}' for x,y in pts)+f'" {st}/>')
            for i,(x,y) in enumerate(pts[::5]):
                o.append(leaf(x,y,(-35 if i%2 else 35)+(0 if yy>H/2 else 180)*0,(12+R.uniform(0,4))*k))
    elif name=='etoiles':
        o.append(f'<radialGradient id="FXG" cx=".3" cy=".15" r=".7"><stop offset="0" style="stop-color:var(--gem)" stop-opacity=".35"/><stop offset="1" style="stop-color:var(--gem)" stop-opacity="0"/></radialGradient><rect width="{W}" height="{H}" fill="url(#FXG)"/>')
        for i in range(34 if sm else 72):
            x=R.uniform(3,W-3); y=R.uniform(3,H-3); r=R.uniform(.7,3.3)*(k if r>0 else 1) if False else R.uniform(.7,3.3)*k
            col=R.choices(["#fff","var(--c3)","var(--gem)"],[55,25,20])[0]
            dl=f'animation-delay:-{R.uniform(0,3.6):.1f}s;animation-duration:{R.uniform(1.6,3.8):.1f}s'
            if r>2.1: o.append(f'<path class="tw" d="M{x:.1f},{y-r*2.3:.1f} L{x+r*.55:.1f},{y-r*.55:.1f} L{x+r*2.3:.1f},{y:.1f} L{x+r*.55:.1f},{y+r*.55:.1f} L{x:.1f},{y+r*2.3:.1f} L{x-r*.55:.1f},{y+r*.55:.1f} L{x-r*2.3:.1f},{y:.1f} L{x-r*.55:.1f},{y-r*.55:.1f} Z" style="fill:{col};{dl}"/>')
            else: o.append(f'<circle class="tw" cx="{x:.1f}" cy="{y:.1f}" r="{r*.7:.1f}" style="fill:{col};{dl}"/>')
    elif name=='runes':
        GL=["M2,0 V16 M2,4 L10,0 M2,9 L10,5","M2,16 V0 L10,5 V16","M2,0 V16 M2,3 L9,7 L2,11","M2,0 V16 M2,2 L10,6 M2,7 L10,11","M2,16 V0 L9,4 L2,8 L10,16","M9,2 L3,8 L9,14","M2,2 L10,14 M10,2 L2,14","M2,0 V16 M10,0 V16 M2,6 L10,10"]
        g=[]; sc=.9*k; stp=26*k
        for i,y in enumerate(range(int(34*k),int(H-60*k),int(stp))):
            g.append(f'<path d="{GL[i%8]}" transform="translate({15*k:.0f} {y}) scale({sc:.2f})"/><path d="{GL[(i+3)%8]}" transform="translate({W-27*k:.0f} {y}) scale({sc:.2f})"/>')
        o.append('<rect width="%d" height="%d" style="fill:var(--c1)" opacity=".18"/>'%(W,H))
        o.append('<g style="stroke:var(--gem);filter:drop-shadow(0 0 2px var(--gem))" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" class="pulse">'+''.join(g)+'</g>')
    elif name=='rouages':
        if not sm: chains=[((12,130,34),[(80,22),(100,28),(75,20)]),((292,215,36),[(-100,24),(-80,30)]),((278,38,26),[(100,18)])]
        else: chains=[((8,100,26),[(80,16),(100,20)]),((234,112,28),[(-100,18)])]
        ht=3.6 if sm else 4.6; pitch=9 if sm else 11
        for ci,(st0,steps) in enumerate(chains):
            gears=[(st0[0],st0[1],st0[2])]; x,y,r=st0
            for (th,r2) in steps:
                x=x+(r+r2)*_m.cos(_m.radians(th)); y=y+(r+r2)*_m.sin(_m.radians(th)); r=r2; gears.append((x,y,r))
            dly=R.uniform(0,5)
            for gi,(x,y,r) in enumerate(gears):
                n=max(8,round(2*_m.pi*r/pitch)); d=3*360/n*(1 if gi%2==0 else -1)
                o.append(f'<g class="gear" style="--d:{d:.2f}deg;animation-delay:-{dly:.1f}s">'
                         f'<path d="{_gear(x,y,r,n,ht,(gi%2)*180/n)}" style="fill:var(--c3);stroke:var(--c1)" fill-opacity=".75" stroke-width="1.2" stroke-linejoin="round"/>'
                         f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r*.62:.1f}" fill="none" style="stroke:var(--c1)" stroke-opacity=".7" stroke-width="1.6"/>'
                         +''.join(f'<path d="M{x:.1f},{y:.1f} L{x+r*.62*_m.cos(_m.radians(a)):.1f},{y+r*.62*_m.sin(_m.radians(a)):.1f}" style="stroke:var(--c1)" stroke-opacity=".6" stroke-width="2.2"/>' for a in range(0,360,72))
                         +f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r*.2:.1f}" style="fill:var(--c1)"/></g>')
    return ''.join(o)

def clip_str(t,small=False):
    d=(SMALL if small else BIG)[t]
    return "path(evenodd,'%s %s')"%(d['O'],d['W'])
def bg_layers(t,src,small=False,u='b'):
    W,H=(240,240) if small else (300,423)
    inner=ids(defs()+fx2(FXSRC[src],W,H),u)
    c=clip_str(t,small)
    return (f'<div class="bg" style="clip-path:{c}"></div><svg class="fxl" viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg" style="clip-path:{c}">{inner}</svg>')

KEYS={'Aube':'aube','Crépuscule':'crepuscule','Volonté':'volonte','Prima':'prima','Arcane':'arcane','Neutre':'neutre'}
def dclayers(small):
    W,H=(240,240) if small else (300,423)
    out='<div class="bg" style="clip-path:{{clip}}"></div>'
    for i,(src,key) in enumerate(KEYS.items()):
        inner=ids(defs()+fx2(FXSRC[src],W,H),'d'+key+('s' if small else 'b'))
        out+=('<sc-if value="{{src_%s}}" hint-placeholder-val="{{%s}}"><svg class="fxl" viewBox="0 0 %d %d" width="%d" height="%d" xmlns="http://www.w3.org/2000/svg" style="clip-path:{{clip}}">'%(key,'true' if i==0 else 'false',W,H,W,H))+inner+'</svg></sc-if>'
    return out
def clip_big(t): return f"clip-path:path('{BIG[t]['O']}')"
def artclip(t,small=False):
    return "clip-path:path('"+(SMALL[t]['W'] if small else BIG[t]['W'])+"')"

# ------- petit format 240x240 -------
SMALL = {
 'creature':dict(O="M12,3 H228 L237,12 V228 L228,237 H12 L3,228 V12 Z",
   W="M56,36 Q120,26 184,36 Q192,38 192,46 V132 Q192,140 184,142 Q120,152 56,142 Q48,140 48,132 V46 Q48,38 56,36 Z",
   gems=[(120,5,.8),(30,92,.8),(210,92,.8)]),
 'artefact':dict(O="M10,3 H230 Q237,3 237,10 V230 Q237,237 230,237 H10 Q3,237 3,230 V10 Q3,3 10,3 Z",
   W="M97.2,30 H142.8 L175,62.2 V107.8 L142.8,140 H97.2 L65,107.8 V62.2 Z",gems=[(120,5,.8),(38,85,.75),(202,85,.75)]),
}
SPLATE="M16,162 L30,150 H210 L224,162 L210,174 H30 Z"
SPARCH="M56,181 H184 L190,186 V200 L184,205 H56 L50,200 V186 Z"
def small_svg(t,u,fx='etincelles_s'):
    d=SMALL[t]; o,w=d['O'],d['W']
    s=['<svg class="fr" viewBox="0 0 240 240" width="240" height="240" xmlns="http://www.w3.org/2000/svg">',defs()]
    s.append(f'<path d="{o}" fill="none" stroke="url(#GG)" stroke-width="5"/><path d="{o}" fill="none" stroke="#2a1a08" stroke-opacity=".7" stroke-width="1.2" transform="translate(120 120) scale(.95) translate(-120 -120)"/>')
    s.append('<g stroke="var(--c3)" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M14,150 C8,170 18,184 11,210 M226,150 C232,170 222,184 229,210"/><path d="M44,228 Q120,222 196,228"/></g>')
    if t=='artefact':
        s.append('<g stroke="url(#GG)" stroke-width="3" fill="none"><path d="M10,26 V10 H26"/><path d="M230,26 V10 H214"/></g>')
    s.append(f'<path d="{w}" fill="none" stroke="#2a1a08" stroke-opacity=".6" stroke-width="7"/><path d="{w}" fill="none" stroke="url(#GG)" stroke-width="4"/><path d="{w}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".7"/>')
    pass  # diamants du cadre retirés
    s.append(f'<path d="{SPLATE}" fill="#2a1a08" fill-opacity=".45" transform="translate(0 2)"/><path d="{SPLATE}" fill="url(#PP)" stroke="url(#GG)" stroke-width="2.5"/>')
    s.append(f'<clipPath id="CP"><path d="{SPARCH}"/></clipPath><path d="{SPARCH}" fill="url(#PP)"/><rect x="48" y="180" width="144" height="26" filter="url(#NN)" clip-path="url(#CP)"/><path d="{SPARCH}" fill="none" stroke="url(#GG)" stroke-width="2.5"/>')
    s.append('<ellipse cx="120" cy="224" rx="16" ry="20" fill="#2a1a08" stroke="url(#GG)" stroke-width="3"/>')
    s.append('</svg>')
    return ids(''.join(s),u)

# ------- fragments HTML -------
CSS = """
body{margin:0}
svg{overflow:visible}
.cd{position:relative;flex:none}
.cd .art{position:absolute;inset:0;z-index:1;background:linear-gradient(160deg,#4d456a,#272238);display:flex;align-items:center;justify-content:center;font:700 11px/1 'Cinzel',serif;letter-spacing:.18em;color:rgba(255,255,255,.4)}
.cd .fr{position:absolute;left:0;top:0;z-index:5;pointer-events:none}
.cd .st{position:absolute;aspect-ratio:1/1;z-index:8}
.cd .st img{position:absolute;inset:0;width:100%;height:100%}
.cd .st b{position:absolute;inset:0;z-index:7;display:flex;align-items:center;justify-content:center;font:700 27px 'Cinzel',serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.85)}
.cd .rar img,.cd .leg img{width:100%;height:100%;display:block}
.cd .rar,.cd .leg{position:absolute;z-index:8;transform:translateX(-50%)}
.big{width:300px;height:423px}
.big .mana{left:-6.5%;top:-6.5%;width:25.5%}.big .mana b{font-size:26px}
.big .atk{left:3%;bottom:-15.8px;width:26%}.big .end{right:3%;bottom:-15.8px;width:26%}
.big .chg{right:3%;bottom:-15.8px;width:26%}.big .chg b{font-size:27px}
.big .nmh{top:338px!important}
.big .nm{position:absolute;z-index:7;left:60px;top:194px;width:182px;height:32px;line-height:32px;text-align:center;font:700 16px/32px 'Cinzel',serif;color:#2a1f10;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.big .tx{position:absolute;z-index:8;left:42px;top:240px;width:216px;height:114px;overflow:hidden;text-align:center;color:#2a2338;font:400 13px/1.3 'Inter',sans-serif}
.big .ty{position:absolute;z-index:9;left:42px;top:357px;width:216px;height:14px;line-height:14px;text-align:center;font:italic 400 10px 'Inter',sans-serif;color:#5a4426;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.big .rar{left:50%;top:373px;width:36px;height:46px}
.big .leg{left:0;top:-26px;width:300px;height:80px;transform:none;z-index:7}
.big .curve{position:absolute;z-index:8;left:50%;top:26px;width:230px;transform:translateX(-50%);display:flex;justify-content:center;align-items:flex-end;font:700 18px 'Cinzel',serif;color:#2a1f10}
.big .curve span{display:inline-block;transform-origin:center 180px;line-height:1}
.sm{width:240px;height:240px}
.sm .mana{left:-1%;top:-3.5%;width:22%}.sm .mana b{font-size:16px}
.sm .atk{left:6%;bottom:5%;width:22%}.sm .end{right:6%;bottom:5%;width:22%}.sm .st b{font-size:19.5px}
.sm .chg{right:10%;bottom:8%;width:13%}.sm .chg b{font-size:11px}
.sm .nm{position:absolute;z-index:7;left:28px;top:150px;width:184px;height:24px;line-height:24px;text-align:center;font:700 12px/24px 'Cinzel',serif;color:#2a1f10;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sm .ty{position:absolute;z-index:9;left:58px;top:181px;width:124px;height:24px;line-height:24px;text-align:center;font:italic 400 8.5px/24px 'Inter',sans-serif;color:#5a4426;white-space:nowrap;overflow:hidden}
.sm .rar{left:50%;top:207px;width:26px;height:34px}
.sm .leg{left:50%;top:-4px;width:26px;height:34px}
.spark{animation:rise 3s linear infinite}
@keyframes rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-70px);opacity:0}}
.flame{transform-box:fill-box;transform-origin:50% 100%;animation:flick 1s ease-in-out infinite}
@keyframes flick{0%,100%{transform:scaleY(1) scaleX(1)}50%{transform:scaleY(1.2) scaleX(.92)}}
.pulse{animation:pulse 3s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
.drift{animation:drift 10s ease-in-out infinite alternate}.drift2{animation:drift 14s ease-in-out infinite alternate-reverse}
@keyframes drift{0%{transform:translateX(-30px)}100%{transform:translateX(30px)}}
.spin{transform-origin:150px 104px;animation:spin 120s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.tw{animation:twinkle 2.4s ease-in-out infinite}
@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:1}}
.cd .bg{position:absolute;inset:0;z-index:2;background:linear-gradient(180deg,var(--c2),var(--c1))}
.cd .fxl{position:absolute;left:0;top:0;z-index:3;pointer-events:none}
.sway{transform-box:fill-box;transform-origin:0% 50%;animation:sway 3.2s ease-in-out infinite alternate}
@keyframes sway{0%{transform:rotate(-11deg)}100%{transform:rotate(11deg)}}
.gear{transform-box:fill-box;transform-origin:50% 50%;animation:gstep 4.5s ease-in-out infinite}
@keyframes gstep{0%,40%{transform:rotate(0deg)}65%,100%{transform:rotate(var(--d))}}
.mist1{animation:mist1 7s ease-in-out infinite alternate}.mist2{animation:mist2 9s ease-in-out infinite alternate}.mist3{animation:mist3 5s ease-in-out infinite alternate}
@keyframes mist1{0%{transform:translate(-45px,6px)}100%{transform:translate(45px,-8px)}}
@keyframes mist2{0%{transform:translate(50px,-6px)}100%{transform:translate(-50px,10px)}}
@keyframes mist3{0%{transform:translate(-30px,0);opacity:.5}100%{transform:translate(30px,-12px);opacity:1}}
.lab{margin-top:10px;font:600 12px 'Inter',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#a79fc4;text-align:center}
"""
HEAD = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>@@T@@</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
 '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">\n<style>'+CSS+'</style>\n</helmet>\n')
def tail(props,logic): return f'</x-dc>\n<script type="text/x-dc" data-dc-script data-props=\'{props}\'>\n{logic}\n</script>\n</body>\n</html>\n'
def img(k): return f'<img src="{ic(k)}" alt="">'
RARK={'Basique':'basique','Commune':'commune','Rare':'rare','Épique':'epique','Mythique':'mythique'}

def static_big(t,src,nom,mana,f,e,rar,leg=False,text='Texte de la carte : effets et mots-clés.',ty='Type - Sous-type',charges=2,u='x',fx='etincelles',legsvg=None):
    h=[f'<div class="cd big" style="{vars_(src)}">',f'<div class="art" style="{artclip(t)}">ILLUSTRATION</div>',bg_layers(t,src,False,'k'+u),big_svg(t,u)]
    if t=='hero':
        n=len(nom); ma=min(60,n*4.2)*.34; st=-ma/2; step=ma/(n-1) if n>1 else 0
        h.append(f'<div class="nm nmh">{nom}</div>')
    else:
        if t!='region': h.append(f'<div class="st mana">{img("mana")}<b>{mana}</b></div>')
        if t=='creature': h.append(f'<div class="st atk">{img("atk")}<b>{f}</b></div><div class="st end">{img("end")}<b>{e}</b></div>')
        if t=='artefact': h.append(f'<div class="st chg">{img("art")}<b>{charges}x</b></div>')
        h.append(f'<div class="nm">{nom}</div><div class="tx">{text}</div><div class="ty">{ty}</div><div class="rar">{img(RARK[rar])}</div>')
        if leg: h.append(f'<div class="leg">{legsvg or LEGSVG}</div>')
    h.append('</div>'); return ''.join(h)

def static_small(t,src,nom,mana,f,e,rar,ty,charges=2,u='s'):
    h=[f'<div class="cd sm" style="{vars_(src)}">',f'<div class="art" style="{artclip(t,True)}">ILLUSTRATION</div>',bg_layers(t,src,True,'k'+u),small_svg(t,u),
       f'<div class="st mana">{img("mana")}<b>{mana}</b></div>']
    if t=='creature': h.append(f'<div class="st atk">{img("atk")}<b>{f}</b></div><div class="st end">{img("end")}<b>{e}</b></div>')
    else: h.append(f'<div class="st chg">{img("art")}<b>{charges}x</b></div>')
    h.append(f'<div class="nm">{nom}</div><div class="ty">{ty}</div><div class="rar">{img(RARK[rar])}</div></div>'); return ''.join(h)

def w(name,s): open(os.path.join(OUT,name),'w').write(s)
TYN={'creature':'Créature','spell':'Sortilège','trap':'Piège','artefact':'Artefact','region':'Région','hero':'Héros'}
SRCS=list(PAL.keys())

# 1) grande carte modifiable (dc)
tpl=[HEAD.replace('@@T@@','Carte dessinée — grand format'),'<div style="width:480px;height:640px;box-sizing:border-box;padding:40px 0;background:#17141f;display:flex;flex-direction:column;align-items:center;gap:28px">',
 '<div style="font-family:\'Cinzel\',serif;font-size:18px;color:#d4af37;letter-spacing:.04em">Carte dessinée — grand format</div>',
 '<div class="cd big" style="--c1:{{c1}};--c2:{{c2}};--c3:{{c3}};--gem:{{gem}}">',dclayers(False)]
for t in BIG:
    inner=[f'<div class="art" style="{artclip(t)}">ILLUSTRATION</div>',big_svg(t,'b'+t[:2])]
    if t=='hero':
        inner.append('<div class="nm nmh">{{nom}}</div>')
    else:
        if t!='region': inner.append(f'<div class="st mana">{img("mana")}<b>{{{{mana}}}}</b></div>')
        if t=='creature': inner.append(f'<div class="st atk">{img("atk")}<b>{{{{force}}}}</b></div><div class="st end">{img("end")}<b>{{{{endurance}}}}</b></div>')
        if t=='artefact': inner.append(f'<div class="st chg">{img("art")}<b>{{{{chargesTxt}}}}</b></div>')
        inner.append('<div class="nm">{{nom}}</div><div class="tx">Texte de la carte : effets et mots-clés.</div><div class="ty">Type - Sous-type</div><div class="rar"><img src="{{rarityImg}}" alt=""></div>')
        inner.append('<sc-if value="{{showLegend}}" hint-placeholder-val="{{false}}"><div class="leg">'+LEGSVG+'</div></sc-if>')
    tpl.append('<sc-if value="{{is_%s}}" hint-placeholder-val="{{%s}}">%s</sc-if>'%(t,'true' if t=='creature' else 'false',''.join(inner)))
tpl.append('</div>\n</div>\n')
RARMAP={k:('/_blob/'+ICON[v]) for k,v in RARK.items()}
P=lambda **k: json.dumps(k,ensure_ascii=False)
props=json.dumps({"source":{"editor":"enum","options":SRCS,"default":"Aube","section":"Carte"},
 "type":{"editor":"enum","options":["Créature","Sortilège","Piège","Artefact","Région","Héros"],"default":"Créature","section":"Carte"},
 "rarete":{"editor":"enum","options":list(RARK.keys()),"default":"Commune","section":"Carte"},
 "legendaire":{"editor":"boolean","default":False,"section":"Carte"},
 "nom":{"editor":"text","default":"Nom de la carte","section":"Carte"},
 "mana":{"editor":"int","default":3,"min":0,"max":20,"section":"Valeurs"},
 "force":{"editor":"int","default":2,"min":0,"max":20,"section":"Valeurs"},
 "endurance":{"editor":"int","default":4,"min":0,"max":20,"section":"Valeurs"},
 "charges":{"editor":"int","default":2,"min":0,"max":9,"section":"Valeurs"},
 "$preview":{"width":480,"height":640}},ensure_ascii=False)
logic="""class Component extends DCLogic {
renderVals() {
const p = this.props;
const PAL = %s;
const TY = {'Créature':'creature','Sortilège':'spell','Piège':'trap','Artefact':'artefact','Région':'region','Héros':'hero'};
const RAR = %s;
const sname = PAL[p.source] ? p.source : 'Aube';
const c = PAL[sname];
const CLIP = @@CLIP@@;
const ty = TY[p.type] || 'creature';
const nom = (p.nom !== undefined && p.nom !== null) ? String(p.nom) : 'Nom de la carte';
const chars = nom.split(''); const n = chars.length;
const maxAngle = Math.min(60, n * 4.2) * 0.34; const start = -maxAngle / 2; const step = n > 1 ? maxAngle / (n - 1) : 0;
const letters = chars.map((ch, i) => ({ ch: ch === ' ' ? '\\u00a0' : ch, deg: (start + step * i).toFixed(2) }));
const num = (v, d) => (v === undefined || v === null || v === '') ? d : v;
return {
c1: c[0], c2: c[1], c3: c[2], gem: c[3],
src_aube: sname==='Aube', src_crepuscule: sname==='Crépuscule', src_volonte: sname==='Volonté', src_prima: sname==='Prima', src_arcane: sname==='Arcane', src_neutre: sname==='Neutre',
clip: CLIP[ty] || CLIP['creature'],
is_creature: ty === 'creature', is_spell: ty === 'spell', is_trap: ty === 'trap', is_artefact: ty === 'artefact', is_region: ty === 'region', is_hero: ty === 'hero',
showLegend: !!p.legendaire, rarityImg: RAR[p.rarete] || RAR['Commune'],
nom: nom, letters: letters,
mana: num(p.mana, 3), force: num(p.force, 2), endurance: num(p.endurance, 4), chargesTxt: num(p.charges, 2) + 'x'
};
}
}"""%(json.dumps(PAL,ensure_ascii=False),json.dumps(RARMAP))
import json as _j
w('CarteDessinee.dc.html',''.join(tpl)+tail(props,logic.replace('@@CLIP@@',_j.dumps({t:clip_str(t) for t in BIG},ensure_ascii=False))))

# 2) petite carte modifiable
tpl=[HEAD.replace('@@T@@','Carte dessinée — petit format'),'<div style="width:480px;height:420px;box-sizing:border-box;padding:40px 0;background:#17141f;display:flex;flex-direction:column;align-items:center;gap:28px">',
 '<div style="font-family:\'Cinzel\',serif;font-size:18px;color:#d4af37;letter-spacing:.04em">Carte dessinée — petit format</div>',
 '<div class="cd sm" style="--c1:{{c1}};--c2:{{c2}};--c3:{{c3}};--gem:{{gem}}">',dclayers(True)]
for t in SMALL:
    inner=[f'<div class="art" style="{artclip(t,True)}">ILLUSTRATION</div>',small_svg(t,'s'+t[:2]),f'<div class="st mana">{img("mana")}<b>{{{{mana}}}}</b></div>']
    if t=='creature': inner.append(f'<div class="st atk">{img("atk")}<b>{{{{force}}}}</b></div><div class="st end">{img("end")}<b>{{{{endurance}}}}</b></div>')
    else: inner.append(f'<div class="st chg">{img("art")}<b>{{{{chargesTxt}}}}</b></div>')
    inner.append('<div class="nm">{{nom}}</div><div class="ty">Type - Sous-type</div><div class="rar"><img src="{{rarityImg}}" alt=""></div>')
    tpl.append('<sc-if value="{{is_%s}}" hint-placeholder-val="{{%s}}">%s</sc-if>'%(t,'true' if t=='creature' else 'false',''.join(inner)))
tpl.append('</div>\n</div>\n')
props2=json.loads(props); props2['type']['options']=['Créature','Artefact']; props2.pop('legendaire'); props2['$preview']={"width":480,"height":420}
logic2=logic.replace("showLegend: !!p.legendaire, ","").replace('@@CLIP@@',_j.dumps({t:clip_str(t,True) for t in SMALL},ensure_ascii=False))
w('CarteDessineePlateau.dc.html',''.join(tpl)+tail(json.dumps(props2,ensure_ascii=False),logic2))

# 3) galerie 6 types
g=[HEAD.replace('@@T@@','Galerie dessinée — 6 types'),'<div style="width:1120px;height:1160px;box-sizing:border-box;padding:48px 56px;background:#17141f;display:flex;flex-direction:column;gap:32px">',
 '<div><h1 style="margin:0;font-family:\'Cinzel\',serif;font-size:30px;color:#d4af37;letter-spacing:.04em">Galerie dessinée — 6 types</h1><div style="font-family:\'Inter\',sans-serif;font-size:14px;color:#a79fc4;margin-top:6px">Cadres entièrement dessinés en code (aucune image de cadre) · seules les icônes sont des images</div></div>']
rows=[('creature','Aube','Nom de la créature',3,2,4,'Commune','Créature - Sous-type',False),
 ('spell','Crépuscule','Nom du sortilège',2,0,0,'Rare','Sortilège',False),
 ('trap','Volonté','Nom du piège',1,0,0,'Épique','Piège',False),
 ('artefact','Prima','Nom de l’artefact',3,0,0,'Commune','Artefact - Sous-type',False),
 ('region','Arcane','Nom de la région',0,0,0,'Mythique','Région',True),
 ('hero','Neutre','Nom du héros',0,0,0,'Basique','',False)]
for r in range(2):
    g.append('<div style="display:flex;justify-content:space-between;gap:48px">')
    for (t,s,n,m,f,e,ra,ty,lg) in rows[r*3:r*3+3]:
        g.append('<div>'+static_big(t,s,n,m,f,e,ra,lg,ty=ty,u='g%s'%t[:3])+f'<div class="lab">{TYN[t]} · {s}</div></div>')
    g.append('</div>')
g.append('</div>\n')
w('GalerieDessinee.dc.html',''.join(g)+tail('{"$preview":{"width":1120,"height":1160}}','class Component extends DCLogic {\nrenderVals() { return {}; }\n}'))

# 4) galerie 6 sources (créature)
g=[HEAD.replace('@@T@@','Galerie dessinée — 6 sources'),'<div style="width:1120px;height:1160px;box-sizing:border-box;padding:48px 56px;background:#17141f;display:flex;flex-direction:column;gap:32px">',
 '<div><h1 style="margin:0;font-family:\'Cinzel\',serif;font-size:30px;color:#d4af37;letter-spacing:.04em">Galerie dessinée — 6 sources</h1><div style="font-family:\'Inter\',sans-serif;font-size:14px;color:#a79fc4;margin-top:6px">Même créature, une couleur par source</div></div>']
raras=['Basique','Commune','Rare','Épique','Mythique','Commune']
for r in range(2):
    g.append('<div style="display:flex;justify-content:space-between;gap:48px">')
    for i in range(r*3,r*3+3):
        s=SRCS[i]; g.append('<div>'+static_big('creature',s,'Nom de la créature',i+1,i+1,i+2,raras[i],ty='Créature - Sous-type',u='h%d'%i)+f'<div class="lab">{s} · {raras[i]}</div></div>')
    g.append('</div>')
g.append('</div>\n')
w('SourcesDessinees.dc.html',''.join(g)+tail('{"$preview":{"width":1120,"height":1160}}','class Component extends DCLogic {\nrenderVals() { return {}; }\n}'))

# 5) galerie petit format
g=[HEAD.replace('@@T@@','Galerie dessinée — petit format'),'<div style="width:1720px;height:800px;box-sizing:border-box;padding:48px 56px;background:#17141f;display:flex;flex-direction:column;gap:32px">',
 '<div><h1 style="margin:0;font-family:\'Cinzel\',serif;font-size:30px;color:#d4af37;letter-spacing:.04em">Petit format dessiné — créatures et artefacts</h1></div>']
for t,tyl in (('creature','Créature - Sous-type'),('artefact','Artefact - Sous-type')):
    g.append('<div style="display:flex;justify-content:space-between">')
    for i,s in enumerate(SRCS):
        g.append('<div>'+static_small(t,s,'Nom de la carte',i+1,i+1,i+2,raras[i],tyl,u='p%s%d'%(t[:2],i))+f'<div class="lab">{s}</div></div>')
    g.append('</div>')
g.append('</div>\n')
w('PlateauDessine.dc.html',''.join(g)+tail('{"$preview":{"width":1720,"height":800}}','class Component extends DCLogic {\nrenderVals() { return {}; }\n}'))

g=[HEAD.replace('@@T@@','Légendaire — 4 variantes'),'<div style="width:1480px;height:760px;box-sizing:border-box;padding:48px 56px;background:#17141f;display:flex;flex-direction:column;gap:56px">',
 '<div><h1 style="margin:0;font-family:\'Cinzel\',serif;font-size:30px;color:#d4af37;letter-spacing:.04em">Légendaire — 4 variantes d\'ornement</h1><div style="font-family:\'Inter\',sans-serif;font-size:14px;color:#a79fc4;margin-top:6px">Même carte (Arcane), ornement pleine largeur en haut de la carte</div></div>',
 '<div style="display:flex;justify-content:space-between;padding-top:20px">']
for i,(lab,fn) in enumerate(LEGVARS):
    g.append('<div>'+static_big('creature','Arcane','Nom de la créature',5,5,4,'Mythique',True,ty='Créature - Sous-type',u='lg%d'%i,legsvg=fn())+f'<div class="lab">{lab}</div></div>')
g.append('</div></div>\n')
w('LegendaireVariantes.dc.html',''.join(g)+tail('{"$preview":{"width":1480,"height":760}}','class Component extends DCLogic {\nrenderVals() { return {}; }\n}'))
print('ok')
