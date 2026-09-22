import React from 'react';
import { Activity, Zap, Target, Timer, Flame, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MatchStatGridProps {
  stats?: {
    totalRallies?: number;
    longestGame?: string;
    winners?: number;
    accuracy?: string;
    faults?: number;
    errors?: number;
  };
}

const MatchStatGrid = ({ stats }: MatchStatGridProps) => {
  const statItems = [
    { label: "Total Points",  val: stats?.totalRallies ?? "0",    icon: Activity,      color: "text-sky-500",    bg: "bg-sky-50" },
    { label: "Longest Game",  val: stats?.longestGame  ?? "--",   icon: Timer,         color: "text-amber-500",  bg: "bg-amber-50" },
    { label: "Winners",       val: stats?.winners      ?? "0",    icon: Zap,           color: "text-sky-600",    bg: "bg-sky-50" },
    { label: "Net Accuracy",  val: stats?.accuracy     ?? "0%",   icon: Target,        color: "text-indigo-500", bg: "bg-indigo-50" },
    { label: "Faults",        val: stats?.faults       ?? "0",    icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50" },
    { label: "Errors",        val: stats?.errors       ?? "0",    icon: Flame,         color: "text-orange-500", bg: "bg-orange-50" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {statItems.map((stat, i) => (
        <motion.div 
          key={i}
          whileHover={{ y: -2 }}
          className="bg-white border border-slate-100 p-4 rounded-2xl space-y-3 shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform", stat.bg, stat.color)}>
              <stat.icon className="h-4 w-4" />
            </div>
            <span className="text-[7px] font-black text-slate-300">INTEL</span>
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h4 className="text-[18px] font-black text-[#0B1F3A] tracking-tighter mt-0.5">{stat.val}</h4>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MatchStatGrid;