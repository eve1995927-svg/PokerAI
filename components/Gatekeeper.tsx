import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface GatekeeperProps {
  onAccessGranted: () => void;
}

const Gatekeeper: React.FC<GatekeeperProps> = ({ onAccessGranted }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === '9527') {
      if (navigator.vibrate) navigator.vibrate(50);
      onAccessGranted();
    } else {
      setError(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-luxury-black text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 z-0" />
      <div className="absolute w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-pulse-slow z-0 top-1/4" />

      <div className="z-10 flex flex-col items-center w-full max-w-xs p-8 glass rounded-2xl border border-white/10">
        <div className="mb-6 p-4 rounded-full bg-gradient-to-br from-rose-gold/20 to-transparent border border-rose-gold/30">
          <Lock className="w-8 h-8 text-rose-gold" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-gold to-white">
          紅花實驗室
        </h1>
        <p className="text-xs text-gray-400 mb-8 tracking-widest uppercase">Red Flower Lab</p>

        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="輸入訪問代碼"
            className={`w-full bg-black/40 border ${error ? 'border-red-500 animate-shake' : 'border-white/10 focus:border-rose-gold'} text-center text-xl tracking-[0.5em] py-3 px-4 rounded-lg outline-none transition-all duration-300 mb-4 text-white placeholder-gray-600`}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-rose-gold/90 hover:bg-rose-gold text-black font-bold py-3 rounded-lg transition-colors shadow-lg shadow-rose-gold/20"
          >
            進入
          </button>
        </form>
      </div>
    </div>
  );
};

export default Gatekeeper;