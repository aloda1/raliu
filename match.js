function match(parent,a,b,id,label){let r=state.results[id],card=el('article',null,/^se joacă/.test(label)&&!r?'now':'',parent);el('small',label,'badge',card);
function win(winner,scores){journal.send('score',{tid:state.tid,id,a,b,winner,scores})}
if(r){el('p',a+' '+(r.scores?r.scores.join(' – '):' vs. ')+' '+b,null,card);el('strong','✓ '+r.winner,null,card)}
else if(a&&b){
 const target=state.target??11;
 const players=[a,b];
 const hint=el('p','apasă pe câștigător',null,card);
 const buttons=players.map(name=>button(name,'player',card,()=>win(name,null)));
 const det=el('div',null,null,card);
 const scoreLabel=el('small','sau introdu scorul','badge',det);
 const form=el('form',null,'scores',det);
 const fields=players.map((name,k)=>{
  const input=el('input',null,null,el('label',name,null,form));
  Object.assign(input,{type:'number',inputMode:'numeric',min:'0',step:'1',required:true});
  input.dataset.k=JSON.stringify([draftScope(),id,a,b,k]);
  input.value=drafts[input.dataset.k]||'';
  return input;
 });
 el('button','salvează','primary',form);
 const panel=el('div',null,null,det);
 const status=el('p',null,null,panel);
 status.setAttribute('aria-live','polite');
 const points=el('div',null,'advantage-controls',panel);
 const advantage=el('input',null,null,panel);
 advantage.type='hidden';
 advantage.dataset.k=JSON.stringify([draftScope(),id,a,b,'advantage']);
 advantage.value=drafts[advantage.dataset.k]||'';
 const msg=el('div','','error',det);
 msg.setAttribute('role','alert');
 const read=()=>fields.map(f=>f.valueAsNumber);
 const isDeuce=s=>raliuOdds.validScore(s)&&s[0]===s[1]&&s[0]>=target-1;
 function point(k){
  const score=read();
  if(!isDeuce(score))return;
  if(advantage.value===score[0]+':'+k){
   score[k]+=2;
   win(players[k],score);
  }else{
   advantage.value=score[0]+':'+k;
   update();
  }
 }
 const left=button(a,'',points,()=>point(0));
 const equal=button('egal','',points,()=>{
  const score=read();
  if(!isDeuce(score)||!advantage.value)return;
  fields.forEach(f=>f.value=String(score[0]+1));
  advantage.value='';
  update();
 });
 const right=button(b,'',points,()=>point(1));
 function update(){
  const score=read(),empty=fields.every(f=>!f.value&&!f.validity.badInput);
  const valid=raliuOdds.validScore(score);
  const tied=isDeuce(score);
  const token=advantage.value.split(':');
  if(!tied||token[0]!==String(score[0])||!['0','1'].includes(token[1]))advantage.value='';
  const side=advantage.value?token[1]:'',hasAdvantage=side!=='';
  panel.hidden=!tied;
  scoreLabel.hidden=form.hidden=hasAdvantage;
  const controls=[left,right];
  controls.forEach((control,k)=>{
   control.style.visibility=hasAdvantage&&side!==String(k)?'hidden':'visible';
   control.textContent=hasAdvantage?'meci '+players[k]:'punct '+players[k];
  });
  equal.style.visibility=hasAdvantage?'visible':'hidden';
  status.textContent=hasAdvantage?'avantaj '+players[Number(side)]:'egalitate • '+score.join(' – ');
  hint.textContent=empty?'apasă pe câștigător':valid&&raliuOdds.finished(score,target)?'joc încheiat la acest scor':'scor în joc';
  if(showOdds)hint.textContent+=empty?' • cote înainte de meci':' • cote live';
  const odds=showOdds?raliuOdds.calculate(a,b,E.r[nk(a)],E.r[nk(b)],empty?null:score,side,target):null;
  buttons.forEach((btn,k)=>{
   btn.disabled=!empty;
   btn.textContent=players[k]+(side===String(k)?' · AD':'')+(odds?' • '+(k?odds.b:odds.a)+(odds.fav===players[k]?' ⭐':''):'');
  });
  msg.textContent=(!empty&&!valid&&fields.every(f=>f.value||f.validity.badInput))?'introdu puncte întregi, de la zero.':'';
 }
 fields.forEach(f=>f.addEventListener('input',()=>{advantage.value='';update()}));
 update();
 form.onsubmit=e=>{
  e.preventDefault();
  const score=read();
  if(!raliuOdds.validScore(score)||!raliuOdds.finished(score,target)){
   msg.textContent='primul la '+target+', cu avantaj de două puncte.';
   return;
  }
  win(score[0]>score[1]?a:b,score);
 };
}
else el('p',(a||'în așteptare')+' vs. '+(b||'în așteptare'),null,card)}

let drafts={};
function draftScope(){return JSON.stringify(state?[state.tid||null,state.players,state.groups]:null)}
function clearDrafts(){drafts={};document.querySelectorAll('#board input[data-k]').forEach(i=>i.value='')}
