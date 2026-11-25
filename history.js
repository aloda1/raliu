let historyPair = [];
const historyName = name => name.trim().toLocaleLowerCase('ro');

function renderHeadToHead(section, log) {
  const names = new Map();
  for (const match of log) {
    for (const name of [match.a, match.b]) names.set(historyName(name), name);
  }
  const latest = log[log.length - 1];
  if (historyPair.length !== 2 || !historyPair.every(key => names.has(key))) {
    historyPair = [historyName(latest.a), historyName(latest.b)];
  }

  el('h3', 'meciuri directe', null, section);
  const row = el('div', null, 'head-to-head', section);
  const score = el('strong', null, 'head-score');
  score.setAttribute('aria-live', 'polite');
  const choices = [...names].sort((a, b) => a[1].localeCompare(b[1], 'ro'));
  const selects = historyPair.map((key, index) => {
    if (index === 1) row.append(score);
    const select = el('select', null, null, row);
    select.setAttribute('aria-label', index ? 'al doilea jucător' : 'primul jucător');
    for (const [value, label] of choices) el('option', label, null, select).value = value;
    select.value = key;
    select.onchange = () => {
      const other = 1 - index;
      if (select.value === historyPair[other]) historyPair[other] = historyPair[index];
      historyPair[index] = select.value;
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
  function update() {
    const wins = [0, 0];
    for (const match of log) {
      const a = historyName(match.a), b = historyName(match.b);
      if (a === b || !historyPair.includes(a) || !historyPair.includes(b)) continue;
      const winner = historyPair.indexOf(historyName(match.w));
      if (winner >= 0) wins[winner]++;
    }
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
    score.textContent = wins.join(' – ');
    score.setAttribute('aria-label', names.get(historyPair[0]) + ': ' + wins[0] + ' victorii, ' +
      names.get(historyPair[1]) + ': ' + wins[1] + ' victorii');
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

  renderHeadToHead(section, log);
  const dates = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
  for (const match of log.slice().reverse()) {
    const card = el('article', null, '', section);
    const activeResult = match.t === tournament?.tid ? tournament.results[match.id] : null;
    const scores = match.scores ?? activeResult?.scores;
    const score = Array.isArray(scores) && scores.length === 2 ? scores.join(' – ') : 'vs.';
    el('strong', match.a + '  ' + score + '  ' + match.b, null, card);
    el('div', '✓ ' + match.w, null, card);
    const date = new Date(match.playedAt);
    if (Number.isSafeInteger(match.playedAt) && Number.isFinite(date.getTime())) {
      el('small', dates.format(date), null, card);
    }
  }
}
