import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Save, Zap, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { AuthService } from '@/services/auth.service';
import { INDIAN_STATES, STATE_DISTRICTS } from '@/data/locations';
import { cn } from '@/lib/utils';
import EntitySearch from '@/components/ui/EntitySearch';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'professional'];
const CATEGORIES = ["Men's Singles", "Women's Singles", "Men's Doubles", "Women's Doubles", "Mixed Doubles"];

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name:              '',
    gender:            '',
    state:             '',
    district:          '',
    age:               '',
    playingLevel:      '',
    preferredCategory: '',
    club:              '',
    university:        '',
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('userProfile') || '{}');
    setForm({
      name:              saved.name              || '',
      gender:            saved.gender            || '',
      state:             saved.state             || '',
      district:          saved.district          || '',
      age:               saved.age               ? String(saved.age) : '',
      playingLevel:      saved.playingLevel      || '',
      preferredCategory: saved.preferredCategory || '',
      club:              saved.club              || '',
      university:        saved.university        || '',
    });
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { showError('Name is required'); return; }
    setLoading(true);
    const update = {
      name:              form.name,
      gender:            form.gender,
      state:             form.state,
      district:          form.district,
      age:               form.age ? parseInt(form.age) : undefined,
      playingLevel:      form.playingLevel,
      preferredCategory: form.preferredCategory,
      club:              form.club,
      university:        form.university,
    };

    try {
      const updated = await AuthService.updateProfile(update);
      const current = JSON.parse(localStorage.getItem('userProfile') || '{}');
      AuthService.setLocalSession({ ...current, ...update, ...(updated || {}) });
      showSuccess('Profile updated!');
      navigate('/player/me');
    } catch (e: any) {
      // Offline — save locally
      const current = JSON.parse(localStorage.getItem('userProfile') || '{}');
      AuthService.setLocalSession({ ...current, ...update });
      showSuccess('Profile saved locally');
      navigate('/player/me');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="container max-w-lg px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/player/me')} className="p-2 -ml-2 text-slate-400 hover:text-[#0B1F3A]">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-black text-[#0B1F3A] uppercase italic">Edit Profile</h1>
          <Button onClick={handleSave} disabled={loading} className="h-10 bg-[#0B1F3A] text-white px-5 rounded-xl font-black text-[10px] uppercase">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save</>}
          </Button>
        </div>

        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl space-y-5">

          {/* Avatar preview */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
            <div className="h-16 w-16 rounded-full bg-[#0B1F3A] flex items-center justify-center text-sky-400 font-black text-2xl uppercase shrink-0">
              {form.name?.[0] || '?'}
            </div>
            <div>
              <p className="font-black text-[#0B1F3A] uppercase italic">{form.name || 'Your Name'}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SmashLive Athlete</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold" placeholder="Your name" />
          </div>

          {/* Gender + Age */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Age</Label>
              <Input type="number" value={form.age} onChange={e => set('age', e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold" placeholder="Age" min={8} max={80} />
            </div>
          </div>

          {/* State + District */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">State</Label>
              <Select value={form.state} onValueChange={v => set('state', v)}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-sm"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">District</Label>
              <Select value={form.district} onValueChange={v => set('district', v)} disabled={!form.state}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-sm"><SelectValue placeholder="District" /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {form.state && STATE_DISTRICTS[form.state]?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Playing level */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Playing Level</Label>
            <Select value={form.playingLevel} onValueChange={v => set('playingLevel', v)}>
              <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold"><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {LEVELS.map(l => <SelectItem key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Preferred category */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Preferred Category</Label>
            <Select value={form.preferredCategory} onValueChange={v => set('preferredCategory', v)}>
              <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Club / Academy */}
          <EntitySearch
            type="club" label="Club / Academy"
            value={form.club}
            onChange={v => set('club', v)}
            placeholder="e.g. City Badminton Club"
            context={{ state: form.state }}
          />

          {/* University */}
          <EntitySearch
            type="university" label="University"
            value={form.university}
            onChange={v => set('university', v)}
            placeholder="e.g. JNTU"
            context={{ state: form.state }}
          />
        </div>

        <Button onClick={handleSave} disabled={loading}
          className="w-full h-16 bg-[#0B1F3A] hover:bg-sky-500 text-white font-black text-lg rounded-[22px] shadow-xl transition-all gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <><Zap className="h-5 w-5 fill-current" /> Save Profile</>}
        </Button>
      </main>
    </div>
  );
};

export default EditProfile;
