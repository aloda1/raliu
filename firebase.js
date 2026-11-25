const adminUid='Skt2CDVH0UeOHGKub8Qe9wzSmoG3';
const journal = (() => {
  let api, authApi, auth, db, unsubscribe, revision=0, ready=false, busy=false, connecting=false;
  let confirmed=null, sending=false, blocked='', retryTimer, retryDelay=1000;
  const pendingKey='raliu-pending-event-v1';
  const publicKinds=['start','end','score','undo','tie'];
  let pending=null;
  try {
    const p=JSON.parse(localStorage.getItem(pendingKey));
    if(p && /^[A-Za-z0-9]{20}$/.test(p.id) && Number.isSafeInteger(p.expected) && p.expected>=0 &&
       publicKinds.includes(p.kind) && p.payload && Number.isFinite(p.time))pending=p;
  }catch{}
  function status(message) { $('sync').textContent=message; }
  function refresh() { tabs(); }
  function cache(){
    try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(ek,JSON.stringify(E))}catch{}
  }
  function forgetPending(){
    // Remove the durable intent before allowing another action.
    try{localStorage.removeItem(pendingKey)}catch(error){
      status('nu se poate șterge acțiunea locală • verifică stocarea browserului');return false;
    }
    pending=null;blocked='';retryDelay=1000;clearTimeout(retryTimer);return true;
  }
  function restoreConfirmed(){
    state=structuredClone(confirmed.state);E=structuredClone(confirmed.elo);
  }
  function paint(){
    if(!confirmed)return;
    restoreConfirmed();
    // Only replay a pending action against the exact revision it was created on.
    if(pending && !blocked && pending.expected===revision){
      try{
        if(!applyEvent(pending.kind,structuredClone(pending.payload),pending.time,pending.id))throw Error('invalid');
      }catch{blocked='acțiune locală invalidă';restoreConfirmed()}
    }
    cache();refresh();
  }
  function pendingStatus(){
    if(!pending)return;
    if(blocked){
      status(blocked+' • acțiunea locală este păstrată');
      if(!sending){
        const discard=button('renunță la acțiunea locală','',$('sync'),()=>{
          if(sending || !confirm('renunți la acțiunea nesincronizată?'))return;
          if(!forgetPending())return;
          paint();status(ready?'salvat online ✓':'fără internet');
        });
        discard.type='button';
      }
    }else status(navigator.onLine?'salvat local • se sincronizează…':'salvat local • așteaptă internetul');
  }
  function scheduleRetry(){
    clearTimeout(retryTimer);
    if(!pending||blocked||!ready||!navigator.onLine)return;
    retryTimer=setTimeout(flush,retryDelay);
    retryDelay=Math.min(retryDelay*2,30000);
  }
  async function flush(){
    if(!pending||blocked||sending||busy||!ready||!navigator.onLine)return;
    const p=pending;sending=true;pendingStatus();
    try{
      const ref=api.doc(db,'raliu_events',p.id),head=api.doc(db,'raliu_sync/head');
      await api.runTransaction(db,async tx=>{
        // Reuse the same event ID after a timeout or page reload.
        const existing=await tx.get(ref);
        if(existing.exists()){
          const data=existing.data();
          if(data.seq!==p.expected+1||data.kind!==p.kind)throw Error('identificator de eveniment invalid');
          return;
        }
        const current=await tx.get(head);
        const seq=current.exists()?current.data().seq:0;
        if(seq!==p.expected){const error=Error('revizie diferită');error.code='raliu-conflict';throw error}
        tx.set(ref,{seq:seq+1,kind:p.kind,payload:p.payload,time:api.serverTimestamp()});
        tx.set(head,{seq:seq+1,id:p.id});
      });
      // Only the confirmed snapshot clears the pending action.
    }catch(error){
      if(pending?.id===p.id && ['permission-denied','invalid-argument'].includes(error.code)){
        blocked='firebase a respins acțiunea';paint();
      }
      // A network failure is not proof that a write failed. Keep the same ID.
      // A revision conflict is resolved by the next authoritative snapshot.
      console.warn('sincronizare locală',error.code||error.message);
    }finally{
      sending=false;
      if(pending){pendingStatus();scheduleRetry()}
    }
  }
  async function start() {
    if(connecting||unsubscribe)return;
    connecting=true;ready=false;
    if(pending)pendingStatus();
    try {
      const base='https://www.gstatic.com/firebasejs/10.14.1/';
      const [sdk,store,identity]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-firestore.js'),import(base+'firebase-auth.js')]);
      api=store;authApi=identity;
      const app=sdk.getApps()[0]||sdk.initializeApp({projectId:'raliu-ae011',authDomain:'raliu-ae011.firebaseapp.com',apiKey:'AIzaSyDzskQc2sr-FoD45U9lZa3HX67vuVhUUbk'});
      auth=identity.getAuth(app);db=store.getFirestore(app);
      const [ratings,tour]=await Promise.all(['elo/ratings','tournament/current'].map(path=>store.getDocFromServer(store.doc(db,path))));
      const baselineE=ratings.exists()?JSON.parse(ratings.data().s):{r:{},log:[]};
      const baselineT=tour.exists()?JSON.parse(tour.data().s):null;
      let first=true;
      const stream=store.query(store.collection(db,'raliu_events'),store.orderBy('seq'));
      unsubscribe=store.onSnapshot(stream,{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites){ready=false;if(pending)pendingStatus();else status('se sincronizează…');return}
        if(first){E=structuredClone(baselineE);state=structuredClone(baselineT);if(state&&!state.tid)state.tid='legacy';prepareBracket();revision=0;first=false}
        else restoreConfirmed();
        let acknowledged=false, nextRevision=revision;
        for(const change of snapshot.docs){
          const event=change.data();
          if(event.seq<=nextRevision)continue;
          if(event.seq!==nextRevision+1){ready=false;status('istoric incomplet • reîncarcă pagina');if(confirmed)paint();else first=true;return}
          try {applyEvent(event.kind,event.kind==='restore'?JSON.parse(event.payload):event.payload,event.time.toMillis(),change.id)} catch(error){console.warn('eveniment respins',change.id,error.message)}
          nextRevision=event.seq;
        }
        revision=nextRevision;
        confirmed={state:structuredClone(state),elo:structuredClone(E)};
        ready=true;
        if(pending){
          acknowledged=snapshot.docs.some(doc=>doc.id===pending.id && doc.data().seq===pending.expected+1);
          if(acknowledged){
            if(!forgetPending())blocked='acțiune sincronizată • stocare locală indisponibilă';
          }else if(revision!==pending.expected){blocked='conflict de sincronizare • datele online s-au schimbat'}
        }
        paint();
        if(pending){pendingStatus();void flush()}
        else status('salvat online ✓');
      },error=>{ready=false;unsubscribe=undefined;if(pending)pendingStatus();else status('sincronizare oprită • '+error.code)});
    } catch(error){if(pending)pendingStatus();else status('conectare eșuată • '+(error.code||error.message))}
    finally{connecting=false}
  }
  async function send(kind,payload,expected=revision) {
    if(publicKinds.includes(kind)){
      if(!confirmed||!api||busy||sending||pending||expected!==revision||(navigator.onLine&&!ready)){
        if(pending)pendingStatus();else status('așteaptă sincronizarea înainte de a salva');return false;
      }
      const p={id:api.doc(api.collection(db,'raliu_events')).id,expected:revision,kind,payload:structuredClone(payload),time:Date.now()};
      try{
        restoreConfirmed();
        if(!applyEvent(kind,structuredClone(p.payload),p.time,p.id))throw Error('acțiune invalidă');
        // The event itself is durable, not just a copy of the projected scores.
        localStorage.setItem(pendingKey,JSON.stringify(p));
      }catch(error){restoreConfirmed();status('acțiune nesalvată • '+error.message);return false}
      pending=p;blocked='';retryDelay=1000;
      cache();refresh();pendingStatus();void flush();return true;
    }
    // Authenticated operations keep the original server-confirmed behavior.
    if(!ready||busy||sending||pending||!navigator.onLine){if(pending)pendingStatus();else status('așteaptă sincronizarea înainte de a salva');return false}
    busy=true;status('se salvează…');
    try {
      const ref=api.doc(api.collection(db,'raliu_events')),head=api.doc(db,'raliu_sync/head');
      await api.runTransaction(db,async tx=>{
        const current=await tx.get(head);
        const seq=current.exists()?current.data().seq:0;
        if(seq!==expected)throw Error('scorul s-a schimbat • verifică înainte să reîncerci');
        tx.set(ref,{seq:seq+1,kind,payload:kind==='restore'?JSON.stringify(payload):payload,time:api.serverTimestamp()});
        tx.set(head,{seq:seq+1,id:ref.id});
      });
      if(revision===expected)ready=false;
      return true;
    } catch(error){alert(error.message);status('acțiune nesalvată');return false}
    finally{busy=false}
  }
  async function admin(task) {
    if(!ready||!auth||pending||sending||busy){if(pending)pendingStatus();else status('așteaptă sincronizarea');return}
    const expected=revision;
    const dialog=$('admin-login'), form=$('admin-form');
    if(dialog.open)return;
    form.reset();$('admin-error').textContent='';
    dialog.showModal();
    form.onsubmit=async e=>{
      e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;
      try{
        await authApi.setPersistence(auth,authApi.inMemoryPersistence);
        const result=await authApi.signInWithEmailAndPassword(auth,$('admin-email').value.trim(),$('admin-password').value);
        if(result.user.uid!==adminUid)throw Error('contul nu este administrator');
        if(expected!==revision||pending||sending)throw Error('datele s-au schimbat • reîncearcă');
        if(dialog.open){dialog.close();await task(expected)}
      }catch(error){if(dialog.open)$('admin-error').textContent=error.code||error.message;else alert(error.message)}
      finally{form.reset();submit.disabled=false;if(auth.currentUser)await authApi.signOut(auth)}
    };
  }
  window.addEventListener('online',()=>{if(!unsubscribe)void start();else if(pending){pendingStatus();void flush()}});
  window.addEventListener('offline',()=>{ready=false;if(pending)pendingStatus();else status('fără internet • modificările locale pot aștepta sincronizarea')});
  return {start,send,admin};
})();
