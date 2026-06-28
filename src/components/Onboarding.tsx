import React, { useState } from "react";
import { loginWithGoogle, loginAnonymously, db, doc, setDoc, getDoc } from "../lib/firebase";
import { useAppDispatch } from "../store";
import { setUser, setLoadingState } from "../store/userSlice";

export default function Onboarding() {
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("👨‍🍳");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const avatars = ["👨‍🍳", "👩‍🍳", "🧑‍🌾", "👩‍🌾", "🧑‍🍳", "👨‍🌾", "🍝", "🏔️", "🍇", "🧀"];

  const handleProfileSubmit = async (uid: string, email: string | null) => {
    try {
      const finalName = name.trim() || (email ? email.split("@")[0] : "Turista Autentico");
      const userDocRef = doc(db, "users", uid);
      const userSnapshot = await getDoc(userDocRef);

      let userDataObj;
      if (userSnapshot.exists()) {
        // Fetch existing data
        userDataObj = userSnapshot.data();
      } else {
        // Create new user profile in Firestore
        userDataObj = {
          uid,
          name: finalName,
          avatar: selectedAvatar,
          points: 0,
          stamps: [],
          bookedRestaurants: [],
          votedRestaurants: [],
          hasProposedRecipe: false,
          badge: "Novizio",
          is_winner: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userDataObj);
      }

      dispatch(setUser({
        uid,
        name: userDataObj.name,
        avatar: userDataObj.avatar,
        points: userDataObj.points,
        stamps: userDataObj.stamps,
        badge: userDataObj.badge,
        is_winner: userDataObj.is_winner,
        bookedRestaurants: userDataObj.bookedRestaurants || [],
        votedRestaurants: userDataObj.votedRestaurants || [],
        hasProposedRecipe: userDataObj.hasProposedRecipe || false,
        authenticated: true,
        loading: false
      }));
    } catch (err: any) {
      console.warn("Firestore initialization warning, falling back to local session:", err);
      const finalName = name.trim() || "Turista Autentico";
      const guestProfile = {
        uid: "local_guest_" + uid,
        name: finalName,
        avatar: selectedAvatar,
        points: 0,
        stamps: [],
        badge: "Novizio" as const,
        is_winner: false,
        bookedRestaurants: [] as string[],
        votedRestaurants: [] as string[],
        authenticated: true,
        loading: false
      };
      localStorage.setItem("local_guest_profile", JSON.stringify(guestProfile));
      dispatch(setUser(guestProfile));
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const firebaseUser = await loginWithGoogle();
      if (firebaseUser) {
        await handleProfileSubmit(firebaseUser.uid, firebaseUser.email);
      }
    } catch (err: any) {
      console.warn("Google login failed/iframe popup blocked, attempting quick fallback setup:", err);
      // Fallback message to notify of quick guest session
      setErrorMsg("Impossibile connettersi con Google (popup disabilitato nell'Iframe). Attivazione sessione locale!");
      
      setTimeout(async () => {
        try {
          const fbUser = await loginAnonymously();
          if (fbUser) {
            await handleProfileSubmit(fbUser.uid, null);
          }
        } catch (anonErr: any) {
          console.warn("Anonymous auth restricted, triggering Local Guest session:", anonErr);
          const localUid = "local_guest_" + Math.random().toString(36).substring(2, 11);
          const guestProfile = {
            uid: localUid,
            name: name.trim() || "Turista Autentico",
            avatar: selectedAvatar,
            points: 0,
            stamps: [],
            badge: "Novizio" as const,
            is_winner: false,
            bookedRestaurants: [] as string[],
            votedRestaurants: [] as string[],
            authenticated: true,
            loading: false
          };
          localStorage.setItem("local_guest_profile", JSON.stringify(guestProfile));
          dispatch(setUser(guestProfile));
        }
      }, 1200);
    }
  };

  const handleQuickSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const fbUser = await loginAnonymously();
      if (fbUser) {
        await handleProfileSubmit(fbUser.uid, null);
      }
    } catch (err: any) {
      console.warn("Anonymous auth disabled/restricted, activating Local Guest fallback:", err);
      const localUid = "local_guest_" + Math.random().toString(36).substring(2, 11);
      const guestProfile = {
        uid: localUid,
        name: name.trim() || "Turista Autentico",
        avatar: selectedAvatar,
        points: 0,
        stamps: [],
        badge: "Novizio" as const,
        is_winner: false,
        bookedRestaurants: [] as string[],
        votedRestaurants: [] as string[],
        authenticated: true,
        loading: false
      };
      localStorage.setItem("local_guest_profile", JSON.stringify(guestProfile));
      dispatch(setUser(guestProfile));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 md:p-8 select-none">
      <div className="flex-1 flex flex-col items-center justify-center max-w-[340px] mx-auto text-center py-10">
        {/* Animated Icon */}
        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl flex items-center justify-center text-[52px] mb-8 rotate-[-6deg] animate-bounce">
          🍝
        </div>

        <h1 className="text-[34px] leading-none text-white font-black tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          La Ricetta
          <span className="block text-orange-500 mt-2 font-black">Autentica</span>
        </h1>
        
        <p className="mt-4 text-slate-400 text-[14px] leading-relaxed font-semibold">
          Un\'avventura enogastronomica hacker a Macerata. Raccogli gli ingredienti dalle botteghe storiche, cucina ed entra nella sfida ufficiale degli Chef!
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[12px] leading-tight w-full font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleQuickSignIn} className="w-full mt-8 space-y-4">
          <div className="text-left">
            <label className="text-[11px] font-bold tracking-wider text-orange-400 uppercase block mb-2 ml-1 font-mono">
              Nome Esploratore
            </label>
            <input
              id="onb-name"
              type="text"
              className="w-full px-5 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-orange-500 text-[15px] transition-all"
              placeholder="Inserisci il tuo nome..."
              maxLength={18}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="text-left font-mono">
            <label className="text-[11px] font-bold tracking-wider text-orange-400 uppercase block mb-2.5 ml-1">
              Scegli Avatar
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-[100px] overflow-y-auto pr-1">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`aspect-square rounded-xl bg-slate-950 border text-[24px] flex items-center justify-center transition active:scale-90 ${
                    selectedAvatar === av
                      ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
                      : "border-slate-800 text-white/70 hover:bg-slate-900"
                  }`}
                  disabled={loading}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-[15px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
              ) : (
                "Entra Come Ospite"
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-slate-900 text-white hover:bg-slate-850 font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 border border-slate-800"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.12 2.76-2.38 3.61v3h3.84c2.25-2.07 3.68-5.11 3.68-8.44z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.84-3c-1.07.72-2.45 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.24v3.09C3.22 21.2 7.37 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.19 14.23c-.25-.72-.39-1.5-.39-2.23s.14-1.5.39-2.23V6.68H1.24C.45 8.24 0 10.03 0 12s.45 3.76 1.24 5.32l3.95-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.37 0 3.22 2.8 1.24 6.68l3.95 3.09c.96-2.88 3.64-5.02 6.81-5.02z"
                />
              </svg>
              Accedi con Google
            </button>
          </div>
        </form>
      </div>

      <p className="text-[11px] text-slate-550 text-center py-2 font-semibold">
        Progetto Sviluppo Territoriale • Macerata Martech Hacking 2026
      </p>
    </div>
  );
}
