let decks = Storage.loadDecks();

const state = {
  view: 'home', // 'home' | 'deck' | 'study'
  deckId: null,
  editingCardId: null,
  showNewDeckForm: false,
  showNewCardForm: false,
  study: null // { deckId, queue: [card,...], index, showAnswer, stats: {again,hard,good,easy} }
};

const app = document.getElementById('app');
const dueBadge = document.getElementById('dueBadge');

document.getElementById('homeBtn').addEventListener('click', () => {
  state.view = 'home';
  state.showNewDeckForm = false;
  render();
});

function persist() {
  Storage.saveDecks(decks);
}

function findDeck(deckId) {
  return decks.find(d => d.id === deckId);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function totalDueCount() {
  const now = Date.now();
  let total = 0;
  for (const deck of decks) total += SRS.dueCards(deck.cards, now).length;
  return total;
}

function updateDueBadge() {
  const total = totalDueCount();
  if (total > 0) {
    dueBadge.textContent = `${total} card${total === 1 ? '' : 's'} due`;
    dueBadge.classList.remove('hidden');
  } else {
    dueBadge.classList.add('hidden');
  }
}

function render() {
  updateDueBadge();
  if (state.view === 'home') renderHome();
  else if (state.view === 'deck') renderDeck();
  else if (state.view === 'study') renderStudy();
}

// ---------- HOME VIEW ----------

function renderHome() {
  app.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'row-between';
  header.innerHTML = `<h1>Your Decks</h1>`;
  const newBtn = document.createElement('button');
  newBtn.className = 'btn btn-primary';
  newBtn.textContent = state.showNewDeckForm ? 'Cancel' : '+ New Deck';
  newBtn.addEventListener('click', () => {
    state.showNewDeckForm = !state.showNewDeckForm;
    render();
  });
  header.appendChild(newBtn);
  app.appendChild(header);

  if (state.showNewDeckForm) {
    app.appendChild(buildDeckForm());
  }

  if (decks.length === 0 && !state.showNewDeckForm) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No decks yet. Create one to get started!';
    app.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'deck-list';
  const now = Date.now();

  decks.forEach(deck => {
    const tpl = document.getElementById('tpl-deck-card');
    const node = tpl.content.cloneNode(true);
    node.querySelector('.deck-name').textContent = deck.name;
    const due = SRS.dueCards(deck.cards, now).length;
    const metaParts = [`${deck.cards.length} card${deck.cards.length === 1 ? '' : 's'}`];
    metaParts.push(due > 0 ? `${due} due` : 'none due');
    node.querySelector('.deck-meta').textContent = metaParts.join(' · ');

    const studyBtn = node.querySelector('.btn-study');
    studyBtn.disabled = due === 0;
    if (due === 0) studyBtn.style.opacity = '0.5';
    studyBtn.addEventListener('click', () => startStudy(deck.id));

    node.querySelector('.btn-manage').addEventListener('click', () => {
      state.view = 'deck';
      state.deckId = deck.id;
      state.showNewCardForm = false;
      state.editingCardId = null;
      render();
    });

    node.querySelector('.btn-delete-deck').addEventListener('click', () => {
      if (confirm(`Delete deck "${deck.name}" and all its cards? This cannot be undone.`)) {
        decks = Storage.deleteDeck(decks, deck.id);
        render();
      }
    });

    list.appendChild(node);
  });

  app.appendChild(list);
}

function buildDeckForm() {
  const wrap = document.createElement('form');
  wrap.className = 'deck-form';
  wrap.innerHTML = `
    <div class="form-group">
      <label for="deckNameInput">Deck name</label>
      <input id="deckNameInput" type="text" placeholder="e.g. Spanish Verbs" required maxlength="80">
    </div>
    <div class="form-group">
      <label for="deckDescInput">Description (optional)</label>
      <textarea id="deckDescInput" placeholder="What is this deck about?"></textarea>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Create Deck</button>
    </div>
  `;
  wrap.addEventListener('submit', e => {
    e.preventDefault();
    const name = wrap.querySelector('#deckNameInput').value;
    const desc = wrap.querySelector('#deckDescInput').value;
    if (!name.trim()) return;
    const deck = Storage.createDeck(decks, name, desc);
    state.showNewDeckForm = false;
    state.view = 'deck';
    state.deckId = deck.id;
    render();
  });
  return wrap;
}

// ---------- DECK DETAIL VIEW ----------

function renderDeck() {
  const deck = findDeck(state.deckId);
  if (!deck) {
    state.view = 'home';
    render();
    return;
  }

  app.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'back-link';
  back.textContent = '← All decks';
  back.addEventListener('click', () => {
    state.view = 'home';
    render();
  });
  app.appendChild(back);

  const header = document.createElement('div');
  header.className = 'row-between';
  header.innerHTML = `<h1>${escapeHtml(deck.name)}</h1>`;

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';

  const due = SRS.dueCards(deck.cards, Date.now()).length;
  const studyBtn = document.createElement('button');
  studyBtn.className = 'btn btn-primary';
  studyBtn.textContent = `Study${due > 0 ? ` (${due})` : ''}`;
  studyBtn.disabled = due === 0;
  if (due === 0) studyBtn.style.opacity = '0.5';
  studyBtn.addEventListener('click', () => startStudy(deck.id));
  actions.appendChild(studyBtn);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-secondary';
  addBtn.textContent = state.showNewCardForm ? 'Cancel' : '+ Add Card';
  addBtn.addEventListener('click', () => {
    state.showNewCardForm = !state.showNewCardForm;
    state.editingCardId = null;
    render();
  });
  actions.appendChild(addBtn);

  header.appendChild(actions);
  app.appendChild(header);

  if (deck.description) {
    const desc = document.createElement('p');
    desc.style.color = 'var(--text-muted)';
    desc.textContent = deck.description;
    app.appendChild(desc);
  }

  if (state.showNewCardForm) {
    app.appendChild(buildCardForm(deck, null));
  }

  if (deck.cards.length === 0 && !state.showNewCardForm) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No cards yet. Add your first card!';
    app.appendChild(empty);
    return;
  }

  deck.cards.forEach(card => {
    if (state.editingCardId === card.id) {
      app.appendChild(buildCardForm(deck, card));
      return;
    }
    const tpl = document.getElementById('tpl-card-row');
    const node = tpl.content.cloneNode(true);
    node.querySelector('.card-front').textContent = card.front;
    node.querySelector('.card-back').textContent = card.back;
    const now = Date.now();
    const dueText = card.srs.dueDate <= now
      ? 'Due now'
      : `Due in ${SRS.describeInterval(Math.ceil((card.srs.dueDate - now) / DAY_MS_APP))}`;
    node.querySelector('.card-srs-info').textContent = dueText;

    node.querySelector('.btn-edit-card').addEventListener('click', () => {
      state.editingCardId = card.id;
      state.showNewCardForm = false;
      render();
    });
    node.querySelector('.btn-delete-card').addEventListener('click', () => {
      if (confirm('Delete this card?')) {
        Storage.deleteCard(decks, deck.id, card.id);
        render();
      }
    });
    app.appendChild(node);
  });
}

const DAY_MS_APP = 24 * 60 * 60 * 1000;

function buildCardForm(deck, existingCard) {
  const wrap = document.createElement('form');
  wrap.className = 'card-form';
  wrap.style.marginBottom = '16px';
  wrap.innerHTML = `
    <div class="form-group">
      <label for="cardFrontInput">Front</label>
      <textarea id="cardFrontInput" placeholder="Question / prompt" required></textarea>
    </div>
    <div class="form-group">
      <label for="cardBackInput">Back</label>
      <textarea id="cardBackInput" placeholder="Answer" required></textarea>
    </div>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">${existingCard ? 'Save Changes' : 'Add Card'}</button>
    </div>
  `;
  if (existingCard) {
    wrap.querySelector('#cardFrontInput').value = existingCard.front;
    wrap.querySelector('#cardBackInput').value = existingCard.back;
  }
  wrap.addEventListener('submit', e => {
    e.preventDefault();
    const front = wrap.querySelector('#cardFrontInput').value;
    const back = wrap.querySelector('#cardBackInput').value;
    if (!front.trim() || !back.trim()) return;
    if (existingCard) {
      Storage.updateCard(decks, deck.id, existingCard.id, front, back);
      state.editingCardId = null;
    } else {
      Storage.createCard(decks, deck.id, front, back);
      state.showNewCardForm = false;
    }
    render();
  });
  return wrap;
}

// ---------- STUDY VIEW ----------

function startStudy(deckId) {
  const deck = findDeck(deckId);
  if (!deck) return;
  const due = SRS.dueCards(deck.cards, Date.now());
  if (due.length === 0) return;
  // Shuffle
  const queue = [...due].sort(() => Math.random() - 0.5);
  state.study = {
    deckId,
    queue,
    index: 0,
    showAnswer: false,
    stats: { again: 0, hard: 0, good: 0, easy: 0 }
  };
  state.view = 'study';
  render();
}

function renderStudy() {
  const s = state.study;
  const deck = findDeck(s.deckId);
  app.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'back-link';
  back.textContent = '← Exit study';
  back.addEventListener('click', () => {
    state.view = 'deck';
    state.deckId = s.deckId;
    state.study = null;
    render();
  });
  app.appendChild(back);

  if (s.index >= s.queue.length) {
    const summary = document.createElement('div');
    summary.className = 'session-summary';
    const total = s.stats.again + s.stats.hard + s.stats.good + s.stats.easy;
    summary.innerHTML = `
      <div class="big">🎉</div>
      <h2>Session complete!</h2>
      <p>Reviewed ${total} card${total === 1 ? '' : 's'} in "${escapeHtml(deck ? deck.name : '')}".</p>
      <p style="color:var(--text-muted);font-size:0.9rem;">
        Again: ${s.stats.again} · Hard: ${s.stats.hard} · Good: ${s.stats.good} · Easy: ${s.stats.easy}
      </p>
    `;
    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-primary btn-lg';
    doneBtn.textContent = 'Back to deck';
    doneBtn.addEventListener('click', () => {
      state.view = 'deck';
      state.deckId = s.deckId;
      state.study = null;
      render();
    });
    summary.appendChild(doneBtn);
    app.appendChild(summary);
    return;
  }

  const progress = document.createElement('p');
  progress.className = 'progress-text';
  progress.textContent = `Card ${s.index + 1} of ${s.queue.length}`;
  app.appendChild(progress);

  const card = s.queue[s.index];
  const cardEl = document.createElement('div');
  cardEl.className = 'study-card';
  cardEl.innerHTML = s.showAnswer
    ? `<span class="answer-text">${escapeHtml(card.back)}</span>`
    : `<span>${escapeHtml(card.front)}</span>`;
  cardEl.addEventListener('click', () => {
    s.showAnswer = !s.showAnswer;
    render();
  });
  app.appendChild(cardEl);

  const hint = document.createElement('p');
  hint.className = 'study-hint';
  hint.textContent = s.showAnswer ? 'Click card to show question' : 'Click card to reveal answer';
  app.appendChild(hint);

  if (s.showAnswer) {
    const gradeRow = document.createElement('div');
    gradeRow.className = 'grade-row';
    const grades = [
      { key: 'again', label: 'Again', cls: 'grade-again' },
      { key: 'hard', label: 'Hard', cls: 'grade-hard' },
      { key: 'good', label: 'Good', cls: 'grade-good' },
      { key: 'easy', label: 'Easy', cls: 'grade-easy' }
    ];
    grades.forEach(g => {
      const btn = document.createElement('button');
      btn.className = `btn ${g.cls}`;
      btn.type = 'button';
      btn.textContent = g.label;
      btn.addEventListener('click', () => gradeCard(g.key));
      gradeRow.appendChild(btn);
    });
    app.appendChild(gradeRow);
  }
}

function gradeCard(gradeName) {
  const s = state.study;
  const card = s.queue[s.index];
  SRS.grade(card, gradeName);
  persist();
  s.stats[gradeName] += 1;
  s.index += 1;
  s.showAnswer = false;
  render();
}

render();
