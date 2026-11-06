"""Rebuild public research graphics from supplied daily data and manuscript metrics."""
from pathlib import Path
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
ROOT=Path(__file__).resolve().parents[1]
# Original daily observations; only coincident, non-missing Olea values are compared.
a=pd.read_csv(ROOT/'data/comparison-automatic.csv',sep=';')
h=pd.read_csv(ROOT/'data/comparison-hirst.csv',sep=';')
for d in [a,h]:
 d['Date']=pd.to_datetime(d.Date,dayfirst=True)
 d['Olea']=pd.to_numeric(d.Olea,errors='coerce')
fig,axes=plt.subplots(2,2,figsize=(12,6),layout='constrained')
for ax,(auto,city,label) in zip(axes.flat,[('Baena','BAENA','Baena'),('Campus RABANALES','CÓRDOBA','Córdoba / Rabanales'),('Montilla','MONTILLA','Montilla'),('Priego de Córdoba','PRIEGO','Priego de Córdoba')]):
 paired=a[a.Site==auto][['Date','Olea']].merge(h[h.City==city][['Date','Olea']],on='Date',suffixes=('_auto','_hirst')).dropna()
 paired=paired.set_index('Date').sort_index()
 if paired.empty: continue
 dates=pd.date_range(paired.index.min(),paired.index.max()); series=paired.reindex(dates)
 ax.plot(dates,series.Olea_hirst,color='#126e82',label='Hirst',lw=1.8)
 ax.plot(dates,series.Olea_auto,color='#c16b26',label='Automático',lw=1.8)
 ax.set_title(f'{label} · {len(paired)} días coincidentes',loc='left',weight='bold')
 ax.set_ylabel('Olea (granos/m³)'); ax.set_ylim(bottom=0); ax.grid(axis='y',alpha=.15)
 import matplotlib.dates as md
 ax.xaxis.set_major_formatter(md.DateFormatter('%d/%m')); ax.xaxis.set_major_locator(md.AutoDateLocator(minticks=3,maxticks=5))
axes[0,0].legend(frameon=False)
fig.savefig(ROOT/'images/comparacion-hirst.svg'); plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(11,3.8),layout='constrained')
ax=axes[0]; labels=['Con polen','Sin polen']; vals=[16,22.7]
ax.barh(labels,vals,color=['#126e82','#d7ae71'],height=.5)
for i,v in enumerate(vals): ax.text(v+.4,i,f'{v:.1f} %'.replace('.',','),va='center',weight='bold')
ax.set_xlim(0,28); ax.set_xlabel('Error relativo medio (%)'); ax.set_title('Andalucía · aporte del polen',loc='left',weight='bold')
ax=axes[1]; vals=[15.8,16,17.9]; ax.scatter(vals,[2,1,0],s=150,color=['#126e82','#126e82','#c16b26'])
ax.set_yticks([2,1,0],['Córdoba','Andalucía','España']); ax.set_xlim(0,23); ax.set_ylim(-.6,2.6)
for y,v in zip([2,1,0],vals): ax.text(v+.6,y,f'{v:.1f} %'.replace('.',','),va='center',weight='bold')
ax.set_xlabel('Error relativo medio (%)'); ax.set_title('Mayo · escala territorial',loc='left',weight='bold')
for ax in axes: ax.grid(axis='x',alpha=.15); ax.set_axisbelow(True)
fig.savefig(ROOT/'images/prediccion-cosecha.svg'); plt.close(fig)
