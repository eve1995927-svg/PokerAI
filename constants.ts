import { CardRank } from './types';

export const INITIAL_DECKS = 8;
export const CARDS_PER_DECK = 52;
export const TOTAL_CARDS = INITIAL_DECKS * CARDS_PER_DECK;

export const CARD_CONFIG: Record<CardRank, { baccaratValue: number; countValue: number }> = {
  'A': { baccaratValue: 1, countValue: 1 },
  '2': { baccaratValue: 2, countValue: 1 },
  '3': { baccaratValue: 3, countValue: 1 },
  '4': { baccaratValue: 4, countValue: 2 },
  '5': { baccaratValue: 5, countValue: -1 },
  '6': { baccaratValue: 6, countValue: -1 },
  '7': { baccaratValue: 7, countValue: -1 },
  '8': { baccaratValue: 8, countValue: -2 },
  '9': { baccaratValue: 9, countValue: 0 }, // Point value fixed to 9, Count 0
  '10': { baccaratValue: 0, countValue: 0 },
  'J': { baccaratValue: 0, countValue: 0 },
  'Q': { baccaratValue: 0, countValue: 0 },
  'K': { baccaratValue: 0, countValue: 0 },
};

export const RANKS: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];