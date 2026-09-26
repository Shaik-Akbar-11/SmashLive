import React from 'react';
import { Target, Zap, Shield, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsSectionProps {
  stats?: {
    smashes?: number;
    nets?: number;
    errors?: number;
    matchesPlayed?: number;
    matchesWon?: number;
    winRate?: string;
  };
}

const AnalyticsSection = ({ stats }: AnalyticsSectionProps) => {
  const hasData = stats && (stats.smashes || stats.nets || stats.errors || stats.matchesPlayed);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="py-20 text-center border-2 border-dashed rounded-[2.5rem] bg-white border-slate-200">
          <Target className="h-10 w-10 text-slate-200 mx-auto mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-8">
            Biomechanical data is generated after 3 official network matches.
          </p>
        </div>
        <div className="bg-[#0B1F3A] p-8 rounded-[2.5rem] text-white space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-sky-400" />
            <h3 className="text-sm font-black uppercase tracking-widest">Protocol Core</h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed font-medium italic">
            "System is awaiting tactical input. Record a match session to initialize the AI analysis layer."
          </p>
        </div>
      </div>
    );
  }

  const smashAccuracy = stats.smashes && stats.matchesPlayed
    ? Math.min(100, Math.round((stats.smashes / (stats.matchesPlayed * 10)) * 100))
    : 0;

  const tiles = [
    { label: 'Smashes', val: stats.smashes ?? 0, icon: Zap, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Net Kills', val: stats.nets ?? 0, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Errors', val: stats.errors ?? 0, icon: Shield, color: 'text-red-400', bg: 'bg-red-50' },
    { label: 'Win Rate', val: stats.winRate ?? '0%', icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-3', t.bg)}>
              <t.icon className={cn('h-4 w-4', t.color)} />
            </div>
            <p className={cn('text-2xl font-black', t.color)}>{t.val}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Smash accuracy bar */}
      <div className="bg-[#0B1F3A] p-6 rounded-2xl text-white space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">Shot Efficiency</span>
          <span className="text-sm font-black text-white">{smashAccuracy}%</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500 rounded-full shadow-[0_0_8px_#0ea5e9] transition-all"
            style={{ width: `${smashAccuracy}%` }} />
        </div>
        <p className="text-[9px] text-white/40 font-bold uppercase">Based on {stats.matchesPlayed ?? 0} matches played</p>
      </div>
    </div>
  );
};

export default AnalyticsSection;
