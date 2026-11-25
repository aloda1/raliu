// ---- backup: validează înainte să schimbe ceva ----
// Validate the complete candidate before restore can mutate or publish state.
function validateBackup(d){
 const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const integer=x=>Number.isSafeInteger(x);
 const count=x=>integer(x)&&x>=0;
 const name=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&!['__proto__','constructor','prototype'].includes(x);
 const unique=a=>new Set(a).size===a.length;
 const check=(v,message)=>{if(!v)throw new Error(message)};
 check(obj(d)&&d.app==='raliu'&&d.v===1,'format necunoscut');
 const L=d.elo,T=d.tournament;
 check(obj(L)&&obj(L.r)&&Array.isArray(L.log),'elo invalid');
 check(L.t===undefined||count(L.t),'data elo invalidă');
 const keys=Object.keys(L.r);
 check(keys.every(name)&&unique(keys.map(n=>n.toLocaleLowerCase('ro'))),'nume elo invalide');
 for(const x of Object.values(L.r))check(obj(x)&&integer(x.e)&&count(x.g)&&count(x.w)&&x.w<=x.g&&integer(x.c)&&(x.s===undefined||x.s===1),'statistici elo invalide');
 for(const x of L.log)check(obj(x)&&name(x.t)&&typeof x.id==='string'&&/^(g\d+-\d+|\d+-\d+|3rd)$/.test(x.id)&&name(x.a)&&name(x.b)&&x.a!==x.b&&[x.a,x.b].includes(x.w)&&integer(x.da)&&integer(x.db)&&x.da===-x.db&&integer(x.pa)&&integer(x.pb),'istoric elo invalid');
 if(T===null)return d;
 check(obj(T)&&Array.isArray(T.players)&&T.players.length>=2&&T.players.every(name)&&unique(T.players.map(n=>n.toLocaleLowerCase('ro'))),'jucători invalizi');
 check([1,2].includes(T.adv)&&Array.isArray(T.groups)&&T.groups.length>0&&T.groups.every(g=>Array.isArray(g)&&g.length>=2&&g.every(n=>T.players.includes(n))),'grupe invalide');
 const members=T.groups.flat();check(unique(members)&&members.length===T.players.length,'grupele nu corespund jucătorilor');
 check(T.tid===undefined||name(T.tid),'id de turneu invalid');
 check(obj(T.results)&&Array.isArray(T.history)&&T.history.every(x=>typeof x==='string')&&unique(T.history),'istoric invalid');
 const ids=Object.keys(T.results);
 check(ids.length===T.history.length&&T.history.every(id=>Object.hasOwn(T.results,id)),'rezultate lipsă din istoric');
 for(const r of Object.values(T.results))check(obj(r)&&name(r.winner)&&(r.scores==null||(Array.isArray(r.scores)&&r.scores.length===2&&r.scores.every(count)&&r.scores[0]!==r.scores[1])),'scor invalid');
 if(T.tb!==undefined){
  check(obj(T.tb),'departajări invalide');
  for(const [gi,picks] of Object.entries(T.tb))check(/^(0|[1-9]\d*)$/.test(gi)&&T.groups[+gi]&&Array.isArray(picks)&&unique(picks)&&picks.every(n=>T.groups[+gi].includes(n)),'departajare invalidă');
 }
 const matches=new Map(),groupIds=[];
 const add=(id,a,b,deps=[])=>{matches.set(id,{a,b,deps});const r=T.results[id];if(r){check(a&&b&&a!==b&&[a,b].includes(r.winner),'câștigător invalid: '+id);if(r.scores)check(r.winner===(r.scores[0]>r.scores[1]?a:b),'scorul nu corespunde câștigătorului: '+id)}return r?.winner};
 T.groups.forEach((g,gi)=>fx(g).forEach(([a,b],i)=>{const id='g'+gi+'-'+i;groupIds.push(id);add(id,a,b)}));
 if(T.pairs!=null){
  check(T.groups.length>1&&groupIds.every(id=>T.results[id]),'tablou înainte de încheierea grupelor');
  let qualified;
  const previous=state;
  try{state=T;qualified=T.groups.flatMap((g,gi)=>{const rows=table(gi);check(!rows.tie,'departajare nerezolvată');return rows.slice(0,T.adv).map(r=>r.n)})}finally{state=previous}
  const size=2**Math.ceil(Math.log2(qualified.length));
  check(Array.isArray(T.pairs)&&T.pairs.length===size/2&&T.pairs.every(p=>Array.isArray(p)&&p.length===2&&name(p[0])&&(p[1]===null||name(p[1]))),'tablou invalid');
  const seeded=T.pairs.flat().filter(n=>n!==null);
  check(unique(seeded)&&seeded.length===qualified.length&&seeded.every(n=>qualified.includes(n)),'calificați incorecți');
  let pairs=T.pairs,round=0,deps=groupIds.slice();
  while(pairs.length){
   const next=[],roundIds=[];
   pairs.forEach(([a,b],i)=>{const id=round+'-'+i;if(round===0&&b===null){next.push(a);return}roundIds.push(id);next.push(add(id,a,b,deps))});
   let third=false;
   if(pairs.length===2&&!(round===0&&pairs.some(p=>p[1]===null))){
    third=true;const losers=pairs.map(([a,b],i)=>next[i]?(next[i]===a?b:a):undefined);
    add('3rd',losers[0],losers[1],roundIds);
   }
   if(pairs.length===1)break;
   deps=roundIds.concat(third?['3rd']:[]);pairs=[];
   for(let i=0;i<next.length;i+=2)pairs.push(next.slice(i,i+2));round++;
  }
 }
 const seen=new Set();
 for(const id of T.history){const match=matches.get(id);check(match&&match.deps.every(dep=>seen.has(dep)),'ordre de meciuri invalidă: '+id);seen.add(id)}
 return d;
}
function bk(){const m=$('bm'),no=x=>{m.replaceChildren();el('p',x+' nu s-a schimbat nimic.','error',m)},str=x=>typeof x==='string'&&x.trim()!=='';
$('bx').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'raliu',v:1,saved:new Date().toISOString(),tournament:state,elo:E},null,1)],{type:'application/json'}));a.download='raliu-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$('bi').onclick=()=>$('bf').click();
$('bf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;let d;try{d=JSON.parse(await f.text())}catch{return no('fișierul nu e un JSON valid.')}
try{validateBackup(d)}catch(err){return no('backup invalid: '+err.message+'.')}
const T=d.tournament,L=d.elo;
m.replaceChildren();const c=el('article',null,'',m);el('strong','backup din '+(d.saved?new Date(d.saved).toLocaleString('ro'):'dată necunoscută'),null,c);
el('p',(T?'turneu: '+T.players.length+' jucători, '+Object.keys(T.results).length+' rezultate':'fără turneu activ')+' • elo: '+Object.keys(L.r).length+' jucători',null,c);
el('p','⚠ restaurarea înlocuiește turneul și elo-ul de acum'+(firebaseSync.isConnected()?', iar schimbarea se trimite online și pentru ceilalți conectați.':' de pe acest telefon.'),'error',c);
const r=el('div',null,'row',c);button('restaurează','primary',r,()=>{clearDrafts();state=T;E=L;save();esave();m.replaceChildren();el('p','restaurat ✓','badge',m);render();tabs()});button('anulează','',r,()=>m.replaceChildren())}}
