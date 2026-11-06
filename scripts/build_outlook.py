"""Plot observed olive-fruit production and the user's provisional 2026/27 band.
The band is user-provided, not a model confidence interval. Bounds are not printed.
Historical Crop_And values are tonnes; the requested display unit is million tonnes.
"""
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
rows=pd.read_excel(ROOT/'data/Crop_Anuarios_JA.xlsx',sheet_name='Crop')
# Keep the lower outlook threshold; extend the upper edge to the observed historical maximum.
BAND=(5.75, float(rows.Crop_And.max()) / 1e6)
def graphic(data,mobile=False):
 w,h=(560,440) if mobile else (960,480)
 left,right,top,bottom=(58,w-18,70,h-68)
 future_width=100 if mobile else 144
 past_right=right-future_width
 yy=lambda v: bottom-(v/8)*(bottom-top)
 xx=lambda i: left+i*(past_right-left-20)/max(1,len(data)-1)
 future_x=right-future_width/2+8
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc">',
 '<title id="title">Cosecha de aceituna en Andalucía y horizonte 2026/27</title>',
 '<desc id="desc">Serie de cosechas observadas en millones de toneladas y banda gris orientativa en la zona alta para la campaña 2026/27, sin estimación puntual.</desc>',
 '<style>text{font-family:system-ui,-apple-system,Segoe UI,sans-serif;fill:#52635a} .label{font-size:14px}.axis{font-size:14px}.heading{font-size:18px;font-weight:650;fill:#203b2e}</style>',
 '<rect width="100%" height="100%" fill="#fcfcf8" rx="16"/>',
 '<text x="24" y="28" class="heading">Andalucía · Aceituna fruto</text>',
 '<text x="24" y="50" class="label">Millones de toneladas</text>',
 f'<rect x="{past_right+8}" y="{top-10}" width="{right-past_right}" height="{bottom-top+20}" rx="14" fill="#eeefea"/>']
 for v in [0,2,4,6,8]:
  y=yy(v);out.extend([f'<path d="M {left} {y:.2f} H {right}" stroke="#e0e5dd" stroke-width="1"/>',f'<text x="{left-12}" y="{y+5:.2f}" text-anchor="end" class="axis">{v}</text>'])
 points=' '.join(f'{xx(i):.2f},{yy(float(r.Crop_And)/1e6):.2f}' for i,r in enumerate(data.itertuples()))
 out.append(f'<polyline points="{points}" fill="none" stroke="#2b6a4b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>')
 for i,r in enumerate(data.itertuples()):
  y=yy(float(r.Crop_And)/1e6)
  out.append(f'<circle cx="{xx(i):.2f}" cy="{y:.2f}" r="{3 if len(data)>15 else 4}" fill="#2b6a4b"><title>{str(r.Season).replace("_","/")}: {float(r.Crop_And)/1e6:.2f} millones de toneladas observadas</title></circle>')
 label_indices={0,len(data)-1,len(data)//2} if mobile else ({0,2,4,6,len(data)-1} if len(data)<=10 else {0,8,16,24,32,len(data)-1})
 for i,r in enumerate(data.itertuples()):
  if i not in label_indices:continue
  label=f'{int(r.Year)}/{str(int(r.Year)+1)[-2:]}'
  out.append(f'<text x="{xx(i):.2f}" y="{bottom+29}" text-anchor="middle" class="axis">{label}</text>')
 bw=52 if mobile else 68
 out.extend([f'<path d="M {past_right+8} {top-10} V {bottom+10}" stroke="#aeb9ac" stroke-dasharray="4 5"/>',
 f'<rect x="{future_x-bw/2}" y="{yy(BAND[1]):.2f}" width="{bw}" height="{yy(BAND[0])-yy(BAND[1]):.2f}" rx="6" fill="#a9aea7" stroke="#7c877d" stroke-width="1.5"/>',
 f'<text x="{future_x}" y="{yy(BAND[1])-16:.2f}" text-anchor="middle" class="label" style="font-weight:600;fill:#435342">Franja alta</text>',
 f'<text x="{future_x}" y="{bottom+29}" text-anchor="middle" class="axis" style="font-weight:700;fill:#203b2e">2026/27</text>',
 f'<text x="{w/2}" y="{h-13}" text-anchor="middle" class="label">Campaña</text>', '</svg>'])
 return '\n'.join(out)
for period,data in [('recent',rows.tail(10)),('full',rows)]:
 for mobile in [False,True]:
  suffix='-mobile' if mobile else ''
  (ROOT/f'images/cosecha-2026-27-{period}{suffix}.svg').write_text(graphic(data,mobile))
print('Generated four responsive observed/outlook graphics from 44 historical campaigns.')
