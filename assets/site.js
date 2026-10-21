// Brain Notes — site. Entrances on scroll and the working pieces of the app on the home page.
document.documentElement.classList.add('js');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  // Long pages: their blocks rise in as they are reached.
  document.querySelectorAll('.doc-head > *, .toc').forEach((el, i) => {
    el.setAttribute('data-reveal', '');
    el.style.setProperty('--i', String(Math.min(i, 3)));
  });
  reveal();
  wireApp();
  wireStory();
  wireRecord();
  wireAgents();
  wireFaq();
  wireLicense();
  wireToc();
});

function reveal() {
  const targets = [...document.querySelectorAll('[data-reveal]')];
  const show = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window)) return targets.forEach(show);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      show(e.target);
      io.unobserve(e.target);
    }
  });
  targets.forEach((el) => io.observe(el));
  // A fast scroll can jump past an element; anything already above the fold's bottom edge is shown too.
  const sweep = () => targets.forEach((el) => !el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight && show(el));
  addEventListener('scroll', sweep, { passive: true });
  sweep();
}

// The hero window: the three top-bar areas switch, and the Brain AI answers the sample questions.
const ANSWERS = [
  {
    tools: '2 chamadas de ferramenta',
    html:
      '<p>O lançamento foi dividido em duas fases: a Brain AI sai primeiro e os Agentes na semana seguinte, depois dos testes com a lista de espera (<span class="w-cite">Planejamento do lançamento</span>).</p>' +
      '<p>Ações em aberto:</p><ul><li>Bruno revisa o texto da página de preços até sexta.</li><li>Carla grava o vídeo de demonstração até segunda.</li></ul>',
  },
  {
    tools: '3 chamadas de ferramenta',
    html:
      '<p>Você tem três ações com prazo nesta semana (<span class="w-cite">Ações</span>):</p>' +
      '<ul><li>Revisar o texto da página de preços, sexta, prioridade alta.</li><li>Enviar o anúncio para a lista de espera, sábado.</li><li>Responder a proposta do fornecedor, domingo.</li></ul>',
  },
  {
    tools: '1 chamada de ferramenta',
    html:
      '<p>Na 1:1 de segunda, a Carla pediu para liderar os testes com a lista de espera e combinou mandar o roteiro do vídeo até quarta (<span class="w-cite">1:1 com a Carla</span>).</p>' +
      '<p>Ficou de você revisar o roteiro antes da gravação.</p>',
  },
];

function wireApp() {
  const app = document.getElementById('app');
  if (!app) return;
  const tabs = app.querySelectorAll('[data-view]');
  const panes = app.querySelectorAll('[data-pane]');
  const meetingsNav = app.querySelector('[data-for="meeting"]');
  const show = (view) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === view)));
    panes.forEach((p) => (p.hidden = p.dataset.pane !== view));
    meetingsNav?.classList.toggle('is-on', view === 'meeting');
  };
  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));

  const pane = app.querySelector('[data-pane="brain"]');
  const home = pane.querySelector('.b-home');
  const chat = pane.querySelector('.b-chat');
  const answer = pane.querySelector('[data-answer]');
  const field = pane.querySelector('.b-field');
  const asks = pane.querySelectorAll('[data-ask]');
  let timer = 0;

  const ask = (button) => {
    const item = ANSWERS[Number(button.dataset.ask)];
    asks.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    pane.querySelectorAll('[data-question]').forEach((el) => (el.textContent = button.textContent));
    pane.querySelector('[data-tools]').textContent = item.tools;
    home.hidden = true;
    chat.hidden = false;
    field.textContent = 'Pergunte qualquer coisa';
    clearInterval(timer);
    stream(answer, item.html);
  };

  // Streams the answer word by word, the way the app does.
  const stream = (target, html) => {
    if (reduced) return (target.innerHTML = html);
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const words = holder.textContent.split(/(\s+)/);
    let shown = 0;
    target.innerHTML = '<p><span class="caret"></span></p>';
    timer = setInterval(() => {
      shown += 3;
      if (shown >= words.length) {
        clearInterval(timer);
        target.innerHTML = html;
        return;
      }
      target.innerHTML = `<p>${words.slice(0, shown).join('')}<span class="caret"></span></p>`;
    }, 45);
  };

  asks.forEach((b) => b.addEventListener('click', () => ask(b)));
  pane.querySelector('[data-back]').addEventListener('click', () => {
    clearInterval(timer);
    chat.hidden = true;
    home.hidden = false;
    asks.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  });
}

// Brain AI section: the panel holds still while the three statements beside it take turns.
function wireStory() {
  const panel = document.getElementById('story-panel');
  if (!panel) return;
  const steps = [...document.querySelectorAll('.story-step')];
  const set = (n) => {
    panel.dataset.state = n;
    steps.forEach((s) => s.classList.toggle('is-on', s.dataset.step === n));
  };
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) set(e.target.dataset.step);
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  steps.forEach((s) => io.observe(s));
}

// The record control: pressing it starts the clock and turns the field dark.
function wireRecord() {
  const button = document.getElementById('rec-toggle');
  if (!button) return;
  const section = button.closest('.record');
  const label = section.querySelector('[data-rec-label]');
  const time = section.querySelector('[data-rec-time]');
  const word = section.querySelector('[data-rec-word]');
  let started = 0;
  let timer = 0;
  const tick = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    section.classList.toggle('is-recording', on);
    label.textContent = on ? 'Gravando' : 'Gravar';
    word.textContent = on ? 'Gravando' : 'Grave';
    clearInterval(timer);
    if (on) {
      started = Date.now();
      tick();
      timer = setInterval(tick, 1000);
    } else {
      time.textContent = '00:00';
    }
  });
}

// Agents demo: every control changes the agent on the left at once.
const SCOPES = {
  app: {
    ask: 'Adicione o filtro por label na lista de ações',
    say: 'Encontrei o componente da lista. Vou adicionar o filtro e rodar os testes.',
    Perguntar: 'A lista é filtrada em actions-list.tsx, e a label escolhida vem da barra de filtros. Quer que eu faça a mudança?',
    Planejar: 'Plano: 1) guardar a label no estado da lista; 2) filtrar no componente; 3) cobrir com dois testes. Posso começar?',
    cmd: 'pnpm test actions',
    out: ' ✓ filtra por label (4 ms)\n ✓ mantém a ordem por prazo (2 ms)\n Tests  24 passed', // taste-skill-ignore: terminal output
  },
  api: {
    ask: 'Crie o endpoint que lista as ações por projeto',
    say: 'Criei a rota e o teste de contrato. Vou rodar a suíte da api.',
    Perguntar: 'As ações já são lidas em actions/repository.ts; falta só expor a rota com o filtro por projeto. Quer que eu crie?',
    Planejar: 'Plano: 1) rota GET /projects/:id/actions; 2) consulta no repositório; 3) teste de contrato. Posso começar?',
    cmd: 'pnpm test api',
    out: ' ✓ lista as ações do projeto (11 ms)\n ✓ responde 404 sem projeto (3 ms)\n Tests  58 passed', // taste-skill-ignore: terminal output
  },
  site: {
    ask: 'Atualize a página de preços com o novo plano',
    say: 'Atualizei o texto e a tabela de planos. Vou gerar o build para conferir.',
    Perguntar: 'Os preços ficam em pricing.html e a tabela vem de plans.json. Quer que eu inclua o novo plano?',
    Planejar: 'Plano: 1) incluir o plano em plans.json; 2) revisar o texto da página; 3) gerar o build. Posso começar?',
    cmd: 'npm run build',
    out: ' ✓ 4 páginas geradas\n ✓ links conferidos\n build pronto em 2,1 s', // taste-skill-ignore: terminal output
  },
};
const STATES = [
  ['Aguardando você', 'dot--wait'],
  ['Trabalhando', 'dot--work'],
  ['Concluído', ''],
];

function wireAgents() {
  const form = document.getElementById('agent-controls');
  const stage = document.getElementById('agent-stage');
  if (!form || !stage) return;
  const $ = (sel) => stage.querySelector(sel);

  const render = () => {
    const data = new FormData(form);
    const scope = SCOPES[data.get('scope')];
    const mode = data.get('mode');
    const effort = data.get('effort');
    const flow = data.get('flow');
    const editing = mode === 'Editar';
    const asksPermission = data.get('perm') === 'on';
    const terminal = data.get('term') === 'on';
    const count = Number(data.get('count'));

    $('[data-agent-ask]').textContent = scope.ask;
    $('[data-agent-meta]').textContent = `${mode} · Modelo padrão · Esforço ${effort}`;
    $('[data-agent-say]').textContent = editing ? scope.say : scope[mode];
    $('[data-side="term"] code').textContent = `$ ${scope.cmd}\n${scope.out}`;
    $('[data-cmd]').textContent = scope.cmd;
    $('[data-perm]').hidden = !editing || !asksPermission;
    const auto = $('[data-auto]');
    auto.hidden = !editing || asksPermission;
    auto.querySelector('span').textContent = `${scope.cmd} · ${scope.out.split('\n').pop().trim()}`;
    const flowChip = $('[data-flow]');
    flowChip.hidden = !flow;
    flowChip.textContent = flow ? `001-filtro-por-label · ${flow}` : '';

    const names = [data.get('scope'), ...Object.keys(SCOPES).filter((k) => k !== data.get('scope')), 'docs'].slice(0, count);
    $('[data-agent-list]').innerHTML = names
      .map((name, i) => {
        const [text, cls] = i === 0 ? (editing && asksPermission ? STATES[0] : STATES[1]) : STATES[(i % 2) + 1];
        return `<li class="${i === 0 ? 'is-on' : ''}"><svg class="i"><use href="#i-bot" /></svg><span><b>${name}</b><small><i class="dot ${cls}"></i>${text}</small></span></li>`;
      })
      .join('');

    setSide(terminal ? 'term' : 'diff');
    stage.classList.toggle('show-side', terminal);
  };

  const setSide = (which) => {
    stage.querySelectorAll('[data-side-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.sideTab === which)));
    stage.querySelectorAll('[data-side]').forEach((p) => (p.hidden = p.dataset.side !== which));
  };
  stage.querySelectorAll('[data-side-tab]').forEach((t) =>
    t.addEventListener('click', () => {
      form.elements.term.checked = t.dataset.sideTab === 'term';
      render();
    }),
  );

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  const more = document.getElementById('demo-more');
  more?.addEventListener('click', () => {
    const open = form.classList.toggle('is-open');
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Menos controles' : 'Mais controles';
  });
  render();
}

// FAQ: the answer pane follows hover, click and focus; on a phone the answer opens under its question.
function wireFaq() {
  const tabs = [...document.querySelectorAll('.faq [role="tab"]')];
  if (!tabs.length) return;
  const phone = window.matchMedia('(max-width: 720px)');
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      const inline = t.nextElementSibling;
      inline.textContent = panel.textContent;
      inline.hidden = !(on && phone.matches);
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('focus', () => select(t));
    t.addEventListener('mouseenter', () => !phone.matches && select(t));
    t.addEventListener('keydown', (e) => {
      const next = e.key === 'ArrowDown' ? tabs[i + 1] : e.key === 'ArrowUp' ? tabs[i - 1] : null;
      if (next) {
        e.preventDefault();
        next.focus();
      }
    });
  });
  phone.addEventListener('change', () => select(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));
  select(tabs[0]);
}

// The closing sentence: opens the visitor's e-mail with the request written.
function wireLicense() {
  const form = document.getElementById('license-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const subject = encodeURIComponent('Brain Notes: licença');
    const body = encodeURIComponent(`Olá, quero uma licença do Brain Notes.\n\nMeu e-mail: ${email}\n`);
    window.location.href = `mailto:bruno.dias.donnici@gmail.com?subject=${subject}&body=${body}`;
  });
}

// Long pages: the table of contents marks the section being read.
function wireToc() {
  const links = [...document.querySelectorAll('.toc a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle('is-on', a === byId.get(e.target.id)));
      }
    },
    { rootMargin: '0px 0px -70% 0px' },
  );
  byId.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
}
