import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../store";
import { setUser, updatePoints } from "../store/userSlice";
import { clearCart } from "../store/recipeSlice";
import { db, doc, setDoc, collection, query, where, getDocs, onSnapshot } from "../lib/firebase";
import { Award, Edit2, Check, User, Shield, Trophy, FileText, Calendar, Settings, ArrowRight } from "lucide-react";
import { SHOPS } from "./MappaTab";

interface ProfiloTabProps {
  showToastMsg: (msg: string, type: "success" | "error" | "info") => void;
}

const AVATARS = ["👨‍🍳", "🍕", "🍷", "🍝", "🏔️", "🧭", "🎒", "👑", "🥩", "🍗"];

export default function ProfiloTab({ showToastMsg }: ProfiloTabProps) {
  const dispatch = useAppDispatch();
  const { name, avatar, points, stamps, badge, uid, bookedRestaurants, is_winner } = useAppSelector(state => state.user);
  const { shoppingCart } = useAppSelector(state => state.recipe);

  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [loading, setLoading] = useState(false);

  const handleChangeShoppingList = async () => {
    dispatch(clearCart());
    if (uid) {
      try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          shoppingCart: []
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to clear shopping list from Firestore:", err);
      }
    } else {
      const localGuestStr = localStorage.getItem("local_guest_profile");
      if (localGuestStr) {
        try {
          const localGuest = JSON.parse(localGuestStr);
          localGuest.shoppingCart = [];
          localStorage.setItem("local_guest_profile", JSON.stringify(localGuest));
        } catch (e) {}
      }
    }
    showToastMsg("Lista della spesa resettata! Ora puoi selezionare una nuova ricetta. 🛒", "success");
  };

  // Dynamic audit logs state
  const [challengeCount, setChallengeCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    setEditedName(name);
    setSelectedAvatar(avatar);
  }, [name, avatar]);

  // Fetch count of submissions, media and feedbacks from Firestore for the audit log
  useEffect(() => {
    if (!uid) return;

    // 1. challenge_submissions
    const subQuery = query(collection(db, "challenge_submissions"), where("creatorId", "==", uid));
    const unsubChallenge = onSnapshot(subQuery, (snap) => {
      setChallengeCount(snap.size);
    }, () => {});

    // 2. earned_media_posts
    const mediaQuery = query(collection(db, "earned_media_posts"), where("userId", "==", uid));
    const unsubMedia = onSnapshot(mediaQuery, (snap) => {
      setMediaCount(snap.size);
    }, () => {});

    // 3. restaurant_feedbacks
    const fQuery = query(collection(db, "restaurant_feedbacks"), where("userId", "==", uid));
    const unsubFeedback = onSnapshot(fQuery, (snap) => {
      setFeedbackCount(snap.size);
    }, () => {});

    return () => {
      unsubChallenge();
      unsubMedia();
      unsubFeedback();
    };
  }, [uid]);

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      showToastMsg("Il tuo nome non può essere vuoto! ⚠️", "error");
      return;
    }

    setLoading(true);
    try {
      if (uid) {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          name: editedName.trim(),
          avatar: selectedAvatar,
          points: points,
          stamps: stamps,
          badge: badge,
          is_winner: is_winner,
          bookedRestaurants: bookedRestaurants || []
        }, { merge: true });

        dispatch(setUser({
          uid,
          name: editedName.trim(),
          avatar: selectedAvatar,
        }));

        showToastMsg("Profilo sincronizzato con successo in Firestore! 💾", "success");
      } else {
        dispatch(setUser({
          uid: "local_guest",
          name: editedName.trim(),
          avatar: selectedAvatar,
        }));
        showToastMsg("Profilo salvato localmente!", "success");
      }
      setEditMode(false);
    } catch (err) {
      console.error(err);
      showToastMsg("Errore durante il salvataggio del profilo.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Mathematical point audit breakdown
  const stampPoints = stamps.length * 50;
  const completionBonus = stamps.length >= 4 ? 150 : 0;
  const mediaPoints = mediaCount * 100;
  const challengeBonus = challengeCount * 30;
  const feedbackBonus = feedbackCount * 10;
  const totalAuditSum = stampPoints + completionBonus + mediaPoints + challengeBonus + feedbackBonus;

  return (
    <div className="px-5 pt-5 pb-8 animate-fade-in text-slate-100 select-none">
      
      {/* Visual Banner */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl overflow-hidden relative mb-6">
        <div className="absolute right-4 bottom-[-10px] text-[120px] opacity-5 select-none pointer-events-none">🧭</div>
        
        <div className="flex flex-col md:flex-row items-center gap-5 relative z-15">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center text-[42px] shadow-lg shadow-orange-500/10 ring-2 ring-white/10 relative">
              {avatar}
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 flex items-center justify-center shadow shadow-orange-500/20 hover:scale-105 active:scale-95 transition"
              >
                <Edit2 className="w-3.5 h-3.5 font-bold" />
              </button>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            {editMode ? (
              <div className="space-y-3 max-w-sm mx-auto md:mx-0">
                <input
                  type="text"
                  maxLength={25}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-extrabold focus:outline-none focus:ring-1 focus:ring-orange-500 text-[14px]"
                  placeholder="Nome Profilo"
                />
                
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 font-mono">
                    Scegli il tuo Avatar:
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[18px] transition-all ${
                          selectedAvatar === av ? "bg-orange-500 scale-110" : "bg-slate-950 hover:bg-slate-800"
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1.5 justify-center md:justify-start">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[12px] rounded-xl flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <Check className="w-4 h-4" />
                    {loading ? "Salvataggio..." : "Salva"}
                  </button>
                  <button
                    onClick={() => {
                      setEditedName(name);
                      setSelectedAvatar(avatar);
                      setEditMode(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[12px] rounded-xl active:scale-95 transition"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[9.5px] px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono font-extrabold uppercase tracking-widest leading-none">
                  Grado: {badge || "Novizio"} 🛡️
                </span>
                <h3 className="text-[23px] font-extrabold tracking-tight text-white mt-1.5 leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {name || "Guerriero Enogastronomico"}
                </h3>
                <p className="text-[12px] text-slate-400 mt-2 flex items-center gap-1 justify-center md:justify-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block mr-1"></span>
                  Turista Enogastronomico Attivo • Macerata
                </p>
              </div>
            )}
          </div>

          {/* Points display card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 min-w-[140px] text-center shrink-0">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">Punteggio Totale</span>
            <span className="text-[34px] font-black font-mono text-orange-400 block tracking-tight my-1">{points}</span>
            <span className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-850 rounded text-slate-400 font-semibold inline-block">Macerata Loyalty</span>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* POINTS LOG / ACCREDITO VERIFICATO */}
        <div className="col-span-1 lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-[11.5px] font-bold uppercase text-slate-400 tracking-wider mb-4 block font-mono">
              🧪 Audit Trasparenza Punti (Sincronizzato in real-time)
            </p>
            <div className="space-y-3.5 text-[12.5px]">
              
              <div className="flex items-center justify-between p-3 bg-slate-950/55 rounded-xl border border-slate-850/50">
                <span className="flex items-center gap-2">
                  <span className="text-orange-500">📍</span>
                  <span>Timbri spesa raccolti presso botteghe</span>
                </span>
                <b className="font-mono text-white">+{stampPoints} pt <span className="text-[10.5px] text-slate-500">({stamps.length} × 50)</span></b>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/55 rounded-xl border border-slate-850/50">
                <span className="flex items-center gap-2">
                  <span className="text-yellow-400">✨</span>
                  <span>Completamento spesa d'origine</span>
                </span>
                <b className="font-mono text-white">+{completionBonus} pt <span className="text-[10.5px] text-slate-500">({stamps.length >= 4 ? "Completato" : "0 / 4"})</span></b>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/55 rounded-xl border border-slate-850/50">
                <span className="flex items-center gap-2">
                  <span className="text-purple-400">📷</span>
                  <span>Earned Media pubblicati sui social</span>
                </span>
                <b className="font-mono text-white">+{mediaPoints} pt <span className="text-[10.5px] text-slate-500">({mediaCount} × 100)</span></b>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/55 rounded-xl border border-slate-850/50">
                <span className="flex items-center gap-2">
                  <span className="text-amber-550 text-amber-500">👨‍🍳</span>
                  <span>Challenge Chef - Ricette Sottoposte</span>
                </span>
                <b className="font-mono text-white">+{challengeBonus} pt <span className="text-[10.5px] text-slate-500">({challengeCount} × 30)</span></b>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/55 rounded-xl border border-slate-850/50">
                <span className="flex items-center gap-2">
                  <span className="text-emerald-400">👍</span>
                  <span>Recensioni dei Ristoranti (Sostegno)</span>
                </span>
                <b className="font-mono text-white">+{feedbackBonus} pt <span className="text-[10.5px] text-slate-500">({feedbackCount} × 10)</span></b>
              </div>

            </div>
          </div>

          <div className="mt-5 border-t border-slate-850 pt-4 text-center text-slate-400 text-[11px] leading-relaxed">
            <span className="text-orange-400 font-bold block mb-1">💡 Regola di Bilancio</span>
            I punti sono determinati unicamente ed esclusivamente dalle tue interazioni enogastronomiche registrate e persistite nel database cloud. Non c'è alcuna dicitura casuale o simulata.
          </div>
        </div>

        {/* CURRENT ACQUISITIONS & TICKETS */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-4">
          
          {/* Timbri box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <p className="text-[11.5px] font-bold uppercase text-slate-400 tracking-wider mb-2.5 block font-mono">
              🎒 Timbri Botteghe Acquisiti ({stamps.length} / 5)
            </p>
            <div className="grid grid-cols-5 gap-2 mt-3.5">
              {SHOPS.map((sh, idx) => {
                const acquired = stamps.includes(sh.id);
                return (
                  <div key={sh.id} className="text-center">
                    <div
                      className={`aspect-square w-full rounded-xl flex items-center justify-center text-[16px] border ${
                        acquired
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-black"
                          : "bg-slate-950 border-slate-855 text-slate-400"
                      }`}
                      title={sh.name}
                    >
                      {acquired ? "✓" : "📍"}
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono font-medium block truncate mt-1">
                      {sh.name.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Shopping List card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <p className="text-[11.5px] font-bold uppercase text-slate-400 tracking-wider font-mono">
                🛒 Lista della Spesa Attiva
              </p>
              {shoppingCart && shoppingCart.length > 0 && (
                <span className="text-[9px] px-2 py-0.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-lg font-bold font-mono tracking-wide uppercase">
                  Inviata
                </span>
              )}
            </div>

            {shoppingCart && shoppingCart.length > 0 ? (
              <div className="space-y-2 mt-2">
                {shoppingCart.map((ing: any) => {
                  const shop = SHOPS.find(s => s.id === ing.shopId);
                  const acquired = stamps.includes(ing.shopId);
                  return (
                    <div key={ing.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-[12.5px] truncate">
                          {ing.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Quantità: <span className="font-semibold text-orange-400 font-mono">{ing.qty}</span> • {shop?.name || "Bottega"}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md shrink-0 flex items-center gap-1 ${
                        acquired 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}>
                        {acquired ? "✓ Acquistato" : "📍 Da comprare"}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-3">
                  <button
                    onClick={handleChangeShoppingList}
                    className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-[12px] font-bold text-red-400 hover:text-red-300 transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>🔄</span>
                    <span>Cambia Lista della Spesa</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-5 text-center text-[12px] text-slate-500 font-medium leading-relaxed">
                Nessuna lista della spesa attiva.<br />Vai alla sezione <span className="text-orange-400 font-semibold">"Cucina Macerata"</span> per crearne una ed iniziare il viaggio! 🥘
              </div>
            )}
          </div>

          {/* Table reservation ticket */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex-1 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-[44px] opacity-10">🎫</div>
            <p className="text-[11.5px] font-bold uppercase text-slate-400 tracking-wider mb-2.5 block font-mono">
              🎟️ Prenotazioni Tavoli Premiali ({bookedRestaurants?.length || 0})
            </p>
            {bookedRestaurants && bookedRestaurants.length > 0 ? (
              <div className="space-y-2 mt-3 text-[12.5px]">
                {bookedRestaurants.map((restId: string) => (
                  <div key={restId} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-white truncate text-[13px]">
                        {restId === "rest1" ? "Osteria San Nicola" : restId === "rest2" ? "Le Sette Cuccagne" : restId === "rest3" ? "Osteria del Silenzio" : restId === "rest4" ? "Trattoria Da Ezio" : "Osteria da Vittorio"}
                      </p>
                      <p className="text-[11px] text-orange-400 mt-1 leading-none font-medium">
                        Tavolo Riservato per il Weekend!
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] bg-orange-500 text-slate-950 font-black rounded-lg shrink-0 uppercase tracking-wide">
                      Attivo
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-[12px] text-slate-500 font-medium">
                Nessun tavolo prenotato. Completa lo shopping di ingredienti ed esegui la sfida per sbloccare la ristorazione!
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
