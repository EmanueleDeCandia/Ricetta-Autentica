import React, { useEffect, useState } from "react";
import { useAppSelector } from "../store";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Heart, 
  Eye, 
  Activity, 
  Award, 
  Compass, 
  Instagram, 
  Flame,
  Radio,
  MapPin,
  BookOpen,
  Map,
  QrCode,
  Trophy,
  UtensilsCrossed,
  User,
  LogOut
} from "lucide-react";
import { db, collection, onSnapshot, query } from "../lib/firebase";

interface DesktopLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  handleLogout?: () => void;
}

export default function DesktopLayout({ children, activeTab, setActiveTab, handleLogout }: DesktopLayoutProps) {
  const { points, name, stamps, avatar, badge, authenticated } = useAppSelector(state => state.user);
  
  // Dynamic stats calculated from real-time Firebase subscriptions
  const [impressionCount, setImpressionCount] = useState(7340);
  const [likeCount, setLikeCount] = useState(854);
  const [totalPostsCount, setTotalPostsCount] = useState(2);
  const [liveLog, setLiveLog] = useState<string[]>([
    "Benvenuto a Macerata! Sistema tracciamento Martech inizializzato 🧭",
    "[EVENT] La Sfida dei Ristoratori è iniziata per il weekend! 🍝",
  ]);

  // Read earned media posts from Firebase to calculate dynamic stats in real-time
  useEffect(() => {
    const q = query(collection(db, "earned_media_posts"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let reach = 0;
      let likes = 0;
      let posts = 0;
      const logs: string[] = [
        "Benvenuto a Macerata! Sistema tracciamento Martech inizializzato 🧭",
        "[EVENT] La Sfida dei Ristoratori è iniziata per il weekend! 🍝"
      ];

      snapshot.forEach(doc => {
        const d = doc.data();
        reach += d.views || 0;
        likes += d.likes || 0;
        posts += 1;

        // Custom live activity logs
        logs.unshift(`[${d.platform ? d.platform.toUpperCase() : "MEDIA"}] ${d.userName} ha pubblicato da "${d.restaurantName}" (+100pt) 📸`);
      });

      if (posts > 0) {
        setImpressionCount(reach + 7340); // Base seeded buffer + real-time additions
        setLikeCount(likes + 854);
        setTotalPostsCount(posts);
        setLiveLog(logs.slice(0, 8)); // Limit to latest 8 entries
      }
    }, (err) => {
      console.warn("Real-time telemetry subscription skipped. Using mocks.");
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-orange-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Decorative ambient background glowing lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-500/5 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-slate-800/20 blur-[150px] pointer-events-none z-0"></div>

      {/* Main desktop-adaptive wrapper */}
      <div className="max-w-[1600px] mx-auto min-h-screen flex flex-col justify-between relative z-10 p-4 md:p-6 lg:p-8 font-sans">
        
        {/* Header Branding */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20 ring-1 ring-white/10">
              🍝
            </div>
            <div>
              <h1 className="text-[19px] font-bold leading-none tracking-tight text-white flex items-center gap-1.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                La Ricetta Autentica
                <span className="text-[9.5px] px-2 py-0.5 rounded bg-orange-500 text-slate-950 font-mono font-extrabold uppercase tracking-widest leading-none">
                  Martech Hack
                </span>
              </h1>
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">
                Turismo Enogastronomico & Earned Media • Macerata 2026
              </p>
            </div>
          </div>

          {/* Desktop/Tablet Horizontal Navigation Selector */}
          {authenticated && activeTab && setActiveTab && (
            <div className="hidden md:flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab("ricetta")}
                className={`px-3 focus:outline-none py-1.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === "ricetta"
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ricette</span>
              </button>
              <button
                onClick={() => setActiveTab("mappa")}
                className={`px-3 focus:outline-none py-1.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === "mappa"
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Mappa</span>
              </button>
              <button
                onClick={() => setActiveTab("scanner")}
                className={`px-3 focus:outline-none py-1.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === "scanner"
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab("classifica")}
                className={`px-3 focus:outline-none py-1.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === "classifica"
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Classifica</span>
              </button>
              <button
                onClick={() => setActiveTab("ristorante")}
                className={`px-3 focus:outline-none py-1.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === "ristorante"
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Ristorante</span>
              </button>
              <button
                onClick={() => setActiveTab("profilo")}
                className={`px-3 focus:outline-none py-1.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 transition-all active:scale-95 ${
                  activeTab === "profilo"
                    ? "bg-orange-500 text-slate-950 shadow-md shadow-orange-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profilo</span>
              </button>
            </div>
          )}

          {/* User parameters dashboard in Main Header */}
          {authenticated ? (
            <div className="flex items-center gap-3 self-end md:self-auto">
              {/* Points indicator */}
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider leading-none">
                  Punti
                </span>
                <span className="text-[17px] font-extrabold text-slate-100 block font-mono mt-0.5 leading-none">
                  {points}
                </span>
              </div>

              {/* Badge Level Indicator */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center text-[18px] shadow-sm relative group">
                <span>{avatar || "👨‍🍳"}</span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-[8px] font-extrabold text-orange-400">
                  {(badge || "Novizio").charAt(0)}
                </div>
              </div>

              {/* Quick logout button */}
              {handleLogout && (
                <button
                  onClick={handleLogout}
                  title="Esci"
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-orange-500 flex items-center justify-center border border-slate-800 active:scale-95 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4 text-[12px] text-slate-400">
              <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 font-mono text-[11px]">
                <Radio className="w-3.5 h-3.5 text-green-500 animate-pulse" /> Live Sync
              </span>
              <span className="px-3 py-1 pb-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-200 font-bold">Macerata, Italia 🇮🇹</span>
            </div>
          )}
        </header>

        {/* Content Layout - Core workspace is fully widescreen-width */}
        <main className="w-full relative z-10 py-4 flex-1">
          <div className="w-full bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl relative flex flex-col min-h-[550px]">
            {children}
          </div>
        </main>

        {/* Dynamic Telemetry & Analytics Dashboard - displayed below the main workspace */}
        <section className="mt-8 border-t border-slate-800/80 pt-8 relative z-10 select-none text-left">
          <div className="flex items-center gap-2 mb-6 ml-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              Dashboard di Monitoraggio Martech & Earned Media • Real-time Sync
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* KPI 1: Impressions Reach */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[170px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Campagna Earned Media Reach
                  </p>
                  <p className="text-[28px] font-extrabold font-mono text-white mt-1 leading-none">
                    {impressionCount.toLocaleString()}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Eye className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 border-t border-slate-850 pt-2.5">
                <span className="text-[10.5px] text-orange-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" /> +18.4% Impression Increment
                </span>
              </div>
            </div>

            {/* KPI 2: Likes Engagement */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[170px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Social Likes & Reactions
                  </p>
                  <p className="text-[28px] font-extrabold font-mono text-white mt-1 leading-none">
                    {likeCount.toLocaleString()}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Heart className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 border-t border-slate-850 pt-2.5">
                <span className="text-[10.5px] text-orange-400 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Altamente Virale nel Weekend
                </span>
              </div>
            </div>

            {/* KPI 3: Event Countdown */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[170px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    🏆 Weekend Culinary Challenge
                  </p>
                  <h4 className="text-[14px] font-bold text-white mt-1">
                    Gara della Ristorazione • Macerata
                  </h4>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                  <span className="font-extrabold text-[14px] text-orange-400 block font-mono">18</span>
                  <span className="text-[7.5px] text-slate-500 block font-bold leading-none mt-0.5 animate-pulse">ORE</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                  <span className="font-extrabold text-[14px] text-orange-400 block font-mono">42</span>
                  <span className="text-[7.5px] text-slate-500 block font-bold leading-none mt-0.5 animate-pulse">MIN</span>
                </div>
                <div className="bg-orange-600 p-1.5 rounded-xl border border-orange-500/30 relative">
                  <span className="absolute top-0.5 right-1 text-[7px] text-white animate-pulse">●</span>
                  <span className="font-extrabold text-[14px] text-slate-950 block font-mono leading-none animate-pulse">LIVE</span>
                  <span className="text-[7.5px] text-slate-900 block font-extrabold leading-none mt-0.5">VOTO</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Live activity logs */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl md:col-span-2 flex flex-col justify-between min-h-[220px]">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                  <Activity className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> Live Martech Activity Logs (Real-time Sync)
                </p>
                <div className="text-[10.5px] font-mono text-slate-400 space-y-1.5 max-h-[140px] overflow-y-auto pr-1.5 leading-snug">
                  {liveLog.map((log, lIdx) => (
                    <div key={lIdx} className="border-b border-slate-950/60 pb-1.5 text-slate-300">
                      {log.replace(/\+100pt/g, "🚀 +100pt")}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI 5: Hashtag progress bar */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[220px]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3.5">
                  Hashtag #LaRicettaAutentica
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>Instagram Posts Reach</span>
                      <span className="font-bold text-orange-400">62%</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full mt-1 overflow-hidden border border-slate-850">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: "62%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>TikTok Videos Views</span>
                      <span className="font-bold text-slate-400">38%</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full mt-1 overflow-hidden border border-slate-850">
                      <div className="h-full bg-slate-700 rounded-full" style={{ width: "38%" }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-2.5 border-t border-slate-850 text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                <Compass className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Ogni caricamento social genera earned media incrementale che promuove il turismo enogastronomico marchigiano.</span>
              </div>
            </div>

          </div>
        </section>

        {/* Footer info bars */}
        <footer className="pt-4 border-t border-slate-800 text-center flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>© 2026 Comunità Culinaria Marchigiana. Tutti i diritti riservati.</span>
          <div className="flex gap-4 font-bold text-slate-400">
            <a href="#link" className="hover:text-orange-500 transition">Linee Guida</a>
            <a href="#link" className="hover:text-orange-500 transition">Regolamento Chef</a>
            <a href="#link" className="hover:text-orange-500 transition">Integrazione Martech API</a>
          </div>
        </footer>

      </div>
    </div>
  );
}
