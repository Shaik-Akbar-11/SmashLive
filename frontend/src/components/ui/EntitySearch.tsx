import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check } from 'lucide-react';
import { EntityAPI } from '@/services/api';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Label } from './label';

interface EntitySearchProps {
  type: 'city' | 'venue' | 'club' | 'university';
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra context passed when creating a new entity */
  context?: { state?: string; city?: string };
}

/**
 * Reusable autocomplete input for city, venue, club, university.
 * - Shows dropdown after 2+ chars
 * - Allows selecting existing or creating new
 * - Uses /api/entities endpoint
 */
const EntitySearch: React.FC<EntitySearchProps> = ({
  type, label, value, onChange, placeholder, className, context
}) => {
  const [query,    setQuery]    = useState(value || '');
  const [results,  setResults]  = useState<any[]>([]);
  const [open,     setOpen]     = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<any>(null);

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    try {
      const data = await EntityAPI.search(type, q);
      setResults(data);
      setOpen(true);
    } catch { setResults([]); }
  }, [type]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);  // keep parent in sync with typed text immediately
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(q), 250);
  };

  const select = (name: string) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
    setResults([]);
  };

  const createNew = async () => {
    if (query.trim().length < 2) return;
    setCreating(true);
    try {
      const entity = await EntityAPI.create(type, query.trim(), context);
      select(entity.name);
    } catch {
      select(query.trim()); // fall back to typed value
    } finally { setCreating(false); }
  };

  const exactMatch = results.some(r => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={wrapRef} className={cn('space-y-1.5 relative', className)}>
      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">{label}</Label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => { if (query.length >= 2) search(query); }}
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
          className="h-12 pl-11 bg-slate-50 border-slate-100 rounded-xl font-bold focus:border-sky-500"
        />
      </div>

      <AnimatePresence>
        {open && (results.length > 0 || (query.length >= 2 && !exactMatch)) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden"
          >
            {results.map(r => (
              <button
                key={r._id}
                onMouseDown={() => select(r.name)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <Check className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span className="text-sm font-bold text-[#0B1F3A]">{r.name}</span>
                {r.state && <span className="text-[9px] font-black text-slate-300 uppercase ml-auto">{r.state}</span>}
              </button>
            ))}

            {/* Add new option */}
            {query.trim().length >= 2 && !exactMatch && (
              <button
                onMouseDown={createNew}
                disabled={creating}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-sky-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span className="text-sm font-bold text-sky-600">Add "{query.trim()}"</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EntitySearch;
