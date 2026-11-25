const $=id=>document.getElementById(id),names=$('names'),key='raliu-tournament-v2';
let state=null;try{state=JSON.parse(localStorage.getItem(key))}catch{}
let ts=0;try{ts=+localStorage.getItem(key+'-t')||0}catch{}
function save(){ts=Math.max(Date.now(),ts+1);try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+'-t',ts)}catch{}firebaseSync.push('tournament/current',()=>JSON.stringify(state),ts)}

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

$('start').onclick=()=>{let players=entries();if(new Set(players.map(x=>x.toLocaleLowerCase('ro'))).size!==players.length){$('error').textContent='două nume coincid. adaugă o inițială ca să distingi jucătorii.';return}state={tid:(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)),players,adv:+$('adv').value,groups:split(players),results:{},history:[],pairs:null};save();render()};

function setSync(s){const e=$('sync');e.replaceChildren();e.className=s;e.append({local:'salvat doar pe acest telefon',saving:'se salvează…',saved:'salvat online ✓',failed:'nu s-a salvat online',offline:'fără internet'}[s]);if(s==='failed'||s==='offline')button('reîncearcă','',e,firebaseSync.start)}
const applyElo=d=>{if(d&&d.t>(E.t||0)){try{E=JSON.parse(d.s)}catch{return}E.t=d.t;try{localStorage.setItem(ek,d.s)}catch{}tabs()}
else if((!d||d.t<(E.t||0))&&(E.t||Object.keys(E.r).length))firebaseSync.push('elo/ratings',()=>JSON.stringify(E),E.t||(E.t=Date.now()))};
const applyTour=d=>{if(d&&d.t>ts){try{state=JSON.parse(d.s)}catch{return}ts=d.t;try{localStorage.setItem(key,d.s);localStorage.setItem(key+'-t',ts)}catch{}render();if(tab==='h')renderHistory($('historyview'),E.log,state)}
else if((!d||d.t<ts)&&(state||ts))firebaseSync.push('tournament/current',()=>JSON.stringify(state),ts||(ts=Date.now()))};
const firebaseSync=createFirebaseSync({applyElo, applyTour, setSync});

bk();setSync('local');firebaseSync.start();
render()
