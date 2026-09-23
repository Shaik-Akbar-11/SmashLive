import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, Users, Zap, Trophy, MapPin, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchAPI } from '@/services/api';

// ── Normalised result type ────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  type: 'player' | 'match' | 'tournament' | 'entity';
  title: string;
  subtitle: string;
  badge?: string;
  route: string;
}

function normalise(raw: {
  players: any[];
  matches: any[];
  tournaments: any[];
  entities: any[];
}): SearchResult[] {
  const results: SearchResult[] = [];

  for (const p of raw.players) {
    results.push({
      id: p._id,
      type: 'player',
      title: p.name,
      subtitle: [p.smashId, p.district, p.state].filter(Boolean).join(' · ') || 'Player',
      badge: 'Player',
      route: `/player/${p._id}`,
    });
  }

  for (const m of raw.matches) {
    const p1 = m.players?.p1?.name || m.players?.sideA?.[0]?.name || 'Side A';
    const p2 = m.players?.p2?.name || m.players?.sideB?.[0]?.name || 'Side B';
    const time = m.scheduledAt
      ? new Date(m.scheduledAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
      : m.createdAt
      ? new Date(m.createdAt).toLocaleDateString('en-IN', { dateStyle: 'short' })
      : '';
    results.push({
      id: m._id,
      type: 'match',
      title: m.name || `${p1} vs ${p2}`,
      subtitle: `${p1} vs ${p2}${time ? ' · ' + time : ''}`,
      badge: m.status === 'live' ? 'Live' : m.status === 'completed' ? 'Done' : 'Scheduled',
      route: m.status === 'live'
        ? `/broadcast/${m._id}`
        : m.status === 'completed'
        ? `/match/${m._id}`
        : `/scoring/${m._id}`,
    });
  }

  for (const t of raw.tournaments) {
    results.push({
      id: t._id,
      type: 'tournament',
      title: t.name,
      subtitle: [t.city, t.venue, t.status].filter(Boolean).join(' · '),
      badge: 'Tournament',
      route: `/tournament/${t._id}`,
    });
  }

  for (const e of raw.entities) {
    results.push({
      id: e._id,
      type: 'entity',
      title: e.name,
      subtitle: [e.type, e.city, e.state].filter(Boolean).join(' · '),
      badge: e.type.charAt(0).toUpperCase() + e.type.slice(1),
      route: e.type === 'university' || e.type === 'club'
        ? `/players?org=${encodeURIComponent(e.name)}`
        : `/players?venue=${encodeURIComponent(e.name)}`,
    });
  }

  return results;
}

// ── Group by type ─────────────────────────────────────────────────────────────
type GroupKey = 'player' | 'match' | 'tournament' | 'entity';
const GROUP_LABELS: Record<GroupKey, string> = {
  player:     'Players',
  match:      'Matches',
  tournament: 'Tournaments',
  entity:     'Venues & Clubs',
};
const GROUP_ICONS: Record<GroupKey, React.ElementType> = {
  player:     Users,
  match:      Zap,
  tournament: Trophy,
  entity:     MapPin,
};

function groupResults(results: SearchResult[]) {
  const groups: Partial<Record<GroupKey, SearchResult[]>> = {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type]!.push(r);
  }
  return groups;
}

// ── Quick suggestions shown when focused but empty ────────────────────────────
const QUICK_LINKS = [
  { label: 'Live Matches',      icon: Zap,      route: '/live-match/active' },
  { label: 'Scheduled',         icon: Calendar, route: '/live-match/active' },
  { label: 'Tournaments',       icon: Trophy,   route: '/tournaments' },
  { label: 'Players',           icon: Users,    route: '/players' },
  { label: 'Rankings',          icon: Zap,      route: '/rankings' },
];

// ── Badge colour by status ─────────────────────────────────────────────────────
const badgeColor = (badge?: string) => {
  if (badge === 'Live')       return 'bg-red-100 text-red-600';
  if (badge === 'Scheduled')  return 'bg-sky-100 text-sky-700';
  if (badge === 'Done')       return 'bg-slate-100 text-slate-500';
  if (badge === 'Tournament') return 'bg-amber-100 text-amber-700';
  if (badge === 'Player')     return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-500';
};

// ── Component ─────────────────────────────────────────────────────────────────
const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [error,   setError]   = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounce    = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const raw = await SearchAPI.global(q);
      setResults(normalise(raw));
      setOpen(true);
    } catch {
      setError(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounce.current);
    if (val.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(() => doSearch(val), 300);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const go = (route: string) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(route);
  };

  const groups = groupResults(results);
  const hasResults = results.length > 0;
  const showEmpty = open && query.length >= 2 && !loading && !hasResults && !error;
  const showQuick = open && query.length < 2;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className={cn(
        'flex items-center gap-3 bg-white border rounded-2xl px-4 h-14 shadow-sm transition-all',
        open ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-100'
      )}>
        {loading
          ? <Loader2 className="h-4 w-4 text-sky-500 animate-spin shrink-0" />
          : <Search className="h-4 w-4 text-slate-300 shrink-0" />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Search SmashLive..."
          className="flex-1 bg-transparent text-sm font-bold text-[#0B1F3A] placeholder:text-slate-300 placeholder:font-normal outline-none"
          autoComplete="off"
          aria-label="Search SmashLive"
        />
        {query && (
          <button onClick={clear} className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
          >
            {/* Quick links (no query) */}
            {showQuick && (
              <div className="p-3 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 pb-1">Quick Access</p>
                {QUICK_LINKS.map(link => (
                  <button
                    key={link.route + link.label}
                    onClick={() => go(link.route)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <link.icon className="h-4 w-4 text-sky-500 shrink-0" />
                    <span className="text-sm font-bold text-[#0B1F3A]">{link.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Grouped results */}
            {hasResults && (
              <div className="p-3 space-y-3">
                {(Object.keys(groups) as GroupKey[]).map(type => {
                  const Icon = GROUP_ICONS[type];
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 px-2 pb-1">
                        <Icon className="h-3 w-3 text-slate-400" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {GROUP_LABELS[type]}
                        </p>
                      </div>
                      {groups[type]!.map(r => (
                        <button
                          key={r.id}
                          onClick={() => go(r.route)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-[#0B1F3A] truncate leading-tight">{r.title}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{r.subtitle}</p>
                          </div>
                          {r.badge && (
                            <span className={cn('shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full', badgeColor(r.badge))}>
                              {r.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="py-10 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No results for "{query}"</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="py-8 text-center">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Search unavailable. Try again.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
