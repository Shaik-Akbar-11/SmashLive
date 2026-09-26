import React from 'react';
import Navbar from '@/components/layout/Navbar';
import { Newspaper, Zap, Flame, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const newsItems = [
  { tag: 'Update', title: 'Live scoring now supports doubles format', time: '2h ago' },
  { tag: 'Feature', title: 'AI commentary engine upgraded to v2', time: '1d ago' },
  { tag: 'Circuit', title: 'State-level ranking system goes live this week', time: '3d ago' },
];

const News = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />

      <main className="px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-sky-500" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">Platform Updates</span>
          </div>
          <h1 className="text-4xl font-black text-[#0B1F3A] uppercase italic leading-none">
            Smash<span className="text-sky-500">Pulse</span>
          </h1>
        </div>

        {/* News Feed */}
        <div className="space-y-3">
          {newsItems.map((item, i) => (
            <div key={i} className="app-card p-5 flex items-center justify-between gap-4 active-press cursor-pointer"
              onClick={() => navigate('/tournaments')}>
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-sky-500" />
                </div>
                <div className="min-w-0 space-y-1">
                  <Badge className="bg-[#0B1F3A] text-sky-400 border-none text-[8px] font-black uppercase px-2 h-5">
                    {item.tag}
                  </Badge>
                  <p className="text-sm font-black text-[#0B1F3A] uppercase italic leading-tight">{item.title}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-200 shrink-0" />
            </div>
          ))}
        </div>

        {/* Empty state placeholder */}
        <div className="py-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl">
          <Zap className="h-8 w-8 text-slate-200 mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase italic">More intel loading...</p>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#0B1F3A] rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-sky-400 fill-current" />
            <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em]">Get Started</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic leading-tight">
            Launch Your Circuit Today
          </h2>
          <p className="text-[11px] text-white/50 font-medium">
            Create tournaments and go live with real athlete data.
          </p>
          <Button
            onClick={() => navigate('/tournaments/create')}
            className="w-full h-12 bg-sky-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest border-none hover:bg-sky-400"
          >
            Start Circuit
          </Button>
        </div>
      </main>
    </div>
  );
};

export default News;
