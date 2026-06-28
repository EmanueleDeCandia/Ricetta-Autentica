import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { store, useAppSelector, useAppDispatch } from "./store";
import { auth, db, doc, onSnapshot } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { setUser, setLoadingState, clearUserState } from "./store/userSlice";
import { setCart } from "./store/recipeSlice";

// Components
import DesktopLayout from "./components/DesktopLayout";
import Onboarding from "./components/Onboarding";
import RecipeTab from "./components/RecipeTab";
import MappaTab from "./components/MappaTab";
import ScannerTab from "./components/ScannerTab";
import ClassificaTab from "./components/ClassificaTab";
import RistoranteTab from "./components/RistoranteTab";
import ProfiloTab from "./components/ProfiloTab";

// Icons from lucide-react
import { 
  BookOpen, 
  Map, 
  QrCode, 
  Trophy, 
  UtensilsCrossed, 
  User,
  LogOut 
} from "lucide-react";

// Main App Inner to access hooks inside Provider scope
function AppInner() {
  const dispatch = useAppDispatch();
  const { authenticated, loading, name, avatar, points, badge, stamps } = useAppSelector(state => state.user);

  // App active viewport bottom tabs: 'ricetta' | 'mappa' | 'scanner' | 'classifica' | 'ristorante'
  const [activeTab, setActiveTab] = useState<string>("ricetta");
  const [focusedShopId, setFocusedShopId] = useState<string | null>(null);

  // Toast deck
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: "success" | "error" | "info" }>>([]);

  const showToastMsg = (msg: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString() + Math.random().toString().slice(-4);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const userState = useAppSelector(state => state.user);

  // Synchronize local guest user progress to localStorage
  useEffect(() => {
    if (userState.authenticated && userState.uid && userState.uid.startsWith("local_guest_")) {
      localStorage.setItem("local_guest_profile", JSON.stringify(userState));
    }
  }, [userState]);

  // Auth & Firestore State Connection on bootstrap
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Authenticated! Listen to user's profile in Firestore dynamically in real-time
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.shoppingCart && Array.isArray(data.shoppingCart)) {
              dispatch(setCart(data.shoppingCart));
            }
            dispatch(setUser({
              uid: firebaseUser.uid,
              name: data.name || "Guerriero Foodie",
              avatar: data.avatar || "👨‍🍳",
              points: typeof data.points === "number" ? data.points : 0,
              stamps: data.stamps || [],
              badge: data.badge || "Novizio",
              is_winner: !!data.is_winner,
              bookedRestaurants: data.bookedRestaurants || [],
              votedRestaurants: data.votedRestaurants || [],
              hasProposedRecipe: !!data.hasProposedRecipe,
              hasRedeemedPrize: !!data.hasRedeemedPrize,
              authenticated: true,
              loading: false
            }));
          } else {
            // User authed but profile Doc not written yet, let Onboarding handle it
            dispatch(setLoadingState(false));
          }
        }, (err) => {
          console.warn("Firestore snapshot error during boot", err);
          dispatch(setLoadingState(false));
        });

        return () => unsubscribeDoc();
      } else {
        // No firebase user authenticated. Check if there's a local guest user profile
        const localGuestStr = localStorage.getItem("local_guest_profile");
        if (localGuestStr) {
          try {
            const localGuest = JSON.parse(localGuestStr);
            dispatch(setUser({
              uid: localGuest.uid,
              name: localGuest.name,
              avatar: localGuest.avatar,
              points: localGuest.points,
              stamps: localGuest.stamps,
              badge: localGuest.badge,
              is_winner: !!localGuest.is_winner,
              bookedRestaurants: localGuest.bookedRestaurants || [],
              votedRestaurants: localGuest.votedRestaurants || [],
              hasProposedRecipe: !!localGuest.hasProposedRecipe,
              hasRedeemedPrize: !!localGuest.hasRedeemedPrize,
              authenticated: true,
              loading: false
            }));
          } catch (e) {
            dispatch(clearUserState());
            dispatch(setLoadingState(false));
          }
        } else {
          dispatch(clearUserState());
          dispatch(setLoadingState(false));
        }
      }
    });

    return () => unsubscribeAuth();
  }, [dispatch]);

  const handleFocusShopOnMap = (shopId: string) => {
    setFocusedShopId(shopId);
    setActiveTab("mappa");
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("local_guest_profile");
      await auth.signOut();
      dispatch(clearUserState());
      setActiveTab("ricetta");
      showToastMsg("Arrivederci da Macerata! Sessione chiusa con successo 👋", "info");
    } catch (e) {
      localStorage.removeItem("local_guest_profile");
      dispatch(clearUserState());
      setActiveTab("ricetta");
      showToastMsg("Sessione ospite chiusa 👋", "info");
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "ricetta":
        return <RecipeTab onFocusShop={handleFocusShopOnMap} showToastMsg={showToastMsg} />;
      case "mappa":
        return (
          <MappaTab 
            focusedShopId={focusedShopId} 
            onClearFocus={() => setFocusedShopId(null)}
            showToastMsg={showToastMsg}
          />
        );
      case "scanner":
        return <ScannerTab showToastMsg={showToastMsg} onNavigateTab={(tab) => setActiveTab(tab)} />;
      case "classifica":
        return <ClassificaTab />;
      case "ristorante":
        return <RistoranteTab showToastMsg={showToastMsg} onNavigateTab={(tab) => { setActiveTab(tab); setFocusedShopId(null); }} />;
      case "profilo":
        return <ProfiloTab showToastMsg={showToastMsg} />;
      default:
        return <RecipeTab onFocusShop={handleFocusShopOnMap} showToastMsg={showToastMsg} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-orange-500 p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mb-4"></div>
        <p className="font-semibold text-[18px]">Caricamento PWA...</p>
        <p className="text-[12px] text-slate-400 mt-1">Sintonizzazione in tempo reale con Firestore</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Onboarding />;
  }

  return (
    <DesktopLayout
      activeTab={activeTab}
      setActiveTab={(tab) => { setActiveTab(tab); setFocusedShopId(null); }}
      handleLogout={handleLogout}
    >
      <div className="flex flex-col min-h-[550px] w-full bg-slate-950 relative text-slate-100 select-none rounded-3xl overflow-hidden pb-[90px] md:pb-4">
        
        {/* Toast HUD Overlay */}
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[360px] pointer-events-none space-y-2">
          {toasts.map(t => {
            const colors = {
              success: "bg-slate-900 border-green-500/35 text-slate-100 shadow-xl",
              error: "bg-red-950 border-red-500/35 text-slate-100 shadow-xl",
              info: "bg-slate-900 border-orange-500/35 text-slate-100 shadow-xl"
            };
            const bg = colors[t.type || "success"];
            return (
              <div
                key={t.id}
                className={`p-3.5 rounded-2xl border text-[12.5px] font-bold flex items-center gap-2.5 shadow-2xl animate-slideup pointer-events-auto ${bg}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0 ${
                  t.type === "success" ? "bg-green-500 text-slate-950" : t.type === "error" ? "bg-red-500 text-white" : "bg-orange-500 text-slate-950"
                }`}>
                  {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
                </span>
                <span>{t.msg}</span>
              </div>
            );
          })}
        </div>

        {/* Dynamic PWA Body scroll area */}
        <div className="flex-1 overflow-y-auto">
          {renderActiveTabContent()}
        </div>

        {/* bottom responsive PWA Navigation Bar - hidden on desktop of responsive site */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800 px-2 py-3 flex items-center justify-around select-none md:hidden">
          <button
            onClick={() => { setActiveTab("ricetta"); setFocusedShopId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition ${
              activeTab === "ricetta" ? "text-orange-500" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-[20px] h-[20px]" />
            <span className="text-[9.5px] font-bold">Ricette</span>
          </button>

          <button
            onClick={() => { setActiveTab("mappa"); setFocusedShopId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition ${
              activeTab === "mappa" ? "text-orange-500" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Map className="w-[20px] h-[20px]" />
            <span className="text-[9.5px] font-bold">Mappa</span>
          </button>

          {/* Central custom scan button action */}
          <button
            onClick={() => { setActiveTab("scanner"); setFocusedShopId(null); }}
            className="relative top-[-18px]"
          >
            <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-4 ring-slate-950 active:scale-90 transition-all">
              <QrCode className="w-[26px] h-[26px]" />
            </div>
            <span className="text-[9.5px] font-semibold text-center block text-slate-400 mt-1">Scanner</span>
          </button>

          <button
            onClick={() => { setActiveTab("classifica"); setFocusedShopId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition ${
              activeTab === "classifica" ? "text-orange-500" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy className="w-[20px] h-[20px]" />
            <span className="text-[9.5px] font-bold">Classifica</span>
          </button>

          <button
            onClick={() => { setActiveTab("ristorante"); setFocusedShopId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition ${
              activeTab === "ristorante" ? "text-orange-500" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UtensilsCrossed className="w-[20px] h-[20px]" />
            <span className="text-[9.5px] font-bold">Ristorante</span>
          </button>

          <button
            onClick={() => { setActiveTab("profilo"); setFocusedShopId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition ${
              activeTab === "profilo" ? "text-orange-500" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-[20px] h-[20px]" />
            <span className="text-[9.5px] font-bold">Profilo</span>
          </button>
        </nav>

      </div>
    </DesktopLayout>
  );
}

// Wrapper to bootstrap Redux Context
export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
