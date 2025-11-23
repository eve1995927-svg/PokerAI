import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Power, Info, RefreshCw, Check, X } from 'lucide-react';
import Gatekeeper from './components/Gatekeeper';
import Keypad from './components/Keypad';
import { GamePhase, CardRank, Card, GameState, RoundState, GameHistoryItem } from './types';
import { CARD_CONFIG, TOTAL_CARDS } from './constants';
import { 
  calculateHandValue, 
  getNextExpectedInput, 
  determineWinner, 
  isNaturalWin,
  getTrueCount,
  getRecommendation
} from './services/baccaratLogic';

const App: React.FC = () => {
  // --- State ---
  const [accessGranted, setAccessGranted] = useState(false);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOGIN);
  const [showInfo, setShowInfo] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  
  // Persistent Game State
  const [gameState, setGameState] = useState<GameState>({
    decksRemaining: 8,
    cardsDealt: 0,
    runningCount: 0,
    roundCount: 1,
    results: [],
    history: []
  });

  // Current Round Transient State
  const [roundState, setRoundState] = useState<RoundState>({
    player: [],
    banker: [],
    winner: null,
    isNatural: false,
    isFinished: false,
    nextExpectedInput: 'NONE'
  });

  // Burn Phase State
  const [burnCount, setBurnCount] = useState(0);

  // --- Computed Values ---
  const trueCount = useMemo(() => 
    getTrueCount(gameState.runningCount, gameState.cardsDealt, TOTAL_CARDS), 
  [gameState.runningCount, gameState.cardsDealt]);

  const recommendation = useMemo(() => getRecommendation(trueCount), [trueCount]);

  // Determine when to show recommendation: Start of game OR End of Round
  const showRecommendation = useMemo(() => {
    if (phase !== GamePhase.PLAYING) return false;
    return roundState.isFinished || (gameState.roundCount === 1 && roundState.player.length === 0);
  }, [phase, roundState.isFinished, gameState.roundCount, roundState.player.length]);

  // Auto scroll history
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollLeft = historyRef.current.scrollWidth;
    }
  }, [gameState.results]);

  // --- Logic ---

  const pushHistory = useCallback(() => {
    setGameState(prev => {
        const historyItem: GameHistoryItem = { 
            gameState: { 
                decksRemaining: prev.decksRemaining,
                cardsDealt: prev.cardsDealt,
                runningCount: prev.runningCount,
                roundCount: prev.roundCount,
                results: [...prev.results]
            }, 
            roundState: { ...roundState },
            burnCount: phase === GamePhase.BURN ? burnCount : undefined
        };
        
        return {
            ...prev,
            history: [...prev.history, historyItem]
        };
    });
  }, [gameState, roundState, phase, burnCount]);

  const processCardInput = (rank: CardRank) => {
    // Create Card Object
    const config = CARD_CONFIG[rank];
    const newCard: Card = {
      rank,
      value: config.baccaratValue,
      countValue: config.countValue,
      id: Math.random().toString(36).substr(2, 9)
    };

    // Update Global Stats (Running Count)
    const newRunningCount = gameState.runningCount + newCard.countValue;
    const newCardsDealt = gameState.cardsDealt + 1;
    
    // Phase Handling
    if (phase === GamePhase.BURN) {
      setBurnCount(c => c + 1);
      setGameState(prev => ({
        ...prev,
        runningCount: newRunningCount,
        cardsDealt: newCardsDealt
      }));
      return;
    }

    if (phase === GamePhase.PLAYING) {
      const currentInput = roundState.nextExpectedInput;
      
      let newPlayer = [...roundState.player];
      let newBanker = [...roundState.banker];

      if (currentInput.startsWith('P')) {
        newPlayer.push(newCard);
      } else if (currentInput.startsWith('B')) {
        newBanker.push(newCard);
      }

      // Determine Next Step
      let nextStep: RoundState['nextExpectedInput'] = 'NONE';
      let isFinished = false;
      let winner = roundState.winner;
      let isNatural = roundState.isNatural;

      // Initial Deal Sequence (P1 -> P2 -> B1 -> B2)
      if (currentInput === 'P1') nextStep = 'P2';
      else if (currentInput === 'P2') nextStep = 'B1';
      else if (currentInput === 'B1') nextStep = 'B2';
      else if (currentInput === 'B2') {
        // After 4 cards, check for natural
        if (isNaturalWin(newPlayer, newBanker)) {
            isFinished = true;
            isNatural = true;
            winner = determineWinner(newPlayer, newBanker);
            nextStep = 'NONE';
        } else {
            // Check standard tableau rules
            nextStep = getNextExpectedInput(newPlayer, newBanker);
            if (nextStep === 'NONE') {
                isFinished = true;
                winner = determineWinner(newPlayer, newBanker);
            }
        }
      } else if (currentInput === 'P3' || currentInput === 'B3') {
        // After a 3rd card, re-evaluate
        nextStep = getNextExpectedInput(newPlayer, newBanker);
        if (nextStep === 'NONE') {
            isFinished = true;
            winner = determineWinner(newPlayer, newBanker);
        }
      }

      // Update State
      setRoundState({
        player: newPlayer,
        banker: newBanker,
        nextExpectedInput: nextStep,
        isFinished,
        isNatural,
        winner
      });

      setGameState(prev => ({
        ...prev,
        runningCount: newRunningCount,
        cardsDealt: newCardsDealt,
        // Only append result if finished in this step
        results: isFinished && winner ? [...prev.results, winner] : prev.results
      }));
    }
  };

  const handleInput = (rank: CardRank) => {
    // Check if we need to auto-start next round
    if (phase === GamePhase.PLAYING && roundState.isFinished) {
        // 1. Archive current state for Undo
        pushHistory();
        
        // 2. Initialize New Round Logic with the input card
        const config = CARD_CONFIG[rank];
        const newCard: Card = {
            rank,
            value: config.baccaratValue,
            countValue: config.countValue,
            id: Math.random().toString(36).substr(2, 9)
        };

        // 3. Update Game State for New Round
        setGameState(prev => ({
            ...prev,
            runningCount: prev.runningCount + newCard.countValue,
            cardsDealt: prev.cardsDealt + 1,
            roundCount: prev.roundCount + 1,
            // Result of previous round is already in `results` from processCardInput
        }));

        // 4. Set Round State to "Player 1 Card"
        setRoundState({
            player: [newCard], // P1
            banker: [],
            winner: null,
            isNatural: false,
            isFinished: false,
            nextExpectedInput: 'P2' // Expect P2 next
        });
        
    } else {
        // Normal input flow
        pushHistory();
        processCardInput(rank);
    }
  };

  const handleUndo = () => {
    setGameState(prev => {
      if (prev.history.length === 0) return prev;
      const history = [...prev.history];
      const lastState = history.pop(); // Remove last item
      
      if (!lastState) return prev;

      // Restore round state
      setRoundState(lastState.roundState);

      // Restore specific phase state
      if (lastState.burnCount !== undefined) {
          setBurnCount(lastState.burnCount);
      }
      
      // Return previous game state
      return {
        ...prev, // keep current structure
        ...lastState.gameState, // overwrite values (including results array)
        history: history // update history list
      };
    });
  };

  const finishBurnPhase = () => {
      if (navigator.vibrate) navigator.vibrate(50);
      setPhase(GamePhase.PLAYING);
      setRoundState(prev => ({ ...prev, nextExpectedInput: 'P1' }));
  };

  const resetShoe = () => {
      if (!window.confirm("結束牌靴並重置所有數據?")) return;
      setGameState({
        decksRemaining: 8,
        cardsDealt: 0,
        runningCount: 0,
        roundCount: 1,
        results: [],
        history: []
      });
      setRoundState({
        player: [],
        banker: [],
        winner: null,
        isNatural: false,
        isFinished: false,
        nextExpectedInput: 'NONE'
      });
      setPhase(GamePhase.BURN);
      setBurnCount(0);
  };

  // Initialize
  useEffect(() => {
      if (accessGranted && phase === GamePhase.LOGIN) {
          setPhase(GamePhase.BURN);
      }
  }, [accessGranted, phase]);

  // --- Render Helpers ---
  const getScore = (cards: Card[]) => calculateHandValue(cards);

  if (!accessGranted) {
    return <Gatekeeper onAccessGranted={() => setAccessGranted(true)} />;
  }

  return (
    <div className="h-[100dvh] w-full bg-slate-900 text-white font-sans flex flex-col overflow-hidden relative selection:bg-rose-gold/30">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1a0f1f] to-slate-900 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1/3 bg-rose-900/10 blur-[80px] pointer-events-none" />
      
      {/* Header - Fixed height */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 glass border-b border-white/5 z-20 h-14">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-rose-gold rounded-full shadow-[0_0_10px_rgba(183,110,121,0.8)]" />
            <h1 className="text-base font-bold tracking-wider text-rose-gold-light">紅花實驗室</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 active:scale-95">
                <Info size={18} />
            </button>
            <button onClick={resetShoe} className="p-2 rounded-full hover:bg-red-500/20 transition-colors text-red-400 active:scale-95">
                <Power size={18} />
            </button>
        </div>
      </header>

      {/* Stats Dashboard - Fixed height */}
      <div className="shrink-0 grid grid-cols-3 gap-px bg-white/5 border-b border-white/5 z-10 h-14">
          <div className="flex flex-col items-center justify-center border-r border-white/5 relative overflow-hidden group">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">流水數 (RC)</span>
              <span className={`text-lg font-mono font-bold leading-none ${gameState.runningCount > 0 ? 'text-green-400' : gameState.runningCount < 0 ? 'text-red-400' : 'text-white'}`}>
                  {gameState.runningCount > 0 ? '+' : ''}{gameState.runningCount}
              </span>
          </div>
          <div className="flex flex-col items-center justify-center border-r border-white/5 bg-white/5">
              <span className="text-[9px] text-rose-gold uppercase tracking-widest animate-pulse mb-0.5">真數 (TC)</span>
              <span className={`text-xl font-mono font-bold leading-none ${trueCount >= 1.5 ? 'text-blue-400' : trueCount <= -1.5 ? 'text-red-400' : 'text-gray-200'}`}>
                  {trueCount.toFixed(1)}
              </span>
          </div>
          <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">剩餘牌數</span>
              <span className="text-lg font-mono font-bold text-white leading-none">
                  {TOTAL_CARDS - gameState.cardsDealt}
              </span>
          </div>
      </div>

      {/* Recommendation Banner - Dynamic */}
      <div className={`
        shrink-0 transition-all duration-300 ease-out overflow-hidden flex flex-col justify-center relative z-20
        ${showRecommendation ? 'h-24 opacity-100 border-b border-white/10' : 'h-0 opacity-0 border-none'}
        ${recommendation.type === 'PLAYER' ? 'bg-gradient-to-r from-blue-900/80 to-slate-900' : 
          recommendation.type === 'BANKER' ? 'bg-gradient-to-r from-red-900/80 to-slate-900' : 
          'bg-slate-800'}
      `}>
          {showRecommendation && (
            <div className="flex flex-col items-center justify-center animate-fade-in">
                <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-1">下一局建議</span>
                <div className="flex items-center gap-3">
                    {recommendation.type === 'NEUTRAL' ? (
                        <span className="text-2xl font-bold text-gray-300 tracking-widest">觀望 (WAIT)</span>
                    ) : (
                        <>
                            <span className="text-xl font-medium text-white/80">下注</span>
                            <span className={`text-4xl font-black tracking-wider ${recommendation.type === 'PLAYER' ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'} animate-pulse`}>
                                {recommendation.type === 'PLAYER' ? '閒家' : '莊家'}
                            </span>
                        </>
                    )}
                </div>
            </div>
          )}
      </div>

      {/* Main Game Area */}
      <div className="flex-1 min-h-0 relative z-0 flex flex-col">
          
          {/* Burn Phase UI */}
          {phase === GamePhase.BURN && (
              <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fade-in">
                 <div className="text-center mb-6">
                     <h2 className="text-xl font-bold text-rose-gold mb-1 tracking-widest">銷牌階段</h2>
                     <p className="text-gray-400 text-xs">請輸入銷掉的牌</p>
                 </div>

                 <div className="flex flex-col items-center gap-6 w-full max-w-xs">
                     <div className="w-32 h-32 bg-white/5 rounded-full border border-dashed border-white/20 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-white text-glow">{burnCount}</span>
                        <span className="text-[10px] text-gray-500 tracking-widest mt-1">已銷牌</span>
                     </div>

                    <button 
                        onClick={finishBurnPhase}
                        className="w-full bg-rose-gold text-luxury-black text-base font-bold py-3 px-6 rounded-xl shadow-[0_0_20px_rgba(183,110,121,0.3)] hover:bg-rose-gold-light active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                        <span>開始遊戲</span>
                        <Check className="w-5 h-5" />
                    </button>
                 </div>
              </div>
          )}

          {/* Playing Table UI */}
          {phase === GamePhase.PLAYING && (
            <div className="flex flex-col h-full relative">
             {/* Round Indicator */}
             <div className="text-center pt-2 pointer-events-none shrink-0 opacity-50">
                 <span className="text-[10px] font-mono text-gray-400">
                     ROUND {gameState.roundCount}
                 </span>
             </div>

             <div className="flex-1 flex items-center justify-center p-2 min-h-0">
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg h-full max-h-[50vh]">
                    
                    {/* Player Side */}
                    <div className={`
                        relative rounded-xl flex flex-col border transition-all duration-300 overflow-hidden
                        ${roundState.nextExpectedInput.startsWith('P') ? 'bg-blue-900/10 border-blue-500/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : 'bg-white/5 border-white/5'}
                        ${roundState.winner === 'PLAYER' ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}
                    `}>
                        <div className="h-8 flex items-center justify-center bg-black/20 border-b border-white/5 shrink-0">
                            <h2 className="text-blue-400 font-bold tracking-widest text-xs">閒家 PLAYER</h2>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
                            {/* Winner Indicator */}
                            {roundState.winner === 'PLAYER' && (
                                <div className="absolute inset-0 bg-blue-500/10 z-0 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-blue-400/20 -rotate-12">WIN</span>
                                </div>
                            )}

                            <div className="flex flex-wrap justify-center content-center gap-2 z-10">
                                {roundState.player.map((card) => (
                                    <div key={card.id} className="w-10 h-14 bg-white text-blue-900 rounded flex items-center justify-center font-bold text-lg shadow-md animate-shake select-none">
                                        {card.rank}
                                    </div>
                                ))}
                                {roundState.nextExpectedInput.startsWith('P') && !roundState.isFinished && (
                                    <div className="w-10 h-14 border-2 border-dashed border-blue-500/30 rounded flex items-center justify-center animate-pulse">
                                        <span className="text-blue-500/50 text-[8px]">發牌</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="h-12 flex items-center justify-center bg-black/20 border-t border-white/5 shrink-0">
                            <span className="text-3xl font-bold text-blue-100 text-glow">{getScore(roundState.player)}</span>
                        </div>
                    </div>

                    {/* Banker Side */}
                    <div className={`
                        relative rounded-xl flex flex-col border transition-all duration-300 overflow-hidden
                        ${roundState.nextExpectedInput.startsWith('B') ? 'bg-red-900/10 border-red-500/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' : 'bg-white/5 border-white/5'}
                         ${roundState.winner === 'BANKER' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-black' : ''}
                    `}>
                        <div className="h-8 flex items-center justify-center bg-black/20 border-b border-white/5 shrink-0">
                             <h2 className="text-red-400 font-bold tracking-widest text-xs">莊家 BANKER</h2>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
                             {/* Winner Indicator */}
                             {roundState.winner === 'BANKER' && (
                                <div className="absolute inset-0 bg-red-500/10 z-0 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-red-400/20 -rotate-12">WIN</span>
                                </div>
                            )}

                            <div className="flex flex-wrap justify-center content-center gap-2 z-10">
                                {roundState.banker.map((card) => (
                                    <div key={card.id} className="w-10 h-14 bg-white text-red-900 rounded flex items-center justify-center font-bold text-lg shadow-md animate-shake select-none">
                                        {card.rank}
                                    </div>
                                ))}
                                {roundState.nextExpectedInput.startsWith('B') && !roundState.isFinished && (
                                    <div className="w-10 h-14 border-2 border-dashed border-red-500/30 rounded flex items-center justify-center animate-pulse">
                                        <span className="text-red-500/50 text-[8px]">發牌</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-12 flex items-center justify-center bg-black/20 border-t border-white/5 shrink-0">
                            <span className="text-3xl font-bold text-red-100 text-glow">{getScore(roundState.banker)}</span>
                        </div>
                    </div>

                </div>
             </div>
             
             {/* Result Status & Bead Plate History */}
             <div className="shrink-0 pb-2">
                 {/* Status Text (Replacing Modal) */}
                 <div className="h-8 flex items-center justify-center">
                     {roundState.isFinished ? (
                        <div className="flex items-center gap-2 animate-bounce">
                             <span className={`text-sm font-bold ${roundState.winner === 'PLAYER' ? 'text-blue-400' : roundState.winner === 'BANKER' ? 'text-red-400' : 'text-green-400'}`}>
                                {roundState.winner === 'PLAYER' ? '閒家勝' : roundState.winner === 'BANKER' ? '莊家勝' : '和局'}
                             </span>
                        </div>
                     ) : (
                         <span className="text-xs text-gray-600 tracking-widest">
                             {roundState.nextExpectedInput !== 'NONE' ? '等待發牌...' : ''}
                         </span>
                     )}
                 </div>

                 {/* Bead Plate History */}
                 <div className="h-12 border-y border-white/5 bg-black/20 flex items-center px-4 overflow-x-auto gap-2 no-scrollbar" ref={historyRef}>
                     {gameState.results.length === 0 && <span className="text-[10px] text-gray-600 italic pl-1">尚無紀錄...</span>}
                     {gameState.results.map((res, idx) => (
                         <div key={idx} className={`
                             shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white/10
                             ${res === 'PLAYER' ? 'bg-blue-600 text-white' : res === 'BANKER' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}
                         `}>
                             {res === 'PLAYER' ? '閒' : res === 'BANKER' ? '莊' : '和'}
                         </div>
                     ))}
                 </div>
             </div>

            </div>
          )}
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="shrink-0 z-20 pb-1 bg-black/40 backdrop-blur-md border-t border-white/5">
        <Keypad 
            onInput={handleInput} 
            onUndo={handleUndo} 
            disabled={phase !== GamePhase.PLAYING && phase !== GamePhase.BURN} // Only disable if not playing/burning
        />
      </div>

      {/* Info Modal Overlay */}
      {showInfo && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowInfo(false)}>
              <div className="glass p-6 rounded-xl max-w-sm w-full border border-white/10 relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X size={20} />
                  </button>
                  <h3 className="text-rose-gold font-bold mb-4 text-lg">算牌系統說明</h3>
                  <ul className="space-y-3 text-sm text-gray-300">
                      <li className="flex justify-between items-center border-b border-white/5 pb-2"><span>A, 2, 3</span> <span className="text-green-400 font-mono">+1</span></li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2"><span>4</span> <span className="text-green-400 font-mono">+2</span></li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2"><span>5, 6, 7</span> <span className="text-red-400 font-mono">-1</span></li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2"><span>8</span> <span className="text-red-400 font-mono">-2</span></li>
                      <li className="flex justify-between items-center border-b border-white/5 pb-2"><span>9, 0, J, Q, K</span> <span className="text-gray-500 font-mono">0</span></li>
                  </ul>
                  <div className="mt-4 pt-2">
                      <p className="text-xs text-gray-400 mb-1">下注策略:</p>
                      <p className="text-sm flex justify-between"><span className="text-blue-400">真數 (TC) ≥ 1.5</span> <span>下注 閒家</span></p>
                      <p className="text-sm flex justify-between"><span className="text-red-400">真數 (TC) ≤ -1.5</span> <span>下注 莊家</span></p>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;