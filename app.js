const $=id=>document.getElementById(id),names=$('names'),key='raliu-tournament-v2';
let state=null;try{state=JSON.parse(localStorage.getItem(key))}catch{}
function el(tag,txt,cls,parent){let e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;if(parent)parent.append(e);return e}
function button(txt,cls,parent,fn){let b=el('button',txt,cls,parent);b.onclick=fn;return b}

let tab='t';
function tabs(){
 for(const [value,view,control] of [['t','tour','tt'],['e','eloview','te'],['h','historyview','th']]){
  $(view).hidden=tab!==value;
  $(control).className=tab===value?'primary':'';
 }
 if(tab==='e')eloRender();
 else if(tab==='h')renderHistory($('historyview'),E.log,state);
 else render();
}
for(const [id,value] of [['tt','t'],['te','e'],['th','h']]){
 $(id).onclick=()=>{tab=value;tabs()};
}

names.oninput=count;

$('start').onclick=()=>{let players=entries();if(new Set(players.map(x=>x.toLocaleLowerCase('ro'))).size!==players.length){$('error').textContent='două nume coincid. adaugă o inițială ca să distingi jucătorii.';return}if(!players.every(safePlayer)){ $('error').textContent='nume invalid';return }
const groups=split(players);journal.send('start',{players:groups.flat(),sizes:groups.map(g=>g.length),adv:+$('adv').value})};
$('admin-cancel').onclick=()=>$('admin-login').close();
bk();render();journal.start();
