import { Card } from '../types';

export const calculateHandValue = (cards: Card[]): number => {
  const total = cards.reduce((sum, card) => sum + card.value, 0);
  return total % 10;
};

// Standard Baccarat Third Card Rules
export const getNextExpectedInput = (
  player: Card[],
  banker: Card[]
): 'P3' | 'B3' | 'NONE' => {
  const pVal = calculateHandValue(player);
  const bVal = calculateHandValue(banker);

  // 1. Natural 8 or 9? (Checked elsewhere usually, but safe to check here if 2 cards each)
  if ((player.length === 2 && banker.length === 2) && (pVal >= 8 || bVal >= 8)) {
    return 'NONE';
  }

  // 2. Player's Turn
  if (player.length === 2) {
    // Player stands on 6, 7. Draws on 0-5.
    if (pVal <= 5) {
      return 'P3';
    }
    // Player Stands (has 6 or 7) -> Go to Banker Logic
  }

  // 3. Banker's Turn
  if (banker.length === 2) {
    // If Player stood (2 cards)
    if (player.length === 2) {
      // Banker draws on 0-5, stands on 6-9
      if (bVal <= 5) return 'B3';
      return 'NONE';
    }

    // If Player drew a 3rd card
    if (player.length === 3) {
      const p3Value = player[2].value;
      
      if (bVal <= 2) return 'B3';
      if (bVal === 3) return p3Value !== 8 ? 'B3' : 'NONE';
      if (bVal === 4) return (p3Value >= 2 && p3Value <= 7) ? 'B3' : 'NONE';
      if (bVal === 5) return (p3Value >= 4 && p3Value <= 7) ? 'B3' : 'NONE';
      if (bVal === 6) return (p3Value === 6 || p3Value === 7) ? 'B3' : 'NONE';
      if (bVal === 7) return 'NONE'; // Banker stands on 7
    }
  }

  return 'NONE';
};

export const determineWinner = (player: Card[], banker: Card[]): 'PLAYER' | 'BANKER' | 'TIE' => {
  const pVal = calculateHandValue(player);
  const bVal = calculateHandValue(banker);
  if (pVal > bVal) return 'PLAYER';
  if (bVal > pVal) return 'BANKER';
  return 'TIE';
};

export const isNaturalWin = (player: Card[], banker: Card[]): boolean => {
    const pVal = calculateHandValue(player);
    const bVal = calculateHandValue(banker);
    return (player.length === 2 && banker.length === 2) && (pVal >= 8 || bVal >= 8);
}

export const getTrueCount = (runningCount: number, cardsDealt: number, totalCards: number): number => {
  const cardsRemaining = totalCards - cardsDealt;
  // Floor decks remaining to avoid massive fluctuations at the end of a shoe, minimum 0.5 deck
  const decksRemaining = Math.max(cardsRemaining / 52, 0.5); 
  return runningCount / decksRemaining;
};

export const getRecommendation = (trueCount: number): { text: string; type: 'PLAYER' | 'BANKER' | 'NEUTRAL' } => {
  // TC >= 1.5：Player
  // TC <= -1.5：Banker
  if (trueCount >= 1.5) return { text: '下注 閒家 (PLAYER)', type: 'PLAYER' };
  if (trueCount <= -1.5) return { text: '下注 莊家 (BANKER)', type: 'BANKER' };
  return { text: '觀望 (WAIT)', type: 'NEUTRAL' };
};