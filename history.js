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

  el('h3', 'h2h', null, section);
  const table = el('table', null, 'head-to-head', section);
  const header = el('tr', null, null, el('thead', null, null, table));
  el('th', 'jucător', null, header);
  el('th', 'victorii', null, header);
  const body = el('tbody', null, null, table);
  const choices = [...names].sort((a, b) => a[1].localeCompare(b[1], 'ro'));
  const rows = historyPair.map((key, index) => {
    const row = el('tr', null, null, body);
    const select = el('select', null, null, el('td', null, null, row));
    select.setAttribute('aria-label', index ? 'al doilea jucător' : 'primul jucător');
    for (const [value, label] of choices) el('option', label, null, select).value = value;
    select.value = key;
    select.onchange = () => {
      const other = 1 - index;
      if (select.value === historyPair[other]) historyPair[other] = historyPair[index];
      historyPair[index] = select.value;
      update();
    };
    return { select, wins: el('td', null, null, row) };
  });

  function update() {
    const wins = [0, 0];
    for (const match of log) {
      const a = historyName(match.a), b = historyName(match.b);
      if (a === b || !historyPair.includes(a) || !historyPair.includes(b)) continue;
      const winner = historyPair.indexOf(historyName(match.w));
      if (winner >= 0) wins[winner]++;
    }
    rows.forEach((row, index) => {
      row.select.value = historyPair[index];
      row.wins.textContent = String(wins[index]);
    });
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
