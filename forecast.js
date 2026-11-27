// Eight virtual head-to-head matches anchor sparse records to the Elo estimate.
function titleSampler(tournament,elo){
  const {players,groups,adv,tid,target=11}=tournament;
  const ratings=new Map(Object.entries(elo.r).map(([n,r])=>[n.toLowerCase(),r.e]));
  const index=new Map(players.map((n,i)=>[n.toLowerCase(),i]));
  const wins=players.map(()=>new Float64Array(players.length));
  for(const match of elo.log){
    const w=index.get(match.w.toLowerCase());
    const l=index.get((match.w.toLowerCase()===match.a.toLowerCase()?match.b:match.a).toLowerCase());
    if(w!==undefined && l!==undefined)wins[w][l]++;
  }
  const probabilities=players.map((a,i)=>players.map((b,j)=>{
    const rating=name=>ratings.get(name.toLowerCase())??1000;
    const prior=1/(1+10**((rating(b)-rating(a))/400));
    return (8*prior+wins[i][j])/(8+wins[i][j]+wins[j][i]);
  }));
  const ids=new Map(players.map((n,i)=>[n,i]));
  let seedValue=91;
  const random=()=>((seedValue=(Math.imul(seedValue,1664525)+1013904223)>>>0)/4294967296);
  const winner=(a,b)=>random()<probabilities[ids.get(a)][ids.get(b)]?a:b;
  const remaining=groups.flatMap((group,g)=>fx(group).map(([a,b],i)=>({a,b,id:'g'+g+'-'+i})))
    .filter(m=>!tournament.results[m.id]);
  const slots=groups.flatMap((group,g)=>group.slice(0,adv).map(()=>({g})));
  const draw=!tournament.pairs && groups.length>1
    ? drawQualifiers(slots.map((slot,i)=>({...slot,n:i+1})),tid) : null;
  const sim={...tournament,results:{...tournament.results}};
  return ()=>{
    let bracket=tournament.pairs;
    if(!bracket){
      for(const {a,b,id} of remaining){
        const w=winner(a,b);
        const loserScore=Math.floor(random()*target);
        sim.results[id]={winner:w,scores:w===a?[target,loserScore]:[loserScore,target]};
      }
      sim.tb={...tournament.tb};
      const qualifiers=[];
      for(let g=0;g<groups.length;g++){
        let rows=table(g,sim);
        if(rows.tie){
          const picks=sim.tb[g]||[];
          sim.tb[g]=[...picks,...shuffle(rows.tie.run.map(r=>r.n),random)];
          rows=table(g,sim);
        }
        if(groups.length===1)return rows[0].n;
        qualifiers.push(...rows.slice(0,adv).map(r=>r.n));
      }
      bracket=draw.map(pair=>pair.map(slot=>slot===null?null:qualifiers[slot-1]));
    }
    for(let round=0;;round++){
      const advancing=bracket.map(([a,b],i)=>tournament.results[round+'-'+i]?.winner??(b===null?a:winner(a,b)));
      if(advancing.length===1)return advancing[0];
      bracket=[];
      for(let i=0;i<advancing.length;i+=2)bracket.push([advancing[i],advancing[i+1]]);
    }
  };
}

let forecastOpen=false,forecastCache;
function renderForecast(board,tournament,elo){
  const panel=el('details',null,'forecast',board);
  el('summary','predicție câștigător',null,panel);
  const body=el('div',null,null,panel);
  panel.open=forecastOpen;
  async function show(){
    if(!panel.open || body.hasChildNodes())return;
    const key=JSON.stringify([tournament,elo.r,elo.log.map(m=>[m.a,m.b,m.w])]);
    if(forecastCache?.key!==key){
      body.textContent='se estimează șansele…';
      const sample=titleSampler(tournament,elo);
      const counts=new Map(tournament.players.map(n=>[n,0]));
      const trials=4000;
      for(let i=0;i<trials;){
        await new Promise(resolve=>setTimeout(resolve,0));
        if(!panel.isConnected||!panel.open){body.replaceChildren();return}
        const start=performance.now();
        do{
          const name=sample();
          counts.set(name,counts.get(name)+1);
          i++;
        }while(i<trials && performance.now()-start<8);
      }
      forecastCache={key,rows:[...counts].sort((a,b)=>b[1]-a[1]).map(([name,n])=>[name,n/trials])};
    }
    body.replaceChildren();
    el('p','șanse la titlu pe baza elo-ului și a meciurilor directe',null,body);
    for(const [name,chance] of forecastCache.rows){
      const row=el('div',null,'forecast-row',body);
      el('span',name,null,row);
      el('strong',chance.toLocaleString('ro-RO',{style:'percent',maximumFractionDigits:1}),null,row);
    }
  }
  panel.ontoggle=()=>{if(panel.isConnected){forecastOpen=panel.open;if(panel.open)void show()}};
  if(panel.open)void show();
}
