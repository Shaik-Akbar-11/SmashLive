import React from 'react';
import { Zap, Trophy, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const SmashRating = ({ rating = 0, level = 1, xp = 0, rank }: { rating?: number; level?: number; xp?: number; rank?: number | string }) => {
  return (
    <div className="bg-[#0B1F3A] rounded-2xl p-4 text-white relative overflow-hidden shadow-xl">
      <Zap className="absolute -right-4 -bottom-4 h-24 w-24 text-sky-500 opacity-10 rotate-12" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Smash Rating</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black italic">{rating}</h2>
            <span className="text-[10px] font-bold text-green-400 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +12
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rank</p>
          <p className="text-sm font-black text-white">{rank ? `#${rank}` : '—'}</p>
        </div>
      </div>

      <div className="space-y-1.5 relative z-10">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-sky-400">Level {level}</span>
          <span className="text-white/60">{xp}% to Level {level + 1}</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]" style={{ width: `${xp}%` }} />
        </div>
      </div>
    </div>
  );
};

export default SmashRating;