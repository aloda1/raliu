const raliuOdds = (() => {
  const locked = '🔒 indisponibil';
  function ratingChance(first, second) {
    if (!(first?.g || first?.s) || !(second?.g || second?.s) ||
        !Number.isFinite(first.e) || !Number.isFinite(second.e)) return null;
    return 1 / (1 + 10 ** ((second.e - first.e) / 400));
  }
  function format(probability, suffix) {
    const price = Math.min(250, .95 / probability);
    return price < 1.001 ? locked : price.toFixed(price < 1.01 ? 3 : 2) + suffix;
  }
  function validTarget(n) { return Number.isSafeInteger(n) && n >= 2; }
  function validScore(score) {
    return Array.isArray(score) && score.length === 2 &&
      score.every(n => Number.isSafeInteger(n) && n >= 0);
  }
  function finished([x,y], target) {
    return Math.max(x,y) >= target && Math.abs(x-y) >= 2;
  }
  // Distribution of the next N rallies. At the end of those rallies a tie goes to deuce.
  // Starting at the binomial mode avoids factorials, overflow and recursion.
  function game(x, y, p, target) {
    if (finished([x,y], target)) return Number(x > y);
    const q = 1-p, deuce = p*p / (p*p + q*q), edge = target-1;
    if (Math.min(x,y) >= edge) {
      if (x === y) return deuce;
      return x > y ? p + q*deuce : p*deuce;
    }
    const need = edge-x, n = need + (edge-y);
    const mode = Math.floor((n+1)*p);
    // For exceptionally long games use a normal approximation with continuity correction.
    if (n*p*q > 1e6) {
      const scale = Math.sqrt(n*p*q);
      const tail = threshold => {
        const z = (threshold - n*p)/scale;
        const k = 1/(1+.2316419*Math.abs(z));
        const small = Math.exp(-z*z/2)/Math.sqrt(2*Math.PI) * k *
          (.31938153+k*(-.356563782+k*(1.781477937+k*(-1.821255978+k*1.330274429))));
        return z >= 0 ? small : 1-small;
      };
      const above = tail(need+.5);
      return above + deuce*(tail(need-.5)-above);
    }
    const outcome = k => k === need ? deuce : Number(k > need);
    let total = 1, won = outcome(mode), weight = 1;
    for (let k=mode; k>0; k--) {
      weight *= k*q/((n-k+1)*p);
      if (weight < 1e-18) break;
      total += weight; won += weight*outcome(k-1);
    }
    weight=1;
    for (let k=mode; k<n; k++) {
      weight *= (n-k)*p/((k+1)*q);
      if (weight < 1e-18) break;
      total += weight; won += weight*outcome(k+1);
    }
    return Math.min(1,Math.max(0,won/total));
  }
  function calculate(a,b,first,second,score,advantage,target=11) {
    const closed = {a:locked,b:locked,fav:null};
    if (!validTarget(target) || (score != null && (!validScore(score) || finished(score,target)))) return closed;
    const prior = Math.min(.9962,Math.max(.0038,ratingChance(first,second) ?? .5));
    let probability = prior;
    if (score && (score[0] || score[1])) {
      let [x,y] = score;
      if (x === y && x >= target-1) {
        if (advantage === '0') x++;
        if (advantage === '1') y++;
      }
      let p=.5;
      if (prior !== .5) {
        let low=0,high=1;
        for(let i=0;i<48;i++){
          const mid=(low+high)/2;
          if(game(0,0,mid,target)<prior) low=mid; else high=mid;
        }
        p=(low+high)/2;
      }
      probability=game(x,y,p,target);
    }
    const suffix=score?'x':'';
    return {a:format(probability,suffix),b:format(1-probability,suffix),
      fav:Math.abs(probability-.5)<.02?null:probability>.5?a:b};
  }
  return {calculate,ratingChance,validScore,validTarget,finished};
})();
