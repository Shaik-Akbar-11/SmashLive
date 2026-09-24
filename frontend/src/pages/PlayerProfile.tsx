import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import ProfileHero from '@/components/profile/ProfileHero';
import PerformanceStats from '@/components/profile/PerformanceStats';
import TournamentSection from '@/components/profile/TournamentSection';
import AnalyticsSection from '@/components/profile/AnalyticsSection';
import AchievementSection from '@/components/profile/AchievementSection';
import { Activity, BarChart3, Trophy, Award, Loader2, Flame, History, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserAPI } from '@/services/api';
import { AuthService } from '@/services/auth.service';
import { useSocketEvent } from '@/hooks/use-socket';
import { ProfileSkeleton, StatCardSkeleton } from '@/components/ui/skeleton-cards';
import { showSuccess, showError } from '@/utils/toast';

const PlayerProfile = () => {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const [activeTab, setActiveTab]     = useState('performance');
  const [loading, setLoading]         = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats]             = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [tournaments, setTournaments]   = useState<any[]>([]);
  const [isFollowing, setIsFollowing]   = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading]   = useState(false);
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null);

  const savedProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
  const isMe = !id || id === 'me';

  // Fetch the actual logged-in user's ID from the server to avoid stale localStorage
  useEffect(() => {
    AuthService.getProfile().then(p => {
      if (p?._id) setCurrentUserId(p._id);
      else setCurrentUserId(savedProfile?._id || savedProfile?.id || null);
    }).catch(() => {
      setCurrentUserId(savedProfile?._id || savedProfile?.id || null);
    });
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profileId = isMe ? (savedProfile?._id || savedProfile?.id) : id;

      if (!profileId) {
        // Not logged in or no id — show local profile only
        if (savedProfile) setProfileData(savedProfile);
        setLoading(false);
        return;
      }

      const result = await UserAPI.getStats(profileId);
      setProfileData(result.user);
      setStats(result.stats);
      setMatchHistory(result.matchHistory || []);
      setTournaments(result.tournaments || []);

      // Load follow state for other players' profiles
      const myId = currentUserId || savedProfile?._id || savedProfile?.id;
      if (!isMe && myId && profileId !== myId) {
        const fc = (result.user?.followers?.length ?? 0);
        setFollowersCount(fc);
        try {
          const myFollowing = await UserAPI.getFollowing(myId);
          setIsFollowing(myFollowing.some((u: any) => String(u._id) === String(profileId)));
        } catch {
          // best-effort — stay false
        }
      } else {
        setFollowersCount(result.user?.followers?.length ?? 0);
      }
    } catch {
      // Fallback to basic user fetch
      try {
        const uid = isMe ? (savedProfile?._id || savedProfile?.id) : id;
        if (uid) {
          const u = await UserAPI.getById(uid!);
          setProfileData(u);
        } else if (savedProfile) {
          setProfileData(savedProfile);
        }
      } catch {
        if (savedProfile && isMe) setProfileData(savedProfile);
      }
    } finally {
      setLoading(false);
    }
  }, [id, isMe]);

  useEffect(() => { fetchProfile(); }, [fetchProfile, currentUserId]);

  // Re-fetch when a match involving this player completes
  useSocketEvent('feed:match_completed', (match) => {
    const str  = JSON.stringify(match.players || '').toLowerCase();
    const myId = profileData?._id || profileData?.id || id;
    const myName = (profileData?.name || '').toLowerCase();
    if (myId && (str.includes(String(myId)) || (myName && str.includes(myName)))) {
      fetchProfile();
    }
  });

  const handleFollow = async () => {
    const isLoggedIn = !!localStorage.getItem('authToken');
    if (!isLoggedIn) { showError('Login to follow athletes'); return; }
    if (!profileData?._id) return;
    setFollowLoading(true);
    try {
      const res = await UserAPI.toggleFollow(profileData._id);
      setIsFollowing(res.following);
      setFollowersCount(res.followersCount);
      showSuccess(res.following ? 'Following!' : 'Unfollowed');
    } catch (err: any) {
      showError(err.message || 'Failed');
    } finally {
      setFollowLoading(false);
    }
  };

  const tabs = [
    { id: 'performance', label: 'Stats',    icon: Activity },
    { id: 'history',     label: 'Matches',  icon: Trophy },
    { id: 'analytics',   label: 'Tech',     icon: BarChart3 },
    { id: 'badges',      label: 'Awards',   icon: Award },
  ];

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container max-w-lg px-4 py-6 space-y-6">
        <ProfileSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );

  if (!profileData) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Profile not found</p>
      <Button onClick={() => navigate('/')} className="bg-[#0B1F3A] text-white rounded-xl font-black uppercase text-[10px]">
        Home
      </Button>
    </div>
  );

  const myId = currentUserId || savedProfile?._id || savedProfile?.id;
  const isOwnProfile = isMe || (
    !!myId && !!profileData?._id && String(profileData._id) === String(myId)
  );
  const winRate = stats?.winRate ?? (
    (profileData?.matchesPlayed > 0)
      ? `${Math.round((profileData.matchesWon / profileData.matchesPlayed) * 100)}%`
      : '0%'
  );
  const streak = stats?.currentStreak ?? profileData?.currentStreak ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-[#0B1F3A] pb-32">
      <Navbar />
      <main className="container max-w-lg px-4 py-6 space-y-6">

        <ProfileHero profile={{ ...profileData, winRate }} isOwnProfile={isOwnProfile} />

        {/* Quick action */}
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/smashed?player=${profileData?.name}`)}
            className="flex-1 h-14 bg-[#0B1F3A] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest gap-2 shadow-xl border-none"
          >
            <History className="h-4 w-4" /> Match History
          </Button>
          {!isOwnProfile && (
            <Button
              onClick={handleFollow}
              disabled={followLoading}
              variant={isFollowing ? 'default' : 'outline'}
              className={cn(
                'h-14 w-14 p-0 rounded-2xl transition-all',
                isFollowing
                  ? 'bg-sky-500 text-white border-sky-500 hover:bg-sky-600'
                  : 'bg-white border-slate-200 text-sky-500 hover:bg-sky-50'
              )}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <UserCheck className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>

        {/* Quick stats bar */}
        <div className="app-card flex divide-x divide-slate-50">
          <div className="flex-1 p-3 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase">Matches</p>
            <p className="text-sm font-black">{stats?.matchesPlayed ?? profileData?.matchesPlayed ?? 0}</p>
          </div>
          <div className="flex-1 p-3 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase">Streak</p>
            <p className={cn('text-sm font-black flex items-center justify-center gap-1', streak > 0 ? 'text-orange-500' : 'text-slate-400')}>
              <Flame className="h-3 w-3" />
              {streak >= 0 ? `${streak}W` : `${Math.abs(streak)}L`}
            </p>
          </div>
          <div className="flex-1 p-3 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase">Win Rate</p>
            <p className="text-sm font-black text-sky-600">{winRate}</p>
          </div>
          <div className="flex-1 p-3 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase">Followers</p>
            <p className="text-sm font-black text-sky-500">{followersCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-[#0B1F3A] text-white shadow-lg'
                  : 'bg-white text-slate-400 border border-slate-100'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="min-h-[400px]"
          >
            {activeTab === 'performance' && <PerformanceStats stats={stats || profileData} />}
            {activeTab === 'history' && (
              <TournamentSection matchHistory={matchHistory} tournaments={tournaments} />
            )}
            {activeTab === 'analytics' && <AnalyticsSection />}
            {activeTab === 'badges' && <AchievementSection />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PlayerProfile;
