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

// The hero window: the app bar switches destinations, and the Brain AI answers the sample questions.
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
  const show = (view) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === view)));
    panes.forEach((p) => (p.hidden = p.dataset.pane !== view));
  };
  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));

  // The repository menu beside the Notetaker: Sincronizar, Ajustes, Trocar repositório, Sair.
  const repo = document.getElementById('repo-toggle');
  const menu = document.getElementById('repo-menu');
  const openMenu = (open) => {
    repo.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };
  repo.addEventListener('click', (e) => {
    e.stopPropagation();
    openMenu(menu.hidden);
  });
  document.addEventListener('click', () => openMenu(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && openMenu(false));

  // Actions: every checkbox ticks, the way it ticks the line in the note.
  app.querySelectorAll('#action-list .w-box').forEach((box) => {
    const row = box.closest('li');
    const sync = () => {
      const on = box.getAttribute('aria-pressed') === 'true';
      box.classList.toggle('is-on', on);
      row.classList.toggle('is-done', on);
      box.setAttribute('aria-label', on ? 'Reabrir' : 'Concluir');
      box.innerHTML = on ? '<svg class="i"><use href="#i-check" /></svg>' : '';
    };
    box.addEventListener('click', () => {
      box.setAttribute('aria-pressed', String(box.getAttribute('aria-pressed') !== 'true'));
      sync();
    });
    sync();
  });

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

// The record control: pressing it starts the clock, turns the field dark and the transcript fills in as people speak.
const UTTERANCES = [
  ['Chamada', 'Bom dia! Conseguiu ver o roteiro do vídeo?'],
  ['Eu', 'Vi sim. Acho que a abertura pode ser mais curta.'],
  ['Chamada', 'Concordo. Corto os primeiros vinte segundos.'],
  ['Eu', 'Fechado. E a gravação fica para segunda?'],
  ['Chamada', 'Segunda de manhã. Eu mando o convite.'],
  ['Eu', 'Ótimo, já anoto como ação para você.'],
];

function wireRecord() {
  const button = document.getElementById('rec-toggle');
  if (!button) return;
  const section = button.closest('.record');
  const label = section.querySelector('[data-rec-label]');
  const time = section.querySelector('[data-rec-time]');
  const word = section.querySelector('[data-rec-word]');
  const lines = section.querySelector('[data-live-lines]');
  const state = section.querySelector('[data-live-state]');
  const dot = section.querySelector('[data-live-dot]');
  const meters = [...section.querySelectorAll('[data-meter]')];
  let started = 0;
  let timer = 0;
  let next = 0;
  const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const line = ([who, text], at) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${who}</b><span class="w-time">${clock(at)}</span><p>${text}</p>`;
    lines.append(li);
    while (lines.children.length > 4) lines.firstElementChild.remove();
  };
  const tick = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    time.textContent = clock(s);
    // A new utterance every few seconds, and the two level meters move with the voices.
    if (next < UTTERANCES.length && s >= 1 + next * 3) {
      if (next === 0) lines.textContent = '';
      line(UTTERANCES[next], s);
      next += 1;
    }
    meters.forEach((m) => m.style.setProperty('--level', (0.15 + Math.random() * 0.8).toFixed(2)));
  };
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    section.classList.toggle('is-recording', on);
    label.textContent = on ? 'Gravando' : 'Gravar';
    word.textContent = on ? 'Gravando' : 'Grave';
    dot.classList.toggle('is-live', on);
    clearInterval(timer);
    if (on) {
      started = Date.now();
      next = 0;
      state.textContent = 'Ouvindo…';
      lines.innerHTML = '<li class="live-hint">Ouvindo… as falas aparecem aqui assim que forem ditas.</li>';
      if (reduced) {
        lines.textContent = '';
        UTTERANCES.slice(-4).forEach((u, i) => line(u, 4 + i * 5));
        next = UTTERANCES.length;
      }
      tick();
      timer = setInterval(tick, 500);
    } else {
      time.textContent = '00:00';
      meters.forEach((m) => m.style.removeProperty('--level'));
      state.textContent = 'Separando falantes e resumindo…';
      setTimeout(() => button.getAttribute('aria-pressed') !== 'true' && (state.textContent = 'Reunião pronta'), 1800);
    }
  });
}

// Agents demo: every control changes the agent on the left at once.
const SCOPES = {
  app: {
    ask: 'Adicione o filtro por label na lista de ações',
    say: 'Encontrei o componente da lista. Quero adicionar o filtro: posso editar o arquivo?',
    done: 'Adicionei o filtro. Vou rodar os testes da lista.',
    plan: 'Plano: 1) guardar a label no estado da lista; 2) filtrar no componente; 3) cobrir com dois testes. Posso começar?',
    file: 'actions-list.tsx',
    stat: ['+12', '−3'],
    diff: [['del', '-  const visible = actions'], ['add', '+  const visible = actions.filter('], ['add', '+    (a) => !label || a.labels.includes(label),'], ['add', '+  )']],
    cmd: 'pnpm test actions',
    out: ' ✓ filtra por label (4 ms)\n ✓ mantém a ordem por prazo (2 ms)\n Tests  24 passed', // taste-skill-ignore: terminal output
    result: '24 testes passaram',
    bg: 'pnpm dev',
  },
  livro: {
    ask: 'Reescreva a abertura do capítulo 3 com as falas da entrevista',
    say: 'Li a entrevista e o capítulo 3. Posso editar a abertura?',
    done: 'Reescrevi a abertura com duas falas da Marta. Vou contar as palavras do capítulo.',
    plan: 'Plano: 1) separar as três melhores falas da entrevista; 2) reescrever os dois primeiros parágrafos; 3) manter o capítulo abaixo de 5 mil palavras. Posso começar?',
    file: 'Capítulo 3 - A volta.md',
    stat: ['+6', '−4'],
    diff: [['add', '+ “Eu voltei porque ninguém mais lembrava”,'], ['add', '+ disse Marta, ainda na porta.'], ['del', '- Naquela manhã, a cidade inteira dormia.'], ['add', '+ Naquela manhã, só a padaria estava acesa.']],
    cmd: 'wc -w "Capítulo 3 - A volta.md"',
    out: ' 4812 Capítulo 3 - A volta.md',
    result: '4.812 palavras',
    bg: 'pandoc capitulos -o livro.pdf',
  },
  api: {
    ask: 'Crie o endpoint que lista as ações por projeto',
    say: 'As ações já são lidas em actions/repository.ts. Posso criar a rota e o teste?',
    done: 'Criei a rota e o teste de contrato. Vou rodar a suíte da api.',
    plan: 'Plano: 1) rota GET /projects/:id/actions; 2) consulta no repositório; 3) teste de contrato. Posso começar?',
    file: 'projects.routes.ts',
    stat: ['+18', '−0'],
    diff: [['add', "+ app.get('/projects/:id/actions', async (c) => {"], ['add', "+   const id = c.req.param('id')"], ['add', '+   return c.json(await actions.byProject(id))'], ['add', '+ })']],
    cmd: 'pnpm test api',
    out: ' ✓ lista as ações do projeto (11 ms)\n ✓ responde 404 sem projeto (3 ms)\n Tests  58 passed', // taste-skill-ignore: terminal output
    result: '58 testes passaram',
    bg: 'pnpm dev:api',
  },
  site: {
    ask: 'Atualize a página de preços com o novo plano',
    say: 'Os preços ficam em pricing.html e a tabela vem de plans.json. Posso incluir o novo plano?',
    done: 'Atualizei o texto e a tabela de planos. Vou gerar o build para conferir.',
    plan: 'Plano: 1) incluir o plano em plans.json; 2) revisar o texto da página; 3) gerar o build. Posso começar?',
    file: 'plans.json',
    stat: ['+7', '−1'],
    diff: [['del', '-  ]'], ['add', '+  ,{ "nome": "Equipe",'], ['add', '+     "licencas": 5 }'], ['add', '+  ]']],
    cmd: 'npm run build',
    out: ' ✓ 4 páginas geradas\n ✓ links conferidos\n build pronto em 2,1 s', // taste-skill-ignore: terminal output
    result: 'build pronto em 2,1 s',
    bg: 'npm run preview',
  },
};
const STATES = {
  wait: ['Aguardando você', 'dot--wait'],
  work: ['Trabalhando', 'dot--work'],
  done: ['Concluído', ''],
};

function wireAgents() {
  const form = document.getElementById('agent-controls');
  const stage = document.getElementById('agent-stage');
  if (!form || !stage) return;
  const $ = (sel) => stage.querySelector(sel);

  const render = () => {
    const data = new FormData(form);
    const key = data.get('scope');
    const scope = SCOPES[key];
    const mode = data.get('mode');
    const terminal = data.get('term') === 'on';
    const background = data.get('bg') === 'on';
    const count = Number(data.get('count'));

    // What each mode does with the same request: ask before editing, ask before the command, only plan, or just run.
    const asksEdit = mode === 'Perguntar';
    const asksCommand = mode === 'Aceitar edições';
    const plans = mode === 'Planejar';
    const runs = mode === 'Auto' || mode === 'Acesso total';
    const edited = !asksEdit && !plans;

    $('[data-agent-ask]').textContent = scope.ask;
    $('[data-agent-meta]').textContent = `${mode} · Modelo padrão · Esforço ${data.get('effort')} · ${data.get('account')}`;
    $('[data-agent-say]').textContent = plans ? scope.plan : asksEdit ? scope.say : scope.done;
    $('[data-perm]').hidden = !(asksEdit || asksCommand);
    $('[data-perm-title]').textContent = asksEdit ? `Editar ${scope.file}` : 'Rodar comando';
    $('[data-cmd]').textContent = asksEdit ? `${scope.stat[0]} ${scope.stat[1]} linhas` : scope.cmd;
    const auto = $('[data-auto]');
    auto.hidden = !runs;
    auto.querySelector('span').textContent = `${scope.cmd} · ${scope.result}`;
    $('[data-bg]').hidden = !background;
    $('[data-bg-cmd]').textContent = scope.bg;

    $('[data-diff-file]').textContent = edited ? scope.file : 'Nenhuma alteração ainda';
    $('[data-diff-add]').textContent = edited ? scope.stat[0] : '';
    $('[data-diff-del]').textContent = edited ? scope.stat[1] : '';
    $('[data-diff]').innerHTML = edited ? scope.diff.map(([cls, text]) => `<span class="${cls}">${escape(text)}</span>`).join('') : '';
    $('.as-diff .w-diff').hidden = !edited;
    $('[data-side="term"] code').textContent = `$ ${scope.cmd}\n${scope.out}`;

    const first = runs ? STATES.work : STATES.wait;
    const names = [key, ...Object.keys(SCOPES).filter((k) => k !== key)].slice(0, count);
    $('[data-agent-list]').innerHTML = names
      .map((name, i) => {
        const [text, cls] = i === 0 ? first : i % 2 ? STATES.work : STATES.done;
        const badge = i === 0 && background ? '<b class="w-badge" title="1 em segundo plano">1</b>' : '';
        return `<li class="${i === 0 ? 'is-on' : ''}"><svg class="i"><use href="#i-bot" /></svg><span><b>${name}</b><small><i class="dot ${cls}"></i>${text}</small></span>${badge}</li>`;
      })
      .join('');

    setSide(terminal ? 'term' : 'diff');
    stage.classList.toggle('show-side', terminal);
  };

  const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
