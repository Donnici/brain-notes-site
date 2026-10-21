// Brain Notes — site. Reveals once on scroll, and the action line you can type on the home page.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  // The hero picture opens as soon as the page is painted; everything else once it scrolls into view.
  document.querySelectorAll('.hero .shutter').forEach((el) =>
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in'))),
  );
  // Long pages: their blocks rise in as they are reached.
  document.querySelectorAll('.doc-head > *, .toc').forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    if (i < 3) el.style.setProperty('--i', i);
  });
  const targets = document.querySelectorAll('[data-reveal], .pipeline');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-in'));
  }

  const input = document.getElementById('action-input');
  if (input) wireAction(input);
});

// Turns a task written in words ("pagar boleto sexta 15h urgente @ana") into the Markdown line
// Brain Notes writes in the note: - [ ] text ⏫ 📅 date (@date time) #action @owner
function wireAction(input) {
  const line = document.getElementById('action-line');
  const listItem = document.getElementById('action-new');
  const fields = {
    due: document.getElementById('f-due'),
    reminder: document.getElementById('f-reminder'),
    owner: document.getElementById('f-owner'),
    priority: document.getElementById('f-priority'),
  };
  const weekdays = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const human = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function parse(text) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let rest = ` ${text} `;
    let date = null;
    let time = null;
    let priority = null;
    const owners = [];
    const tags = [];

    rest = rest.replace(/\s@([\p{L}\d_-]+)/gu, (_, o) => (owners.push(o), ' '));
    rest = rest.replace(/\s#([\p{L}\d_/-]+)/gu, (_, t) => (fold(t) === 'action' || tags.push(t), ' '));
    rest = rest.replace(/\s(urgente|prioridade alta)(?=\s)/giu, () => ((priority = 'alta'), ' '));
    rest = rest.replace(/\s(importante)(?=\s)/giu, () => ((priority = priority || 'media'), ' '));
    rest = rest.replace(/\s(?:as\s|às\s)?(\d{1,2})(?:h|:)(\d{2})?(?=\s)/giu, (m0, h, m) => {
      if (+h > 23) return m0;
      time = `${pad(+h)}:${m || '00'}`;
      return ' ';
    });
    rest = rest.replace(/\s(?:dia\s)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?=\s)/gu, (_, d, m, y) => {
      const c = new Date(y ? +y : today.getFullYear(), +m - 1, +d);
      if (!y && c < today) c.setFullYear(c.getFullYear() + 1);
      date = c;
      return ' ';
    });
    rest = rest.replace(/\s(depois de amanh[aã]|amanh[aã]|hoje)(?=\s)/giu, (_, w) => {
      const f = fold(w);
      date = new Date(today);
      date.setDate(today.getDate() + (f === 'hoje' ? 0 : f === 'amanha' ? 1 : 2));
      return ' ';
    });
    rest = rest.replace(
      /\s(?:na\s|no\s|nesta\s|neste\s|proxima\s|próxima\s)?(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)(?:-feira)?(?=\s)/giu,
      (_, w) => {
        const target = weekdays.indexOf(fold(w));
        date = new Date(today);
        date.setDate(today.getDate() + ((target - today.getDay() + 7) % 7 || 7));
        return ' ';
      },
    );

    const body = rest.replace(/\s+/g, ' ').trim();
    const parts = [`- [ ] ${body || 'nova ação'}`];
    // The emoji are the file format the app writes, not decoration.
    if (priority) parts.push(priority === 'alta' ? '⏫' : '🔼'); // taste-skill-ignore
    if (date) parts.push(`📅 ${iso(date)}`); // taste-skill-ignore
    if (time) parts.push(`(@${iso(date || today)} ${time})`);
    parts.push('#action');
    tags.forEach((t) => parts.push(`#${t}`));
    owners.forEach((o) => parts.push(`@${o}`));

    return {
      line: parts.join(' '),
      body: body || 'nova ação',
      short: date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '',
      due: date ? human(date) : 'sem prazo',
      reminder: time ? `${human(date || today)}, ${time}` : 'nenhum',
      owner: owners.length ? owners.map((o) => `@${o}`).join(', ') : 'você',
      priority: priority === 'alta' ? 'alta' : priority === 'media' ? 'média' : 'normal',
    };
  }

  function render() {
    const r = parse(input.value);
    line.textContent = r.line;
    for (const k of Object.keys(fields)) fields[k].textContent = r[k];
    if (listItem) {
      listItem.querySelector('.what').textContent = r.body;
      listItem.querySelector('.meta').textContent = [r.owner === 'você' ? '' : r.owner, r.short].filter(Boolean).join(' · ');
    }
  }

  input.addEventListener('input', render);
  document.querySelectorAll('[data-example]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.dataset.example;
      input.focus();
      render();
    }),
  );
  render();
}
