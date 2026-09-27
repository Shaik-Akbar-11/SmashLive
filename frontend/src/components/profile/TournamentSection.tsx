import React from 'react';
import { Trophy, MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface TournamentSectionProps {
  tournaments?: Array<{
    _id?: string;
    name?: string;
    status?: string;
    result?: string;
    city?: string;
    date?: string;
  }>;
  matchHistory?: Array<{
    _id?: string;
    name?: string;
    date?: string;
    match_type?: string;
    category?: string;
    opponent?: string;
    result?: 'W' | 'L';
    score?: string;
  }>;
}

const RESULT_COLOR: Record<string, string> = {
  winner:     'bg-yellow-500',
  eliminated: 'bg-red-400',
  registered: 'bg-sky-500',
  confirmed:  'bg-green-500',
};

const TournamentSection = ({ tournaments = [], matchHistory = [] }: TournamentSectionProps) => {
  const navigate = useNavigate();

  if (tournaments.length === 0 && matchHistory.length === 0) {
    return (
      <div className="py-32 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
        <Trophy className="h-12 w-12 text-slate-200" />
        <div className="space-y-1">
          <h3 className="text-xl font-black text-[#0B1F3A] uppercase italic">No Match History</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            Complete matches to see history here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent matches */}
      {matchHistory.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recent Matches</p>
          {matchHistory.map((m, i) => (
            <div
              key={m._id || i}
              onClick={() => m._id && navigate(`/broadcast/${m._id}`)}
              className={cn(
                'bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-colors',
                m._id ? 'cursor-pointer hover:border-sky-200 hover:bg-sky-50/30' : ''
              )}
            >
              <div className={cn(
                'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-white text-sm',
                m.result === 'W' ? 'bg-green-500' : 'bg-red-400'
              )}>
                {m.result}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{m.name || 'Match'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                  vs {m.opponent} · {m.match_type}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-xs text-slate-600">{m.score}</p>
                <p className="text-[8px] font-black text-slate-300 uppercase">
                  {m.date ? new Date(m.date).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tournament participations */}
      {tournaments.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tournaments</p>
          {tournaments.map((t, i) => (
            <div
              key={t._id || i}
              onClick={() => t._id && navigate(`/tournament/${t._id}`)}
              className={cn(
                'bg-white border border-slate-100 rounded-2xl p-4 space-y-2 shadow-sm transition-colors',
                t._id ? 'cursor-pointer hover:border-sky-200 hover:bg-sky-50/30' : ''
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-[#0B1F3A] uppercase text-xs truncate flex-1">{t.name}</p>
                <Badge className={cn('text-white border-none text-[8px] font-black uppercase shrink-0', RESULT_COLOR[t.result || ''] || 'bg-slate-400')}>
                  {t.result || '—'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase">
                {t.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-sky-500" />{t.city}</span>}
                {t.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-sky-500" />{t.date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentSection;
