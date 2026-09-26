import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreboardProps {
  p1: { name: string; country: string; flag: string; sets: number[] };
  p2: { name: string; country: string; flag: string; sets: number[] };
  currentScore: [number, number];
  serving: 1 | 2;
}

const ShuttleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor" />
    <path d="M10 14L7 6h10l-3 8" />
  </svg>
);

const PremiumScoreboard = ({ p1, p2, currentScore, serving }: ScoreboardProps) => {
  return (
    <div className="w-full glass-panel rounded-[2rem] p-6 border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {/* Player 1 Profile */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-slate-100 border-2 border-white overflow-hidden shadow-md flex items-center justify-center">
               <span className="text-xs font-black text-[#0B1F3A] uppercase">{p1.name[0]}</span>
            </div>
            {serving === 1 && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 h-6 w-6 bg-sky-500 rounded-full border-2 border-white shadow-md flex items-center justify-center"
              >
                <ShuttleIcon />
              </motion.div>
            )}
          </div>
          <div className="text-center w-full">
            <h2 className="text-[11px] font-black tracking-tighter uppercase italic text-[#0B1F3A] leading-tight truncate">{p1.name}</h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p1.country}</p>
          </div>
        </div>

        {/* Dynamic Score Core */}
        <div className="flex flex-col items-center px-4">
          <div className="flex items-center gap-3">
            <motion.span 
              key={currentScore[0]}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-sky-600 font-mono tabular-nums leading-none tracking-tighter"
            >
              {currentScore[0]}
            </motion.span>
            <div className="h-8 w-0.5 bg-slate-100 rotate-12 rounded-full" />
            <motion.span 
              key={currentScore[1]}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-[#0B1F3A] font-mono tabular-nums leading-none tracking-tighter"
            >
              {currentScore[1]}
            </motion.span>
          </div>
          
          <div className="flex gap-1.5 mt-3">
            {(() => {
              // Safely extract single games-won count for each side
              const p1Won = Number(Array.isArray(p1.sets) ? p1.sets[0] : p1.sets) || 0;
              const p2Won = Number(Array.isArray(p2.sets) ? p2.sets[0] : p2.sets) || 0;
              if (p1Won === 0 && p2Won === 0) return null;
              return (
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 flex gap-2 items-center">
                  <span className={cn("text-[10px] font-black", p1Won > p2Won ? "text-sky-600" : "text-slate-400")}>{p1Won}</span>
                  <span className="text-[8px] font-black opacity-20">/</span>
                  <span className={cn("text-[10px] font-black", p2Won > p1Won ? "text-sky-600" : "text-slate-400")}>{p2Won}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Player 2 Profile */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-slate-100 border-2 border-white overflow-hidden shadow-md flex items-center justify-center">
               <span className="text-xs font-black text-[#0B1F3A] uppercase">{p2.name[0]}</span>
            </div>
            {serving === 2 && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 h-6 w-6 bg-sky-500 rounded-full border-2 border-white shadow-md flex items-center justify-center"
              >
                <ShuttleIcon />
              </motion.div>
            )}
          </div>
          <div className="text-center w-full">
            <h2 className="text-[11px] font-black tracking-tighter uppercase italic text-[#0B1F3A] leading-tight truncate">{p2.name}</h2>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p2.country}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumScoreboard;