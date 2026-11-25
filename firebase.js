const adminUid='Skt2CDVH0UeOHGKub8Qe9wzSmoG3';
const journal = (() => {
  let api, authApi, auth, db, unsubscribe, revision=0, ready=false, busy=false, connecting=false;
  function status(message) { $('sync').textContent=message; }
  function refresh() { tabs(); }
  async function start() {
    if(connecting)return;
    connecting=true; ready=false; unsubscribe?.();
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
        if(snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites){ready=false;status('se sincronizează…');return}
        if(first){E=baselineE;state=baselineT;if(state&&!state.tid)state.tid='legacy';prepareBracket();revision=0;first=false}
        // Metadata-only acknowledgments can include documents skipped in a pending snapshot.
        for(const change of snapshot.docs){
          const event=change.data();if(event.seq<=revision)continue;
          if(event.seq!==revision+1){ready=false;status('istoric incomplet • reîncarcă pagina');return}
          try {applyEvent(event.kind,event.kind==='restore'?JSON.parse(event.payload):event.payload,event.time.toMillis(),change.id)} catch(error){console.warn('eveniment respins',change.id,error.message)}
          revision=event.seq;
        }
        ready=true;
        try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(ek,JSON.stringify(E))}catch{}
        refresh();status('salvat online ✓');
      },error=>{ready=false;status('sincronizare oprită • '+error.code)});
    } catch(error){status('conectare eșuată • '+(error.code||error.message))}
    finally{connecting=false}
  }
  async function send(kind,payload,expected=revision) {
    if(!ready||busy||!navigator.onLine){status('așteaptă sincronizarea înainte de a salva');return false}
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
      return true;
    } catch(error){alert(error.message);status('acțiune nesalvată');return false}
    finally{busy=false}
  }
  async function admin(task) {
    if(!ready||!auth){status('așteaptă sincronizarea');return}
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
        if(expected!==revision)throw Error('datele s-au schimbat • reîncearcă');
        if(dialog.open){dialog.close();await task(expected)}
      }catch(error){if(dialog.open)$('admin-error').textContent=error.code||error.message;else alert(error.message)}
      finally{form.reset();submit.disabled=false;if(auth.currentUser)await authApi.signOut(auth)}
    };
  }
  window.addEventListener('online',start);
  window.addEventListener('offline',()=>{ready=false;status('fără internet • doar citire')});
  return {start,send,admin};
})();
