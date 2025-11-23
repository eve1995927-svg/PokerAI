export enum GamePhase {
  LOGIN = 'LOGIN',
  BURN = 'BURN',
  PLAYING = 'PLAYING',
}

export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: CardRank;
  value: number; // Point value for Baccarat (0-9)
  countValue: number; // Counting value (+1, +2, etc.)
  id: string; // Unique ID for React keys
}

export type InputSide = 'PLAYER' | 'BANKER' | 'BURN';

export interface RoundState {
  player: Card[];
  banker: Card[];
  winner: 'PLAYER' | 'BANKER' | 'TIE' | null;
  isNatural: boolean;
  isFinished: boolean;
  nextExpectedInput: 'P1' | 'P2' | 'B1' | 'B2' | 'P3' | 'B3' | 'NONE';
}

export interface GameState {
  decksRemaining: number; // Estimated via cards remaining
  cardsDealt: number;
  runningCount: number;
  roundCount: number;
  results: ('PLAYER' | 'BANKER' | 'TIE')[]; // History of winners
  history: GameHistoryItem[];
}

export interface GameHistoryItem {
  gameState: Omit<GameState, 'history'>; // Store snapshot without nested history
  roundState: RoundState;
  burnCount?: number; // Optional, used only during burn phase
}