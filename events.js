// Replay only known operations. Public events never provide a rating or a snapshot.
function safePlayer(n) {
  return typeof n === 'string' && n.length > 0 && n.trim() === n &&
    !Object.hasOwn(Object.prototype, n) && n !== 'prototype';
}

function prepareBracket() {
  if (!state || state.groups.length < 2 || state.pairs || !gdone()) return;
  const qualifiers = [];
  for (let gi = 0; gi < state.groups.length; gi++) {
    const rows = table(gi);
    if (rows.tie) return;
    qualifiers.push(...rows.slice(0,state.adv).map(r => ({n:r.n,g:gi})));
  }
  // The same tournament must produce the same shuffle on every phone.
  let seedValue = 7;
  for (const c of String(state.tid)) seedValue = (Math.imul(seedValue,31) + c.charCodeAt(0)) >>> 0;
  const random = () => ((seedValue = (Math.imul(seedValue,1664525)+1013904223) >>> 0) / 4294967296);
  state.pairs = seed(qualifiers, random);
}

function applyEvent(kind, data, time, eventId) {
  if (!data || typeof data !== 'object') return false;
  if (kind === 'start') {
    const {players,sizes,adv}=data;
    if(state || !Array.isArray(players) || !Array.isArray(sizes) || !sizes.length ||
       !sizes.every(n=>Number.isSafeInteger(n) && n>=2) || sizes.reduce((a,b)=>a+b,0)!==players.length ||
       ![1,2].includes(adv) || !players.every(safePlayer) ||
       new Set(players.map(n=>n.toLocaleLowerCase('ro'))).size!==players.length) return false;
    let offset=0;
    const groups=sizes.map(n=>{const group=players.slice(offset,offset+n);offset+=n;return group});
    state = {tid:eventId,players,groups,adv,results:{},history:[],pairs:null};
  } else if (kind === 'restore') {
    validateBackup(data);
    state=data.tournament; E=data.elo;
  } else if (kind === 'reset') {
    E={r:{},log:[]};
  } else if (kind === 'set' || kind === 'remove') {
    if (!safePlayer(data.name)) return false;
    const key=nk(data.name);
    if (kind === 'remove') delete E.r[key];
    else {
      if (!Number.isInteger(data.value) || data.value<100 || data.value>3000) return false;
      const record=E.r[key] || (E.r[key]={g:0,w:0});
      Object.assign(record,{e:data.value,s:1,c:0});
    }
  } else {
    if (!state || data.tid !== state.tid) return false;
    if (kind === 'end') {
      for (const x of E.log) if(x.t===state.tid && x.scores===undefined) x.scores=state.results[x.id]?.scores||null;
      state=null;
    } else if (kind === 'tie') {
      const gi=data.group;
      if (!Number.isInteger(gi) || !state.groups[gi] || !gfin(gi) ||
          !table(gi).tie?.run.some(r=>r.n===data.name)) return false;
      state.tb ||= {};
      (state.tb[gi] ||= []).push(data.name);
    } else if (kind === 'undo') {
      if (!state.history.length || state.history.at(-1)!==data.id) return false;
      state.history.pop(); eloUndo(data.id); delete state.results[data.id];
      if(data.id.startsWith('g')) {state.pairs=null; if(state.tb) delete state.tb[+data.id.slice(1).split('-')[0]];}
    } else if (kind === 'score') {
      if (typeof data.id !== 'string' || !safePlayer(data.winner) || !safePlayer(data.a) || !safePlayer(data.b) ||
          Object.hasOwn(state.results,data.id) || ![data.a,data.b].includes(data.winner)) return false;
      const sc=data.scores;
      if (sc!==null && !(Array.isArray(sc) && sc.length===2 && sc.every(n=>Number.isSafeInteger(n)&&n>=0)
          && sc[0]!==sc[1] && (sc[0]>sc[1]?data.a:data.b)===data.winner)) return false;
      const matches=new Map();
      validateBackup({app:'raliu',v:1,tournament:state,elo:E},matches);
      const m=matches.get(data.id);
      if(!m || m.a!==data.a || m.b!==data.b || !m.deps.every(id=>Object.hasOwn(state.results,id)))return false;
      state.results[data.id]={winner:data.winner,scores:sc};
      state.history.push(data.id);
      elo(data.id,data.a,data.b,data.winner,sc,time);
      if(E.log.length>300)E.log=E.log.slice(-300);
    } else return false;
  }
  if(state && !state.tid)state.tid=eventId;
  prepareBracket();
  return true;
}
