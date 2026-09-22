import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Edit3, LogOut, Flag, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { AuthService } from '@/services/auth.service';

interface ProfileHeroProps {
  profile: {
    _id?: string;
    name: string;
    country: string;
    state: string;
    image?: string;
    avatar?: string;
    smash_id?: string;
    smashId?: string;
    rank?: string | number;
    points?: number;
    matchesPlayed?: number;
    matchesWon?: number;
    rankingPoints?: number;
    winRate?: string;
  };
  isOwnProfile?: boolean;
}

const ProfileHero = ({ profile, isOwnProfile }: ProfileHeroProps) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    AuthService.logout();
    navigate('/');
  };

  const name = profile?.name || "Athlete";
  const smashId = profile?.smash_id || profile?.smashId || '';
  const country = profile?.country || "India";
  const state = profile?.state || "Regional";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-full p-1 bg-gradient-to-br from-[#0B1F3A] to-sky-500 shadow-lg shrink-0">
          <div className="h-full w-full rounded-full bg-slate-100 border-2 border-white overflow-hidden flex items-center justify-center">
          {profile?.image || profile?.avatar ? (
              <img src={profile.image || profile.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-[20px] font-black text-[#0B1F3A]">{name[0]?.toUpperCase()}</span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <h1 className="uppercase italic leading-none">{name}</h1>
          </div>
          <p className="text-sky-600 font-mono text-[10px] font-black uppercase tracking-widest italic">{smashId}</p>
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
            <span className="flex items-center gap-1"><Flag className="h-3 w-3 text-sky-500" /> {country}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-sky-500" /> {state}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-y border-slate-50 py-4">
        {[
          { label: 'Rank',     val: profile?.rank     ?? profile?.rankingPoints ?? '—',  color: 'text-[#0B1F3A]' },
          { label: 'Win Rate', val: profile?.winRate  ?? (profile?.matchesPlayed > 0 ? `${Math.round((profile.matchesWon / profile.matchesPlayed) * 100)}%` : '0%'), color: 'text-sky-600' },
          { label: 'Points',   val: profile?.rankingPoints ?? profile?.points ?? 0, color: 'text-[#0B1F3A]' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{s.label}</p>
            <p className={cn("text-[16px] font-black italic", s.color)}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => {
            // Use actual player ID for a shareable permanent link
            const playerId = profile?._id || smashId;
            const shareUrl = playerId
              ? `${window.location.origin}/player/${playerId}`
              : window.location.href;
            navigator.clipboard.writeText(shareUrl);
            showSuccess("Profile link copied!");
          }}
          variant="outline" className="flex-1 h-9 rounded-lg border-slate-100 text-[11px] font-black uppercase">
          <Share2 className="mr-2 h-3.5 w-3.5" /> Share
        </Button>
        {isOwnProfile && (
          <>
            <Link to="/player/edit" className="flex-1">
              <Button variant="outline" className="w-full h-9 rounded-lg border-slate-100 text-[11px] font-black uppercase"><Edit3 className="mr-2 h-3.5 w-3.5" /> Edit</Button>
            </Link>
            <Button onClick={handleSignOut} variant="ghost" className="h-9 w-9 p-0 rounded-lg text-red-500 hover:bg-red-50"><LogOut className="h-4 w-4" /></Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileHero;