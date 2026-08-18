const DAY_MS = 24 * 60 * 60 * 1000;

// Grade -> SM-2 quality score (0-5)
const GRADE_QUALITY = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5
};

const SRS = {
  isDue(card, now = Date.now()) {
    return card.srs.dueDate <= now;
  },

  dueCards(cards, now = Date.now()) {
    return cards.filter(c => this.isDue(c, now));
  },

  // Applies the SM-2 algorithm and returns the updated srs object.
  grade(card, gradeName, now = Date.now()) {
    const quality = GRADE_QUALITY[gradeName];
    if (quality === undefined) throw new Error(`Unknown grade: ${gradeName}`);

    let { repetition, easeFactor, interval } = card.srs;

    if (quality < 3) {
      repetition = 0;
      interval = 1;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetition += 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    card.srs = {
      repetition,
      easeFactor: Math.round(easeFactor * 100) / 100,
      interval,
      dueDate: now + interval * DAY_MS
    };
    return card.srs;
  },

  describeInterval(days) {
    if (days < 1) return 'today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
};
