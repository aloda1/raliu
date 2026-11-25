function renderHistory(view, log, tournament) {
  view.replaceChildren();
  const section = el('section', null, '', view);
  el('h2', 'istoric meciuri', null, section);
  if (!log.length) {
    el('p', 'niciun meci înregistrat încă.', null, section);
    return;
  }

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
