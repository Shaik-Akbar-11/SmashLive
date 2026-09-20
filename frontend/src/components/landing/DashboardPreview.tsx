import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Star, Users, Target, Zap } from 'lucide-react';

const DashboardPreview = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative w-full aspect-[4/3] glass-panel rounded-[2rem] p-8 overflow-hidden neon-glow group"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0B1F3A]">Live Intelligence</h4>
            <p className="text-[10px] text-slate-500 font-medium">BWF World Tour Finals</p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matchup</span>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B1F3A]">Side A</span>
              <span className="text-sm font-black text-sky-500">21</span>
            </div>
            <div className="h-px bg-slate-200/50" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B1F3A]">Side B</span>
              <span className="text-sm font-black text-slate-400">19</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3 w-3 text-sky-500 fill-current" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Win Prob.</span>
          </div>
          <p className="text-2xl font-black text-[#0B1F3A]">84.2%</p>
          <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: '84%' }} />
          </div>
        </div>
      </div>

      {/* Court Visualization */}
      <div className="w-full h-40 bg-sky-900 rounded-2xl relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        <div className="h-full w-full absolute inset-0 flex items-center justify-center p-4">
           <div className="w-full h-full border border-white/20 rounded-lg flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-sky-400 neon-glow blur-[2px]" />
           </div>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md">
          <Target className="h-3 w-3 text-white/60" />
          <span className="text-[8px] font-bold text-white uppercase">Tracker active</span>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-4 -right-4 h-24 w-24 bg-sky-500/20 blur-3xl rounded-full" 
      />
    </motion.div>
  );
};

export default DashboardPreview;