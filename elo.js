// ---- elo (separat de turneu, rămâne salvat în browser) ----
const ek='raliu-elo-v1';let E={r:{},log:[]};try{E=JSON.parse(localStorage.getItem(ek))||E}catch{}
const esave=()=>{E.t=Math.max(Date.now(),(E.t||0)+1);if(E.log.length>300)E.log=E.log.slice(-300);try{localStorage.setItem(ek,JSON.stringify(E))}catch{}firebaseSync.push('elo/ratings',()=>JSON.stringify(E),E.t)};
const nk=n=>Object.keys(E.r).find(k=>k.toLowerCase()===n.toLowerCase())||n;
function elo(id,a,b,w,sc){state.tid=state.tid||Math.random().toString(36).slice(2);let P=n=>{n=nk(n);return E.r[n]||(E.r[n]={e:1000,g:0,w:0,c:0})},A=P(a),B=P(b),ea=1/(1+10**((B.e-A.e)/400)),win=w===a,d=sc?Math.min(Math.abs(sc[0]-sc[1]),11):0,k=32*(1+d/11),da=Math.round(k*((win?1:0)-ea)),db=-da;
E.log.push({t:state.tid,id,a,b,w,scores:sc,playedAt:Date.now(),da,db,pa:A.c,pb:B.c});A.e+=da;B.e+=db;A.g++;B.g++;(win?A:B).w++;A.c=da;B.c=db;esave()}
function eloUndo(id){let i=E.log.map(x=>x.t===state.tid&&x.id===id).lastIndexOf(true);if(i<0)return;let x=E.log.splice(i,1)[0],A=E.r[nk(x.a)],B=E.r[nk(x.b)];if(A&&B){A.e-=x.da;B.e-=x.db;A.g--;B.g--;E.r[nk(x.w)].w--;A.c=x.pa;B.c=x.pb}esave()}
function eloRender(){let v=$('eloview');v.replaceChildren();let s=el('section',null,'',v);el('small','clasament',null,s);el('h2','elo',null,s);el('p','toți încep de la 1000. o victorie la scor mare contează mai mult.',null,s);
el('small','setează elo manual',null,s);el('p','pentru cei foarte buni, ex. 1300. dacă scrii din nou numele, elo-ul se schimbă.',null,s);
let f=el('form',null,'scores',s),l1=el('label','nume',null,f),ni=el('input',null,'',l1),l2=el('label','elo',null,f),ei=el('input',null,'',l2);Object.assign(ni,{type:'text',required:true});Object.assign(ei,{type:'number',inputMode:'numeric',min:'100',max:'3000',step:'1',required:true});el('button','setează','primary',f);
f.onsubmit=e=>{e.preventDefault();let n=ni.value.trim(),v=Math.round(+ei.value);if(!n||!v)return;let k=nk(n),x=E.r[k]||(E.r[k]={e:1000,g:0,w:0,c:0});x.e=v;x.s=1;x.c=0;esave();eloRender()};
let rows=Object.entries(E.r).filter(([,x])=>x.g||x.s).sort((x,y)=>y[1].e-x[1].e);
if(!rows.length){el('p','niciun meci încă. rezultatele din turneu apar aici.',null,s);return}
let t=el('table',null,'',s),h=el('tr',null,'',el('thead',null,'',t));['jucător','elo','±','J','V'].forEach(x=>el('th',x,null,h));let tb=el('tbody',null,'',t);
rows.forEach(([n,x],i)=>{let tr=el('tr',null,'',tb);let td=el('td',(i+1)+'. '+n,null,tr);button('×','',td,()=>{delete E.r[n];esave();eloRender()}).style.cssText='display:inline-block;width:auto;min-height:0;margin-left:8px;padding:0 8px';el('td',x.e,null,tr);el('td',x.c>0?'▲'+x.c:x.c<0?'▼'+(-x.c):'–',x.c>0?'up':x.c<0?'down':'',tr);el('td',x.g,null,tr);el('td',x.w,null,tr)});
let rb=button('resetează elo','',s,()=>{if(!rb.dataset.sure){rb.dataset.sure='1';rb.textContent='sigur? apasă din nou';setTimeout(()=>{rb.dataset.sure='';rb.textContent='resetează elo'},4000);return}E={r:{},log:[]};esave();eloRender()})}
