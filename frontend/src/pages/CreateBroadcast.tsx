import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trophy, Radio, Target, 
  MapPin, Upload, ChevronRight, Play,
  Shield, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const CreateBroadcast = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'tournament' | 'individual' | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      
      <main className="container max-w-4xl px-4 py-16">
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto bg-[#0B1F3A]/10 p-4 rounded-3xl text-[#0B1F3A] w-fit border border-[#0B1F3A]/5">
              <Radio className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tighter italic text-[#0B1F3A]">BROADCAST STUDIO</h1>
              <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">Configure your live stream parameters</p>
            </div>
          </div>

          {!type ? (
            /* Selection Phase */
            <div className="grid md:grid-cols-2 gap-8">
              <div 
                onClick={() => setType('tournament')}
                className="glass-panel p-10 rounded-[3rem] text-center space-y-6 cursor-pointer border-slate-200 hover:border-sky-500 transition-all group hover:scale-[1.02] bg-white shadow-xl"
              >
                <div className="mx-auto h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                  <Trophy className="h-10 w-10 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#0B1F3A]">Tournament Match</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Stream professional matches with bracket integration and official seeding.</p>
                </div>
                <Button className="w-full bg-[#0B1F3A] text-white font-bold h-12 rounded-xl group-hover:bg-sky-500 transition-colors">
                  Select Tournament <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div 
                onClick={() => setType('individual')}
                className="glass-panel p-10 rounded-[3rem] text-center space-y-6 cursor-pointer border-slate-200 hover:border-sky-500 transition-all group hover:scale-[1.02] bg-white shadow-xl"
              >
                <div className="mx-auto h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center group-hover:bg-sky-50 transition-colors">
                  <Target className="h-10 w-10 text-slate-400 group-hover:text-sky-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#0B1F3A]">Individual Match</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Practice, friendly challenges, or quick exhibitions outside of tournaments.</p>
                </div>
                <Button className="w-full bg-[#0B1F3A] text-white font-bold h-12 rounded-xl group-hover:bg-sky-500 transition-colors">
                  Select Individual <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* Form Phase */
            <div className="space-y-8">
              <Button 
                variant="ghost" 
                onClick={() => setType(null)}
                className="font-bold text-slate-400 hover:text-[#0B1F3A]"
              >
                ← Change Broadcast Type
              </Button>

              <div className="grid md:grid-cols-12 gap-8">
                <div className="md:col-span-8 space-y-8">
                  <section className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-slate-200 bg-white">
                    <h3 className="text-xl font-black flex items-center gap-3 italic text-[#0B1F3A]">
                      {type === 'tournament' ? <Trophy className="h-5 w-5 text-sky-500" /> : <Shield className="h-5 w-5 text-sky-500" />}
                      {type === 'tournament' ? 'Tournament Match Details' : 'Individual Match Details'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Player / Team 1</Label>
                        <Input placeholder="Search Player" className="h-12 bg-slate-50 border-slate-100 rounded-xl px-4 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Player / Team 2</Label>
                        <Input placeholder="Search Player" className="h-12 bg-slate-50 border-slate-100 rounded-xl px-4 font-bold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Venue / Court</Label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <Input placeholder="Main Court 01" className="h-12 bg-slate-50 border-slate-200 rounded-xl pl-11 font-bold" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Match Category</Label>
                        <Input placeholder="Men's Singles" className="h-12 bg-slate-50 border-slate-200 rounded-xl px-4 font-bold" />
                      </div>
                    </div>
                  </section>

                  <section className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-slate-200 bg-white">
                    <h3 className="text-xl font-black italic text-[#0B1F3A]">Stream Configuration</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Stream Title</Label>
                        <Input placeholder="Enter a catchy title for your audience" className="h-14 bg-slate-50 border-slate-200 rounded-xl px-6 font-bold text-lg" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Thumbnail Preview</Label>
                        <div className="h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                          <Upload className="h-8 w-8 text-slate-300 group-hover:text-sky-500 transition-colors" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload Custom Thumbnail (16:9)</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="md:col-span-4 space-y-8">
                  <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 bg-[#0B1F3A] text-white border-none shadow-2xl">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-sky-400 fill-sky-400" />
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Summary</span>
                      </div>
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-white/60 uppercase">BROADCAST TYPE</span>
                          <span className="text-white uppercase">{type}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-white/60 uppercase">SERVERS</span>
                          <span className="text-white">Auto-Optimize (Edge)</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-white/60 uppercase">LATENCY</span>
                          <Badge className="bg-sky-500/20 text-sky-400 border-none h-4 text-[8px] font-black">ULTRA LOW</Badge>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate('/live-match/create')}
                      className="w-full h-16 bg-sky-500 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-sky-400 transition-transform active:scale-95"
                    >
                      GO LIVE NOW <Play className="ml-2 h-5 w-5 fill-current" />
                    </Button>
                    <p className="text-[10px] text-center font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                      By clicking Go Live, you agree to SmashLive's broadcasting terms and conditions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateBroadcast;