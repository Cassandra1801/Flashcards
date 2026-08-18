const STORAGE_KEY = 'flashcards.decks.v1';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const Storage = {
  loadDecks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load decks', e);
      return [];
    }
  },

  saveDecks(decks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  },

  createDeck(decks, name, description) {
    const deck = {
      id: uid(),
      name: name.trim(),
      description: (description || '').trim(),
      createdAt: Date.now(),
      cards: []
    };
    decks.push(deck);
    this.saveDecks(decks);
    return deck;
  },

  deleteDeck(decks, deckId) {
    const next = decks.filter(d => d.id !== deckId);
    this.saveDecks(next);
    return next;
  },

  createCard(decks, deckId, front, back) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return null;
    const card = {
      id: uid(),
      front: front.trim(),
      back: back.trim(),
      createdAt: Date.now(),
      srs: {
        repetition: 0,
        easeFactor: 2.5,
        interval: 0,
        dueDate: Date.now()
      }
    };
    deck.cards.push(card);
    this.saveDecks(decks);
    return card;
  },

  updateCard(decks, deckId, cardId, front, back) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return null;
    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return null;
    card.front = front.trim();
    card.back = back.trim();
    this.saveDecks(decks);
    return card;
  },

  deleteCard(decks, deckId, cardId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    deck.cards = deck.cards.filter(c => c.id !== cardId);
    this.saveDecks(decks);
  }
};
