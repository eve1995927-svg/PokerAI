import React from 'react';
import { Undo2 } from 'lucide-react';
import { RANKS, CARD_CONFIG } from '../constants';
import { CardRank } from '../types';

interface KeypadProps {
  onInput: (rank: CardRank) => void;
  onUndo: () => void;
  disabled?: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ onInput, onUndo, disabled }) => {
  const getButtonColor = (rank: CardRank) => {
    const countVal = CARD_CONFIG[rank].countValue;
    if (countVal > 0) return 'text-green-400'; // Player favorable
    if (countVal < 0) return 'text-red-400';   // Banker favorable
    return 'text-gray-400'; // Neutral
  };

  const handlePress = (rank: CardRank) => {
    if (disabled) return;
    if (navigator.vibrate) navigator.vibrate(10);
    onInput(rank);
  };

  const handleUndo = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    onUndo();
  };

  return (
    <div className="grid grid-cols-4 gap-1.5 p-2 max-w-md mx-auto">
      {RANKS.map((rank) => (
        <button
          key={rank}
          onClick={() => handlePress(rank)}
          disabled={disabled}
          className={`
            relative py-3.5 rounded-md text-lg font-bold bg-white/5 
            border border-white/5 active:bg-white/20 transition-all duration-75
            ${getButtonColor(rank)}
            ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}
          `}
        >
          {rank}
          <span className="absolute top-0.5 right-1 text-[9px] opacity-40 font-normal font-mono">
            {CARD_CONFIG[rank].countValue > 0 ? '+' + CARD_CONFIG[rank].countValue : CARD_CONFIG[rank].countValue === 0 ? '' : CARD_CONFIG[rank].countValue}
          </span>
        </button>
      ))}
      
      <button
        onClick={handleUndo}
        className="col-span-3 flex items-center justify-center gap-2 py-3.5 rounded-md text-sm font-medium bg-white/10 text-gray-300 active:bg-white/20 border border-white/5 hover:bg-white/15 transition-colors"
      >
        <Undo2 className="w-4 h-4" />
        復原
      </button>
    </div>
  );
};

export default Keypad;