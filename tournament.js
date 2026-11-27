const entries=()=>names.value.split(/\r?\n/).map(n=>n.trim()).filter(Boolean);
// grupe de ~3: 10 -> 4+3+3, 7 -> 4+3, 12 -> 3+3+3+3
function sizes(n){let g=Math.max(1,Math.floor(n/3)),base=Math.floor(n/g),extra=n%g;return Array.from({length:g},(_,i)=>base+(i<extra?1:0))}
function desc(n){let c={};sizes(n).forEach(k=>c[k]=(c[k]||0)+1);return Object.keys(c).sort((a,b)=>b-a).map(k=>c[k]+(c[k]===1?' grupă':' grupe')+' de '+k).join(' + ')}
function count(){let n=entries().length;$('count').textContent=n+' jucători'+(n>1?' • '+desc(n):'');$('start').disabled=n<2}

function shuffle(list,random=Math.random){for(let i=list.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list}
function split(players){let bag=shuffle(players.slice());return sizes(players.length).map(k=>bag.splice(0,k))}
// tabloul eliminatoriu; încearcă să evite meciuri între jucători din aceeași grupă
function seed(q,random=Math.random){let size=2**Math.ceil(Math.log2(q.length)),best;for(let t=0;t<200;t++){let bag=shuffle(q.slice(),random),pairs=[];for(let i=0;i<size/2;i++)pairs.push([bag.pop(),i<size-q.length?null:bag.pop()]);best=pairs;if(pairs.every(([a,b])=>!b||a.g!==b.g))break}return shuffle(best,random).map(p=>p.map(x=>x&&x.n))}
let think=null;

const letters=i=>String.fromCharCode(65+i);
const fx=g=>g.flatMap((a,i)=>g.slice(i+1).map(b=>[a,b]));
const gdone=()=>state.groups.every((g,gi)=>fx(g).every((_,i)=>state.results['g'+gi+'-'+i]));
// ordinea meciurilor dintr-o grupă: cine tocmai a jucat se odihnește dacă se poate, iar câștigătorul stă cel mai mult
function order(gi){let g=state.groups[gi],f=fx(g).map(([a,b],i)=>({a,b,i,id:'g'+gi+'-'+i})),seq=f.filter(m=>state.results[m.id]).sort((x,y)=>state.history.indexOf(x.id)-state.history.indexOf(y.id)),rest=f.filter(m=>!state.results[m.id]),gp={};g.forEach(n=>gp[n]=0);seq.forEach(m=>{gp[m.a]++;gp[m.b]++});
let last=seq[seq.length-1];
while(rest.length){let lw=last&&state.results[last.id]&&state.results[last.id].winner,score=m=>[m.a,m.b].reduce((t,n)=>t+(last&&(n===last.a||n===last.b)?(n===lw?3:1):0)+gp[n]*.1,0);
rest.sort((x,y)=>score(x)-score(y)||x.i-y.i);let m=rest.shift();seq.push(m);gp[m.a]++;gp[m.b]++;last=m}
return seq}
function table(gi,tournament=state){let g=tournament.groups[gi],t=new Map(g.map(n=>[n,{n,j:0,w:0,d:0,sc:0,beat:[]}]));
fx(g).forEach(([a,b],i)=>{let r=tournament.results['g'+gi+'-'+i];if(!r)return;let w=r.winner,l=w===a?b:a;t.get(w).w++;t.get(w).j++;t.get(l).j++;t.get(w).beat.push(l);if(r.scores){let d=Math.abs(r.scores[0]-r.scores[1]);t.get(w).d+=d;t.get(l).d-=d;t.get(w).sc++;t.get(l).sc++}});
let arr=[...t.values()].sort((x,y)=>y.w-x.w||y.d-x.d),K=tournament.groups.length===1?1:tournament.adv,pk=(tournament.tb&&tournament.tb[gi])||[],out=[];out.tie=null;
for(let i=0,j;i<arr.length;i=j){j=i;while(j<arr.length&&arr[j].w===arr[i].w&&arr[j].d===arr[i].d)j++;let run=arr.slice(i,j);
if(run.length===2&&(run[0].beat.includes(run[1].n)||run[1].beat.includes(run[0].n))){if(run[1].beat.includes(run[0].n))run.reverse()}
else if(run.length>1){let p=run.filter(r=>pk.includes(r.n)).sort((x,y)=>pk.indexOf(x.n)-pk.indexOf(y.n)),q=run.filter(r=>!pk.includes(r.n));run=p.concat(q);if(i<K&&j>K&&p.length<K-i)out.tie={run:q,slot:i+p.length+1}}
out.push(...run)}
return out}
const gfin=gi=>fx(state.groups[gi]).every((_,i)=>state.results['g'+gi+'-'+i]);

function crown(board,w,s2){let c=el('section',null,'winner');el('small','turneu încheiat',null,c);el('h2','🏆 '+w,null,c);if(s2)el('p','locul 2: '+s2,null,c);if(state.results['3rd'])el('p','locul 3: '+state.results['3rd'].winner,null,c);board.prepend(c)}
let showOdds=true;try{showOdds=localStorage.getItem('raliu-odds')!=='0'}catch{}
const CERTAIN=.6; // sub acest prag (favorit < 60%) meciul e prea echilibrat și nu arătăm indiciu
function nextHint(seq,p){const m=seq[p],A=E.r[nk(m.a)],B=E.r[nk(m.b)];const pa=raliuOdds.ratingChance(A,B);if(pa===null||Math.max(pa,1-pa)<CERTAIN)return null;const win=pa>.5?m.a:m.b,lose=pa>.5?m.b:m.a,n=seq.slice(p+1).find(x=>(x.a===lose||x.b===lose)&&x.a!==win&&x.b!==win);return n?lose+' – '+(n.a===lose?n.b:n.a):null}

function render(){
 const d={},focused=document.activeElement?.dataset?.k;
 document.querySelectorAll('#board input[data-k]').forEach(i=>{if(i.value)d[i.dataset.k]=i.value});
 drafts=d;render0();
 if(focused){const field=[...document.querySelectorAll('#board input[data-k]')].find(i=>i.dataset.k===focused);if(field)field.focus()}
}
function render0(){let board=$('board');board.replaceChildren();$('setup').hidden=!!state;if(!state){count();return}
let G=state.groups,nav=el('nav',null,'row',board);el('small',state.players.length+' participanți • primul la '+(state.target??11)+' • '+G.length+(G.length===1?' grupă':' grupe'),null,nav);
button('anulează ultimul rezultat','',nav,()=>journal.send('undo',{tid:state.tid,id:state.history.at(-1)})).disabled=!state.history.length;
let nb=button('turneu nou','',nav,()=>{if(state.history.length&&!nb.dataset.sure){nb.dataset.sure='1';nb.textContent='sigur? apasă din nou';setTimeout(()=>{nb.dataset.sure='';nb.textContent='turneu nou'},4000);return}names.value=state.players.join('\n');journal.send('end',{tid:state.tid})});
const oddsSwitch=button('cote live','odds-switch',nav,()=>{
 showOdds=!showOdds;
 try{localStorage.setItem('raliu-odds',showOdds?'1':'0')}catch{}
 render();
 document.getElementById('odds-switch')?.focus({preventScroll:true});
});
oddsSwitch.id='odds-switch';
oddsSwitch.setAttribute('role','switch');
oddsSwitch.setAttribute('aria-checked',String(showOdds));
el('span',null,'odds-track',oddsSwitch).setAttribute('aria-hidden','true');
renderForecast(board,state,E);
el('h3','faza grupelor',null,board);
let K=G.length===1?1:state.adv,gok=gi=>gfin(gi)&&!table(gi).tie,cur=G.findIndex((g,gi)=>!gok(gi)),done=cur<0;
G.forEach((g,gi)=>{let s=el('section',null,'',board),rows=table(gi);el('h2','grupa '+letters(gi),null,s);
let t=el('table',null,'',s),h=el('tr',null,'',el('thead',null,'',t));['jucător','J','V','+/−'].forEach(x=>el('th',x,null,h));
let tb=el('tbody',null,'',t);rows.forEach((r,i)=>{let tr=el('tr',null,gok(gi)&&G.length>1&&i<K?'winner':'',tb);el('td',r.n,null,tr);el('td',r.j,null,tr);el('td',r.w,null,tr);el('td',r.sc?(r.d>0?'+'+r.d:r.d):'–',null,tr)});
if(cur>=0&&gi>cur)return;
if(gfin(gi)&&rows.tie){let c=el('article',null,'',s),T=rows.tie;el('small','egalitate','badge',c);el('p','egalitate perfectă între '+T.run.map(r=>r.n).join(', ')+' — alege cine ocupă locul '+T.slot+' în grupă:',null,c);T.run.forEach(r=>button(r.n,'player',c,()=>journal.send('tie',{tid:state.tid,group:gi,name:r.n})))}
let seq=order(gi),p=seq.filter(m=>state.results[m.id]).length;
if(p){let d=el('details',null,'',s);el('summary','meciuri jucate ('+p+')',null,d);seq.slice(0,p).forEach((m,k)=>match(d,m.a,m.b,m.id,'meci '+(k+1)))}
if(p<seq.length){if(think===gi){let c=el('article',null,'think',s);el('small','meci '+(p+1),'badge',c);el('p','se alege următorul meci…',null,c)}
else{let m=seq[p],r=seq.length-p-1,h=showOdds?nextHint(seq,p):null;match(s,m.a,m.b,m.id,'se joacă acum • meci '+(p+1));if(r)el('small','încă '+r+(r===1?' meci':' meciuri')+' în grupă'+(h?' • urmează probabil '+h:''),null,s)}}});
if(!done)return;
if(G.length===1){crown(board,table(0)[0].n);return}
if(!state.pairs)return;
el('h3','faza eliminatorie',null,board);
let pairs=state.pairs,round=0,block=false,nw=false;
while(pairs.length){let next=[];let rd=el('details',null,'rh',board);rd.open=true;el('summary',pairs.length===1?'finală':pairs.length===2?'semifinale':pairs.length===4?'sferturi de finală':pairs.length===8?'optimi de finală':'turul '+(round+1),null,rd);
pairs.forEach(([a,b],i)=>{if(block){next.push(undefined);return}let id=round+'-'+i,bye=round===0&&b===null,winner;
if(bye){winner=a;let c=el('article',null,'',rd);el('small','meci '+(i+1),'badge',c);el('p',a+' trece automat în turul următor.',null,c)}
else{let lab=!state.results[id]&&a&&b&&!nw?(nw=true,'se joacă acum • meci '+(i+1)):'meci '+(i+1);match(rd,a,b,id,lab);winner=state.results[id]&&state.results[id].winner;if(!winner)block=true}
next.push(winner);if(pairs.length===1&&winner)crown(board,winner,winner===a?b:a)});
if(pairs.length===2&&!block&&!(round===0&&pairs.some(p=>p[1]===null))){let L=pairs.map(([a,b],i)=>{let r=state.results[round+'-'+i];return r.winner===a?b:a});el('h3','mica finală',null,board);match(board,L[0],L[1],'3rd',state.results['3rd']?'meci':'se joacă acum • mica finală');if(!state.results['3rd'])block=true}
if(!block&&pairs.length>1)rd.open=false;if(block||next.length===1)break;pairs=[];for(let j=0;j<next.length;j+=2)pairs.push(next.slice(j,j+2));round++}}
