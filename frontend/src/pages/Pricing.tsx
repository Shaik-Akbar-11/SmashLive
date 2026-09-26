import React from 'react';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import { 
  Check, Zap, Shield, Globe, 
  BarChart3, Users, Star, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const navigate = useNavigate();
  const tiers = [
    {
      name: "Fan",
      price: "$0",
      desc: "For casual badminton enthusiasts.",
      features: [
        "Live scores & play-by-play",
        "Global rankings access",
        "Basic AI commentary",
        "Standard stream quality (720p)"
      ],
      button: "Join for Free",
      featured: false
    },
    {
      name: "Pro",
      price: "$12",
      desc: "For dedicated players and fans.",
      features: [
        "Everything in Fan tier",
        "Ultra-low latency streaming (4K)",
        "Advanced player intelligence stats",
        "Historical match archive (Unlimited)",
        "Personalized score alerts"
      ],
      button: "Get Pro Access",
      featured: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For clubs and tournament organizers.",
      features: [
        "Everything in Pro tier",
        "Full tournament management studio",
        "Broadcasting API access",
        "Custom analytics reports",
        "Dedicated regional server nodes"
      ],
      button: "Contact Sales",
      featured: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="container px-6 py-16 space-y-20">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-sky-500 text-white font-black px-4 py-1">MEMBERSHIPS</Badge>
          <h1 className="text-6xl font-black text-[#0B1F3A] tracking-tighter">Elevate Your Intelligence</h1>
          <p className="text-xl text-slate-500 font-medium">Choose the tier that fits your level of professional badminton engagement.</p>
        </div>

        {/* Tiers Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -12 }}
              className={`rounded-[3.5rem] p-12 space-y-8 flex flex-col border transition-all ${
                tier.featured 
                ? "bg-[#0B1F3A] border-[#0B1F3A] text-white shadow-2xl scale-105" 
                : "bg-white border-slate-100 text-[#0B1F3A] shadow-lg"
              }`}
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-widest">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">{tier.price}</span>
                  {tier.price !== "Custom" && <span className="text-xs font-bold opacity-60">/mo</span>}
                </div>
                <p className={`text-sm font-medium ${tier.featured ? "text-white/60" : "text-slate-500"}`}>{tier.desc}</p>
              </div>

              <div className="flex-1 space-y-4">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${tier.featured ? "bg-sky-500" : "bg-sky-100"}`}>
                      <Check className={`h-3 w-3 ${tier.featured ? "text-white" : "text-sky-600"}`} />
                    </div>
                    <span className="text-sm font-bold opacity-90">{feature}</span>
                  </div>
                ))}
              </div>

              <Button size="lg"
                onClick={() => tier.name === 'Fan' ? navigate('/login') : tier.name === 'Pro' ? navigate('/login') : window.open('mailto:support@smashlive.app', '_blank')}
                className={`w-full rounded-full h-16 font-black text-lg transition-all ${
                tier.featured 
                ? "bg-sky-500 text-white hover:bg-sky-400" 
                : "bg-[#0B1F3A] text-white hover:bg-[#0B1F3A]/90"
              }`}>
                {tier.button}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Social Proof / Security */}
        <div className="grid md:grid-cols-4 gap-8 py-12 border-y border-slate-100">
           {[
             { label: "Global Servers", icon: Globe, val: "24/7" },
             { label: "Data Accuracy", icon: Shield, val: "99.9%" },
             { label: "Live Viewers", icon: Users, val: "12M+" },
             { label: "AI Scenarios", icon: BarChart3, val: "1.2B" }
           ].map((s, i) => (
             <div key={i} className="text-center space-y-1">
               <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#0B1F3A] mb-4">
                 <s.icon className="h-6 w-6" />
               </div>
               <p className="text-2xl font-black text-[#0B1F3A]">{s.val}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
};

export default Pricing;