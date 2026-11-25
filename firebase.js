function createFirebaseSync({applyElo, applyTour, setSync}) {
// Cloud Firestore stores the tournament and Elo in separate documents.
let cloud=null;
const pt={},bad={},pend={},ready=new Set();
function upd(){
 if(!navigator.onLine)return setSync('offline');
 if(Object.keys(bad).length)return setSync('failed');
 if(Object.keys(pend).length)return setSync('saving');
 setSync(ready.size===2?'saved':'local');
}

// One in-flight write per document; retain an immutable snapshot of the latest queued save.
const queues={};
function push(path,get,t){
 if(!cloud){setSync('local');return}
 const q=queues[path]||(queues[path]={running:false,next:null});
 q.next={t,s:get()};pend[path]=1;setSync('saving');
 clearTimeout(pt[path]);pt[path]=setTimeout(()=>flush(path),500);
}
async function flush(path){
 const q=queues[path];if(!q||q.running||!q.next)return;
 q.running=true;
 try{
  while(q.next){
   const payload=q.next;q.next=null;
   try{const r=await cloud.doc(path).set(payload);if(r&&r.ok===false)throw new Error('HTTP '+r.status);delete bad[path]}
   catch{bad[path]=1}
  }
 }finally{q.running=false;delete pend[path];upd()}
}
let connecting=false;
const listeners=[];
async function startFirebase(){
 if(connecting)return;
 connecting=true;
 try{
  const base='https://www.gstatic.com/firebasejs/10.14.1/';
  const [{initializeApp,getApps},{getFirestore,doc,onSnapshot,runTransaction}]=await Promise.all([
   import(base+'firebase-app.js'),import(base+'firebase-firestore.js')
  ]);
  const app=getApps()[0]||initializeApp({
   projectId:'raliu-ae011',authDomain:'raliu-ae011.firebaseapp.com',
   apiKey:'AIzaSyDzskQc2sr-FoD45U9lZa3HX67vuVhUUbk'
  });
  const db=getFirestore(app);
  cloud={doc:path=>({set:payload=>runTransaction(db,async tx=>{
   const ref=doc(db,path),current=await tx.get(ref);
   if(!current.exists()||current.data().t<payload.t)tx.set(ref,payload);
  })})};
  listeners.splice(0).forEach(stop=>stop());
  ready.clear();
  delete bad.connect;
  for(const [path,apply] of [['elo/ratings',applyElo],['tournament/current',applyTour]]){
   const ref=doc(db,path);
   const stop=onSnapshot(ref,{includeMetadataChanges:true},snap=>{
    if(snap.metadata.fromCache||snap.metadata.hasPendingWrites){ready.delete(path);upd();return}
    delete bad[path];
    ready.add(path);
    const data=snap.exists()?snap.data():null;
    try{
     if(data){
      if(!Number.isSafeInteger(data.t)||typeof data.s!=='string')throw Error('format invalid');
      JSON.parse(data.s);
     }
     apply(data);
    }catch{bad[path]=1}
    upd();
   },error=>{console.warn('firestore',path,error.code);bad[path]=1;ready.delete(path);upd()});
   listeners.push(stop);
  }
 }catch(error){console.warn('firestore',error);bad.connect=1}
 finally{connecting=false;upd()}
}
window.addEventListener('online',startFirebase);
window.addEventListener('offline',upd);
return {push, start: startFirebase, isConnected: () => Boolean(cloud)};
}
