import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, MapPin, ArrowRight, Loader2, ChevronLeft, Target, Zap as ZapIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { AuthService } from '@/services/auth.service';
import { INDIAN_STATES, STATE_DISTRICTS } from '@/data/locations';
import { cn } from '@/lib/utils';

const LEVELS = [
  { id: 'beginner',      label: 'Beginner',      desc: 'Just starting out' },
  { id: 'intermediate',  label: 'Intermediate',  desc: 'Club level player' },
  { id: 'advanced',      label: 'Advanced',      desc: 'District / State level' },
  { id: 'professional',  label: 'Professional',  desc: 'National / International' },
];

const CATEGORIES = ['Men\'s Singles', 'Women\'s Singles', 'Men\'s Doubles', 'Women\'s Doubles', 'Mixed Doubles'];

const STEPS = ['Location', 'Level', 'Category'];

const Onboarding = () => {
  const navigate  = useNavigate();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);

  const [state,    setState]    = useState('');
  const [district, setDistrict] = useState('');
  const [age,      setAge]      = useState('');
  const [level,    setLevel]    = useState('');
  const [category, setCategory] = useState('');

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');

  const canNext = [
    state && district,
    !!level,
    !!category,
  ][step];

  const handleNext = () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    handleFinish();
  };

  const handleFinish = async () => {
    setLoading(true);
    const update = {
      state, district,
      age: age ? parseInt(age) : undefined,
      playingLevel: level,
      preferredCategory: category,
      onboardingComplete: true,
    };

    try {
      const updated = await AuthService.updateProfile(update);
      if (!updated) throw new Error('Profile update returned empty.');
      // Preserve the existing token — PATCH /auth/profile does not return a new one
      const current = JSON.parse(localStorage.getItem('userProfile') || '{}');
      AuthService.setLocalSession({ ...current, ...updated, onboardingComplete: true });
      showSuccess('Profile complete! Welcome to SmashLive.');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      showError(e?.message || 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    AuthService.setLocalSession({ ...profile, onboardingComplete: true });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-48 bg-[#0B1F3A] z-0"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0% 100%)' }} />

      {/* Cancel */}
      <div className="absolute top-8 left-8 z-20">
        <Button onClick={skip} variant="ghost"
          className="text-white hover:bg-white/10 rounded-2xl px-6 h-12 font-black uppercase tracking-widest text-[10px] gap-2 border border-white/10">
          <ChevronLeft className="h-4 w-4" /> Skip
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] space-y-8 relative z-10">

        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <Zap className="h-6 w-6 text-[#0EA5E9] fill-current" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                Smash<span className="text-sky-400">Live</span>
              </h1>
              <p className="text-[9px] font-bold text-sky-200/60 uppercase tracking-[0.3em]">Athlete Setup</p>
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#0B1F3A] tracking-tighter uppercase italic">
              {STEPS[step]}
            </h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 justify-center">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('h-1.5 rounded-full transition-all', i <= step ? 'bg-sky-500 w-10' : 'bg-slate-200 w-6')} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-slate-100 space-y-6">
          <AnimatePresence mode="wait">

            {/* Step 0: Location */}
            {step === 0 && (
              <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Home State</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 z-10" />
                    <Select value={state} onValueChange={v => { setState(v); setDistrict(''); }}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 pl-11 font-bold">
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-64">
                        {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {state && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">District</Label>
                    <Select value={district} onValueChange={setDistrict}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-64">
                        {STATE_DISTRICTS[state]?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Age (optional)</Label>
                  <Input type="number" value={age} onChange={e => setAge(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                    placeholder="Your age" min={10} max={80} />
                </div>
              </motion.div>
            )}

            {/* Step 1: Playing level */}
            {step === 1 && (
              <motion.div key="level" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your playing level</p>
                {LEVELS.map(l => (
                  <button key={l.id} onClick={() => setLevel(l.id)}
                    className={cn(
                      'w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4',
                      level === l.id ? 'border-sky-500 bg-sky-50' : 'border-slate-100 bg-slate-50 hover:border-sky-200'
                    )}>
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                      level === l.id ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-400')}>
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-[#0B1F3A] uppercase text-sm">{l.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{l.desc}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {/* Step 2: Preferred category */}
            {step === 2 && (
              <motion.div key="category" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred category</p>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={cn(
                      'w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4',
                      category === c ? 'border-sky-500 bg-sky-50' : 'border-slate-100 bg-slate-50 hover:border-sky-200'
                    )}>
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                      category === c ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-400')}>
                      <ZapIcon className="h-5 w-5" />
                    </div>
                    <p className="font-black text-[#0B1F3A] uppercase text-sm">{c}</p>
                  </button>
                ))}
              </motion.div>
            )}

          </AnimatePresence>

          <Button onClick={handleNext} disabled={!canNext || loading}
            className="w-full h-16 bg-[#0B1F3A] hover:bg-sky-500 text-white font-black text-lg rounded-[22px] shadow-xl transition-all group">
            {loading ? <Loader2 className="animate-spin" /> : (
              <span className="flex items-center gap-2">
                {step < STEPS.length - 1 ? 'Next' : 'Complete Setup'}
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
