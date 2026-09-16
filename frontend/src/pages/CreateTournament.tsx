import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Check, Loader2, ChevronLeft, MapPin, Calendar, Copy, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TournamentAPI } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import EntitySearch from '@/components/ui/EntitySearch';

const CreateTournament = () => {
  const navigate  = useNavigate();
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [copied, setCopied]       = useState(false);
  const [slug, setSlug]           = useState('');
  const [form, setForm]           = useState({
    name: '', city: '', start_date: '', end_date: '',
    format: 'knockout', category: 'singles',
    max_participants: '16',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.city) {
      showError('Please fill name, city, and start date.');
      return;
    }
    setLoading(true);
    const generatedSlug = form.name.trim().toLowerCase().replace(/\s+/g, '-')
      + '-' + Math.random().toString(36).substring(7);
    try {
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const t = await TournamentAPI.create({
        name:             form.name,
        slug:             generatedSlug,
        city:             form.city,
        start_date:       form.start_date,
        end_date:         form.end_date,
        format:           form.format,
        category:         form.category,
        max_participants: parseInt(form.max_participants) || 16,
        organizer:        profile.name || 'Organizer',
        status:           'registration_open',
      });
      setSlug(t.slug || generatedSlug);
      setDone(true);
      showSuccess('Tournament created!');
    } catch (e: any) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const regLink = `${window.location.origin}/register/${slug}`;
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(regLink)}`;

  const downloadQR = async () => {
    try {
      const res  = await fetch(qrUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `QR_${form.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showSuccess('QR Downloaded!');
    } catch { showError('Download failed'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="container max-w-lg px-4 py-6">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-[#0B1F3A]">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-black text-[#0B1F3A] uppercase italic">New Tournament</h1>
                <Button onClick={handleCreate} disabled={loading} className="h-10 bg-[#0B1F3A] text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tournament Name</Label>
                  <div className="relative">
                    <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input value={form.name} onChange={e => set('name', e.target.value)}
                      className="h-12 pl-11 rounded-xl bg-slate-50 border-slate-100 font-bold" placeholder="e.g. Mumbai Open 2025" />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <EntitySearch
                    type="city" label="City / Venue"
                    value={form.city}
                    onChange={v => set('city', v)}
                    placeholder="e.g. Mumbai"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Start Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                        className="h-12 pl-10 rounded-xl bg-slate-50 border-slate-100 font-bold" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">End Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                        className="h-12 pl-10 rounded-xl bg-slate-50 border-slate-100 font-bold" />
                    </div>
                  </div>
                </div>

                {/* Format + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Format</Label>
                    <Select value={form.format} onValueChange={v => set('format', v)}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="knockout">Knockout</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Category</Label>
                    <Select value={form.category} onValueChange={v => set('category', v)}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="singles">Singles</SelectItem>
                        <SelectItem value="doubles">Doubles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Max participants */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Max Participants</Label>
                  <Select value={form.max_participants} onValueChange={v => set('max_participants', v)}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {['4','8','16','32','64','128'].map(n => (
                        <SelectItem key={n} value={n}>{n} Players</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="space-y-8 text-center pt-6">
              <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-100 shadow-lg">
                <Check className="h-10 w-10 stroke-[3px]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-[#0B1F3A] italic uppercase">Created</h2>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Registration is open</p>
              </div>

              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-2xl space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="p-4 bg-white rounded-3xl border-4 border-[#0B1F3A]/5 shadow-inner">
                      <img src={qrUrl} alt="QR" className="w-48 h-48" />
                    </div>
                    <Button onClick={downloadQR} className="absolute -bottom-3 -right-3 h-12 w-12 bg-sky-500 text-white rounded-2xl shadow-xl border-none">
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="space-y-3 w-full">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Registration Link</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 flex items-center overflow-hidden">
                        <span className="text-[10px] font-mono text-slate-500 truncate">{regLink}</span>
                      </div>
                      <Button onClick={() => { navigator.clipboard.writeText(regLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="h-12 w-12 bg-[#0B1F3A] text-white rounded-xl shrink-0">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate('/tournaments')} className="h-16 bg-[#0B1F3A] text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">
                  VIEW TOURNAMENTS
                </Button>
                <button onClick={() => navigate('/')} className="text-[10px] font-black text-slate-400 uppercase underline">Return Home</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CreateTournament;
