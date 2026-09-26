import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 px-6">
        <p className="text-7xl font-black text-[#0B1F3A] italic">404</p>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Page not found</p>
        <a href="/" className="inline-block mt-4 px-6 py-3 bg-[#0B1F3A] text-white rounded-xl font-black text-[11px] uppercase tracking-widest">
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
