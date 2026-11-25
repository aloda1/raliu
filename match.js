function match(parent,a,b,id,label){let r=state.results[id],card=el('article',null,/^se joacă/.test(label)&&!r?'now':'',parent);el('small',label,'badge',card);
function win(winner,scores){journal.send('score',{tid:state.tid,id,a,b,winner,scores})}
if(r){el('p',a+' '+(r.scores?r.scores.join(' – '):' vs. ')+' '+b,null,card);el('strong','✓ '+r.winner,null,card)}
else if(a&&b){
 const hint=el('p','apasă pe câștigător',null,card);
 const buttons=[a,b].map(n=>button(n,'player',card,()=>win(n,null)));
 let det=el('div',null,'',card);el('small','sau introdu scorul','badge',det);
 let form=el('form',null,'scores',det),fields=[a,b].map((n,k)=>{let lab=el('label',n,null,form),f=el('input',null,'',lab);Object.assign(f,{type:'number',inputMode:'numeric',min:'0',step:'1',required:true});f.dataset.k=JSON.stringify([draftScope(),id,a,b,k]);f.value=drafts[f.dataset.k]||'';return f});
 el('button','salvează','primary',form);
 const advantagePanel=el('div',null,'',det);
 const status=el('p',null,null,advantagePanel);
 status.setAttribute('aria-live','polite');
 const points=el('div',null,'row',advantagePanel);
 const advantage=el('input',null,null,advantagePanel);
 advantage.type='hidden';
 advantage.dataset.k=JSON.stringify([draftScope(),id,a,b,'advantage']);
 advantage.value=drafts[advantage.dataset.k]||'';
 // de la 10-10 incolo: la egalitate "punct X" da avantaj lui X;
 // cu avantaj raman doar "X" (castiga jocul, scor +2) si "egal" (revine la egalitate: 11-11, 12-12...).
 function drawPoints(side,x,y){
  points.replaceChildren();
  if(side===''){
   [a,b].forEach((name,k)=>button('punct '+name,'',points,()=>{advantage.value=String(k);msg.textContent='';updateLive()}));
   return;
  }
  const k=+side,name=k?b:a;
  button(name,'',points,()=>{
   const score=[x,y];
   score[k]+=2;
   win(name,score);
  });
  button('egal','',points,()=>{
   fields[0].value=String(x+1);fields[1].value=String(y+1);
   advantage.value='';msg.textContent='';updateLive();
  });
 }
 let msg=el('div','','error',det);msg.setAttribute('role','alert');
 function updateLive(){
  const values=fields.map(f=>f.value.trim());
  const valid=values.every(v=>v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0);
  const [x,y]=values.map(Number);
  const tied=valid&&x===y&&x>=10;
  advantagePanel.hidden=!tied;
  if(!tied)advantage.value='';
  const side=advantage.value;
  if(tied)drawPoints(side,x,y);
  status.textContent=side===''?'egalitate • cine ia următorul punct?':'avantaj '+(side==='0'?a:b)+' • cine ia următorul punct?';
  if(!showOdds)return;
  const current=raliuOdds.calculate(a,b,E.r[nk(a)],E.r[nk(b)],valid?[x,y]:null,side);
  hint.textContent='apasă pe câștigător • '+(valid?'cote live':'cote înainte de meci');
  if(valid&&Math.max(x,y)>=11&&Math.abs(x-y)>=2)hint.textContent+=' • joc încheiat la acest scor';
  buttons.forEach((btn,k)=>{
   const name=k?b:a;
   btn.textContent=name+' • '+(k?current.b:current.a)+(current.fav===name?' ⭐':'');
  });
 }
 fields.forEach(f=>f.addEventListener('input',()=>{advantage.value='';updateLive()}));updateLive();
 form.onsubmit=e=>{e.preventDefault();let s=fields.map(f=>Number(f.value));if(s[0]===s[1]){msg.textContent=advantagePanel.hidden?'scor egal. cine a câștigat meciul?':'alege cine ia următorul punct.';return}win(s[0]>s[1]?a:b,s)}
}
else el('p',(a||'în așteptare')+' vs. '+(b||'în așteptare'),null,card)}

let drafts={};
function draftScope(){return JSON.stringify(state?[state.tid||null,state.players,state.groups]:null)}
function clearDrafts(){drafts={};document.querySelectorAll('#board input[data-k]').forEach(i=>i.value='')}
