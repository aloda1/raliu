let historyPair = ['', ''];
let historyLimit = 5;
const historyName = name => name.trim().toLocaleLowerCase('ro');

function renderHeadToHead(section, log, tournament) {
  const names = new Map();
  for (const match of log) {
    for (const name of [match.a, match.b]) names.set(historyName(name), name);
  }
  historyPair = historyPair.map(key => names.has(key) ? key : '');

  el('h3', 'meciuri directe', null, section);
  const row = el('div', null, 'head-to-head', section);
  const score = el('strong', 'vs.', 'head-score');
  score.setAttribute('aria-live', 'polite');
  const choices = [...names].sort((a, b) => a[1].localeCompare(b[1], 'ro'));
  const selects = historyPair.map((key, index) => {
    if (index === 1) row.append(score);
    const select = el('select', null, null, row);
    select.setAttribute('aria-label', index ? 'al doilea jucător' : 'primul jucător');
    el('option', '-neselectat-', null, select).value = '';
    for (const [value, label] of choices) el('option', label, null, select).value = value;
    select.value = key;
    select.onchange = () => {
      const other = 1 - index;
      if (select.value && select.value === historyPair[other]) historyPair[other] = historyPair[index];
      historyPair[index] = select.value;
      historyLimit = 5;
      update();
    };
    return select;
  });

  const panel = el('div', null, 'h2h-panel', section);
  const bar = el('div', null, 'h2h-bar', panel);
  bar.setAttribute('aria-hidden', 'true');
  const segments = selects.map(() => el('strong', null, null, bar));
  const empty = el('span', 'niciun meci direct', 'h2h-empty', panel);
  const legend = el('div', null, 'h2h-legend', panel);
  const labels = selects.map(() => el('span', null, null, legend));
  const list = el('div', null, 'result-list', section);
  const more = button('arată mai mult', 'history-more', section, () => {
    historyLimit += 10;
    update();
  });
  const dates = new Intl.DateTimeFormat('ro-RO', {dateStyle:'short', timeStyle:'short'});
  function update() {
    const wins = [0, 0];
    const selected = historyPair.filter(Boolean);
    const direct = selected.length === 2;
    const matches = log.filter(match => {
      const players = [historyName(match.a), historyName(match.b)];
      return selected.every(key => players.includes(key));
    }).reverse();
    for (const match of matches) {
      const side = historyPair.indexOf(historyName(match.w));
      if (side >= 0) wins[side]++;
    }
    panel.hidden = !direct;
    list.replaceChildren();
    for (const match of matches.slice(0,historyLimit)) {
      const row = el('div',null,'result-line',list);
      const date = new Date(match.playedAt);
      const dated = Number.isSafeInteger(match.playedAt) && Number.isFinite(date.getTime());
      el('time',dated ? dates.format(date) : '—',null,row);
      const winner = historyName(match.w);
      const active = match.t === tournament?.tid ? tournament?.results?.[match.id] : null;
      const scores = match.scores ?? active?.scores;
      const hasScore = Array.isArray(scores) && scores.length === 2;
      const pairing = el('span',null,'result-pair',row);
      pairing.title='câștigător: '+match.w;
      for (const [i,name] of [match.a,match.b].entries()) {
        const won=historyName(name)===winner;
        if(i) {
          pairing.append(' ');
          el('span',hasScore?scores.join('–'):'–','result-score',pairing);
          pairing.append(' ');
        }
        const player=el(won?'strong':'span',name,null,pairing);
        if(won) {
          const mark=el('span','✓','result-check');
          mark.setAttribute('aria-label','câștigător');
          if(i) player.append(' ',mark);
          else player.prepend(mark,' ');
        }
      }
      const side=historyPair.indexOf(winner);
      if(direct&&side>=0) pairing.dataset.side=String(side);
    }
    more.hidden = matches.length <= historyLimit;
    selects.forEach((select, index) => { select.value = historyPair[index]; });
    const total=wins[0]+wins[1];
    empty.hidden = total > 0;
    bar.hidden = legend.hidden = total === 0;
    wins.forEach((count, k) => {
      segments[k].hidden = count === 0;
      segments[k].style.flexGrow = count;
      segments[k].textContent = count;
      const percent = total ? 100 * count / total : 0;
      labels[k].textContent = names.get(historyPair[k]) + ' · ' +
        percent.toLocaleString('ro-RO', {maximumFractionDigits: 1}) + '%';
    });
    score.textContent = direct ? wins.join(' – ') : 'vs.';
    score.setAttribute('aria-label', direct ? names.get(historyPair[0])+': '+wins[0]+' victorii, '+
      names.get(historyPair[1])+': '+wins[1]+' victorii' : 'versus');
  }
  update();
}

function renderHistory(view, log, tournament) {
  view.replaceChildren();
  const section = el('section', null, '', view);
  el('h2', 'istoric meciuri', null, section);
  if (!log.length) {
    el('p', 'niciun meci înregistrat încă.', null, section);
    return;
  }

  renderHeadToHead(section, log, tournament);
}
