import React from 'react';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Badge {
  id: string;
  label: string;
  description: string;
}

const BADGE_META: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  winning_streak:       { emoji: '🔥', color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-100' },
  tournament_performer: { emoji: '🏆', color: 'text-sky-600',    bg: 'bg-sky-50',     border: 'border-sky-100'    },
  finalist:             { emoji: '🥈', color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100'  },
  elite_player:         { emoji: '👑', color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
};

const AchievementSection = ({ badges = [] }: { badges?: Badge[] }) => {
  if (badges.length === 0) {
    return (
      <div className="py-32 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
        <Award className="h-12 w-12 text-slate-200" />
        <div className="space-y-1">
          <h3 className="text-xl font-black text-[#0B1F3A] uppercase italic">No Badges Yet</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            Win matches, reach finals, and build your rating to earn badges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {badges.map(b => {
        const meta = BADGE_META[b.id] ?? { emoji: '🎖️', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' };
        return (
          <div
            key={b.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border',
              meta.bg, meta.border
            )}
          >
            <div className="text-3xl leading-none">{meta.emoji}</div>
            <div>
              <p className={cn('text-[11px] font-black uppercase tracking-widest', meta.color)}>{b.label}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{b.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementSection;
