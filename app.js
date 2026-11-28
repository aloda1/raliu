const $=id=>document.getElementById(id),names=$('names'),key='raliu-tournament-v2';
let state=null;try{state=JSON.parse(localStorage.getItem(key))}catch{}
function el(tag,txt,cls,parent){let e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;if(parent)parent.append(e);return e}
function button(txt,cls,parent,fn){let b=el('button',txt,cls,parent);b.onclick=fn;return b}

const navigation = [
 ['t','tour','tt',''],
 ['e','eloview','te','elo'],
 ['h','historyview','th','history']
];
const base = document.querySelector('base');
base.href = document.baseURI;
function routeTab(){
 const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
 const route = navigation.find(([,,,slug]) => new URL(slug,base.href).pathname.replace(/\/$/, '') === path);
 return route ? route[0] : 't';
}
let tab = routeTab();
function tabs(){
 $('bk').hidden=tab!=='h';
 for(const [value,view,control] of navigation){
  $(view).hidden=tab!==value;
  if(tab===value)$(control).setAttribute('aria-current','page');
  else $(control).removeAttribute('aria-current');
  $(control).className=tab===value?'primary':'';
 }
 if(tab==='e')eloRender();
 else if(tab==='h')renderHistory($('historyview'),E.log,state);
 else render();
}
for(const [value,,id] of navigation){
 const link=$(id);
 link.onclick=event=>{
  if(event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
  event.preventDefault();
  if(location.href!==link.href)window.history.pushState(null,'',link.href);
  tab=value;
  tabs();
 };
}
window.addEventListener('popstate',()=>{tab=routeTab();tabs()});

let quickWinner=false;
try{quickWinner=localStorage.getItem('raliu-quick-winner')==='1'}catch{}
const quickToggle=$('quick-winner');
quickToggle.setAttribute('aria-checked',String(quickWinner));
quickToggle.onclick=()=>{
 quickWinner=!quickWinner;
 try{localStorage.setItem('raliu-quick-winner',quickWinner?'1':'0')}catch{}
 quickToggle.setAttribute('aria-checked',String(quickWinner));
 if(tab==='t')render();
};

names.oninput=count;

$('start').onclick=()=>{let players=entries();if(new Set(players.map(x=>x.toLocaleLowerCase('ro'))).size!==players.length){$('error').textContent='două nume coincid. adaugă o inițială ca să distingi jucătorii.';return}if(!players.every(safePlayer)){ $('error').textContent='nume invalid';return }
const target=$('target').valueAsNumber;
if(!raliuOdds.validTarget(target)){ $('target').reportValidity();return }
const groups=split(players);journal.send('start',{players:groups.flat(),sizes:groups.map(g=>g.length),target,adv:+$('adv').value})};
$('admin-cancel').onclick=()=>$('admin-login').close();
bk();tabs();journal.start();
