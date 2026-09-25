import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, X, Trophy, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from './Logo';

interface Notification {
  id: string;
  message: string;
  time: Date;
  read: boolean;
  type: 'match_reminder' | 'match_started' | 'match_completed' | 'score' | 'tournament_next_match';
}

const Navbar = () => {
  const [isScrolled, setIsScrolled]     = useState(false);
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [userName, setUserName]         = useState("Athlete");
  const [userImage, setUserImage]       = useState("");
  const [showNotifs, setShowNotifs]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  const addNotification = (msg: string, type: Notification['type']) => {
    setNotifications(prev => [{
      id: String(Date.now()),
      message: msg,
      time: new Date(),
      read: false,
      type,
    }, ...prev].slice(0, 10)); // keep last 10
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Listen for in-app notification events from use-notifications
  useEffect(() => {
    const handler = (e: any) => {
      addNotification(e.detail.message, e.detail.type || 'match_started');
    };
    window.addEventListener('smashlive:notification', handler);
    return () => window.removeEventListener('smashlive:notification', handler);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const checkAuth = () => {
    const authStatus = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(authStatus);
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserName(parsed.name || "Athlete");
        setUserImage(parsed.avatar || parsed.image || "");
      } catch (e) { console.error("Profile error"); }
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', checkAuth);
    };
  }, [location.pathname]);

  const iconForType = (type: Notification['type']) => {
    if (type === 'match_reminder') return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    if (type === 'match_completed') return <Trophy className="h-3.5 w-3.5 text-yellow-500" />;
    if (type === 'tournament_next_match') return <Trophy className="h-3.5 w-3.5 text-sky-500" />;
    return <Zap className="h-3.5 w-3.5 text-sky-500" />;
  };

  const timeAgo = (d: Date) => {
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <nav className={cn(
      "sticky top-0 z-[100] w-full h-[56px] flex items-center transition-all px-4 border-b",
      isScrolled ? "bg-white/95 backdrop-blur-md border-slate-200 shadow-sm" : "bg-white border-transparent"
    )}>
      <div className="w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Logo className="h-8 w-8" />
          <span className="text-[18px] font-black tracking-tighter text-[#0B1F3A] uppercase">
            Smash<span className="text-sky-500">Live</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markAllRead(); }}
              className="relative p-2 text-[#0B1F3A]/60 hover:bg-slate-50 rounded-full transition-all"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Notification panel */}
            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                  <span className="text-[10px] font-black text-[#0B1F3A] uppercase tracking-widest">Notifications</span>
                  <button onClick={() => setShowNotifs(false)}>
                    <X className="h-4 w-4 text-slate-300" />
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase italic">No notifications yet</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0',
                        !n.read && 'bg-sky-50/50'
                      )}>
                        <div className="mt-0.5 shrink-0">{iconForType(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-[#0B1F3A] leading-tight">{n.message}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{timeAgo(n.time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoggedIn ? (
            <Link to="/player/me">
              <Avatar className="h-8 w-8 border-2 border-slate-100 shadow-sm">
                <AvatarImage src={userImage} />
                <AvatarFallback className="text-[10px] font-black bg-slate-100">
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link to="/login" className="text-[12px] font-black text-[#0B1F3A] uppercase tracking-wider bg-slate-50 px-4 py-2 rounded-lg">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
