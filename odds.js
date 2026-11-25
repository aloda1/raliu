const raliuOdds = (() => {
function ratingChance(first, second) {
 if (!(first?.g || first?.s) || !(second?.g || second?.s)) return null;
 return 1 / (1 + 10 ** ((second.e - first.e) / 400));
}

function formatOdds(probability, suffix = '') {
 const value = Math.min(250, .95 / probability);
 if (value < 1.001) return '🔒 indisponibil';
 return value.toFixed(value < 1.01 ? 3 : 2) + suffix;
}
// probabilitate de a castiga un joc la 11, cu diferenta de doua puncte.
// dupa 10-10, probabilitatea se calculeaza analitic (fara recursie infinita).
function pointGameProbability(x,y,p){
 p=Math.max(.000001,Math.min(.999999,p));
 const q=1-p,deuce=p*p/(p*p+q*q),memo=new Map();
 function f(a,b){
  if((a>=11||b>=11)&&Math.abs(a-b)>=2)return a>b?1:0;
  if(a>=10&&b>=10){
   if(a===b)return deuce;
   if(a===b+1)return p+q*deuce;
   if(b===a+1)return p*deuce;
  }
  const k=a+','+b;if(memo.has(k))return memo.get(k);
  const v=p*f(a+1,b)+q*f(a,b+1);memo.set(k,v);return v;
 }
 return f(x,y);
}

function pointChance(target) {
 if (target === null) return .5;
 let low = .000001, high = .999999;
 for (let i = 0; i < 30; i++) {
  const mid = (low + high) / 2;
  if (pointGameProbability(0, 0, mid) < target) low = mid;
  else high = mid;
 }
 return (low + high) / 2;
}

function calculate(a, b, first, second, score, advantage) {
 const raw = ratingChance(first, second);
 const target = raw === null ? null : Math.max(.0038, Math.min(.9962, raw));
 let probability = target ?? .5;
 if (score) {
  let [x, y] = score;
  if (advantage === '0') [x, y] = [11, 10];
  if (advantage === '1') [x, y] = [10, 11];
  probability = pointGameProbability(x, y, pointChance(target));
 }
 const suffix = score ? 'x' : '';
 return {
  a: formatOdds(probability, suffix),
  b: formatOdds(1 - probability, suffix),
  fav: Math.abs(probability - .5) < .02 ? null : probability > .5 ? a : b
 };
}
return { calculate, ratingChance };
})();
