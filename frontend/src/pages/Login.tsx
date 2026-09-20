import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { AuthService } from '@/services/auth.service';
import { INDIAN_STATES, STATE_DISTRICTS } from '@/data/locations';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [regData, setRegData] = useState({ name: '', gender: '', state: '', district: '' });

  // ── Step 1: Send OTP via backend (Resend) ────────────────────────────────
  const handleSendOtp = async () => {
    if (activeTab === 'register') {
      if (!regData.name || !regData.gender || !regData.state || !regData.district) {
        showError('Please complete all registration fields.');
        return;
      }
    }
    if (!EMAIL_RE.test(email.trim())) {
      showError('Invalid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.sendOtp(email.trim());
      setStep('otp');
      showSuccess('OTP sent to ' + email.trim().toLowerCase());
    } catch (err: any) {
      showError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP and register/login via backend ────────────────────
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showError('Enter the 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'register') {
        const profile = await AuthService.registerAthlete({
          ...regData,
          email: email.trim(),
          otp:   code,
        });
        AuthService.setLocalSession(profile);
        showSuccess('Welcome to SmashLive!');
        navigate('/dashboard', { replace: true });
      } else {
        const profile = await AuthService.loginWithOtp(email.trim(), code);
        AuthService.setLocalSession(profile);
        showSuccess(`Welcome back, ${profile.name}!`);
        navigate(profile.onboardingComplete ? '/dashboard' : '/onboarding', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid or expired OTP.';
      // Make the error clear if user isn't registered
      if (msg.includes('No account found')) {
        showError('You are not registered. Please switch to the Register tab.');
      } else {
        showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setIsLoading(true);
    try {
      await AuthService.sendOtp(email.trim());
      showSuccess('OTP resent to ' + email.trim().toLowerCase());
    } catch (err: any) {
      showError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1F3A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-sky-500/10 blur-[100px] rounded-full" />

      <div className="w-full max-w-[440px] space-y-6 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl shadow-2xl">
              <Zap className="h-6 w-6 text-[#0EA5E9] fill-current" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                Smash<span className="text-sky-400">Live</span>
              </h1>
              <p className="text-[8px] font-black text-sky-400/60 uppercase tracking-widest">Athlete Network</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-6 border-t-4 border-sky-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Tab switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setStep('details'); setOtp(['', '', '', '', '', '']); }}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-[10px] font-black tracking-widest transition-all',
                  activeTab === tab ? 'bg-[#0B1F3A] text-white shadow-md' : 'text-slate-400'
                )}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Details step ── */}
            {step === 'details' && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {activeTab === 'register' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</Label>
                      <Input
                        value={regData.name}
                        onChange={e => setRegData({ ...regData, name: e.target.value })}
                        placeholder="Enter your full name"
                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</Label>
                        <Select value={regData.gender} onValueChange={v => setRegData({ ...regData, gender: v })}>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">State</Label>
                        <Select value={regData.state} onValueChange={v => setRegData({ ...regData, state: v, district: '' })}>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[300px]">
                            {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {regData.state && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">District</Label>
                        <Select value={regData.district} onValueChange={v => setRegData({ ...regData, district: v })}>
                          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-sm">
                            <SelectValue placeholder="Select District" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[300px]">
                            {STATE_DISTRICTS[regData.state]?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5 pb-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    autoComplete="email"
                    className="h-12 rounded-xl bg-slate-50 flex-1 font-bold text-sm border-slate-100"
                  />
                </div>

                <Button
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full h-14 rounded-xl bg-[#0B1F3A] text-white font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send OTP'}
                </Button>
              </motion.div>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[#0B1F3A]">Check Your Email</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    OTP sent to {email.trim().toLowerCase()}
                  </p>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-full h-12 border-2 border-slate-100 bg-slate-50 rounded-xl text-center font-black text-[#0B1F3A] outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  ))}
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={isLoading}
                  className="w-full h-14 rounded-xl bg-sky-500 text-white font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify & Enter'}
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => { setStep('details'); setOtp(['', '', '', '', '', '']); }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest underline underline-offset-4 hover:text-sky-500 transition-colors"
                  >
                    Change Email
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-[10px] font-black text-sky-500 uppercase tracking-widest underline underline-offset-4 hover:text-sky-700 transition-colors disabled:opacity-40"
                  >
                    Resend OTP
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Login;
