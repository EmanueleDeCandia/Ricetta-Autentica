import React, { useEffect, useState, useRef } from "react";
import { useAppSelector, useAppDispatch } from "../store";
import { addStampToState } from "../store/userSlice";
import { db, doc, setDoc, arrayUnion, getDocs, query, collection, where } from "../lib/firebase";
import { SHOPS } from "./MappaTab";
import { Video, Camera, Sliders, Smartphone, CheckCircle, RefreshCw } from "lucide-react";

interface ScannerTabProps {
  showToastMsg: (msg: string, type: "success" | "error" | "info") => void;
  onNavigateTab: (tab: string) => void;
}

export default function ScannerTab({ showToastMsg, onNavigateTab }: ScannerTabProps) {
  const dispatch = useAppDispatch();
  const { stamps, uid, points, badge } = useAppSelector(state => state.user);
  const { shoppingCart } = useAppSelector(state => state.recipe);

  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Active camera initialization
  const startNativeCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      showToastMsg("Fotocamera del dispositivo attivata con successo! 📸", "success");
    } catch (err: any) {
      console.warn("Dispositivo non ha concesso i permessi della fotocamera:", err);
      showToastMsg("Permesso fotocamera negato o non supportato in sandboxed iframe. Usa l'inserimento rapido in basso!", "info");
    }
  };

  const stopNativeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // Proactively try to start camera
    startNativeCamera();

    return () => {
      // Cleanup stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleProcessCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    const matchedShop = SHOPS.find(s => s.qr_secret.toUpperCase() === code);

    if (!matchedShop) {
      showToastMsg("Codice QR non valido per l'evento Macerata! ❌", "error");
      return;
    }

    if (stamps.includes(matchedShop.id)) {
      showToastMsg(`Hai già timbrato e ritirato l'ingrediente presso: ${matchedShop.name}! 🛎️`, "info");
      return;
    }

    // Check if food ingredient matches active shopping cart
    const isNeeded = shoppingCart.some(item => item.shopId === matchedShop.id);

    // Update state in Redux
    dispatch(addStampToState(matchedShop.id));

    const updatedStamps = [...stamps, matchedShop.id];

    // Update in Firestore
    if (uid) {
      try {
        const userRef = doc(db, "users", uid);
        let isWinner = false;
        let pointsAwarded = 50; // default for purchase

        // Check if completion is met (4 stamps)
        if (updatedStamps.length >= 4) {
          // Query if anyone else is already marked as winner in Firestore
          let someoneElseWon = false;
          try {
            const winnerQuery = query(collection(db, "users"), where("is_winner", "==", true));
            const winnerSnap = await getDocs(winnerQuery);
            if (!winnerSnap.empty) {
              someoneElseWon = true;
            }
          } catch (qErr) {
            console.warn("Could not inspect cloud winner state:", qErr);
          }

          if (!someoneElseWon) {
            isWinner = true;
            pointsAwarded = 50 + 200; // 50 purchase + 200 absolute winner bonus point award
          } else {
            isWinner = false;
            pointsAwarded = 50 + 50; // Standard consolation bonus of 50 pts
            showToastMsg("Hai completato l'acquisto di tutti gli ingredienti tipici! Ottieni +50 bonus addizionale! 🏅", "info");
          }
        }

        const nextPoints = points + pointsAwarded;
        const nextBadge = updatedStamps.length >= 4 ? "Oro" : nextPoints >= 200 ? "Argento" : nextPoints >= 100 ? "Bronzo" : "Novizio";

        await setDoc(userRef, {
          stamps: arrayUnion(matchedShop.id),
          points: nextPoints,
          badge: nextBadge,
          is_winner: isWinner
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to commit stamp to Firestore (processed locally):", err);
      }
    }

    showToastMsg(
      `${isNeeded ? "🥬 INGREDIENTE VERIFICATO!" : "🎯 TIMBRO ACQUISITO!"} Ricevuto +50 pt da ${matchedShop.name}`,
      "success"
    );

    setManualCode("");

    // If stamps reached 4, celebrate!
    if (updatedStamps.length >= 4) {
      setTimeout(() => {
        showToastMsg("🎉 COMPETIZIONE COMPLETATA! Sei qualificato per la SFIDA DEI RISTORATORI del weekend!", "success");
        onNavigateTab("ristorante");
      }, 1000);
    }
  };

  const handleManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(manualCode);
  };

  return (
    <div className="px-5 pt-5 pb-8 animate-fade-in select-none text-slate-100">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-extrabold uppercase tracking-wide font-mono">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          Timbri raccolti: {stamps.length} / 5
        </div>
        <h2 className="text-[25px] font-bold mt-4 text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Fotocamera & Scanner QR
        </h2>
        <p className="text-[13px] text-slate-400 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
          Inquadra il codice posizionato sul bancone della bottega per convalidare l'ingrediente della ricetta autentica.
        </p>
      </div>

      {/* QR scanner camera box */}
      <div className="mt-5.5 relative w-full max-w-[290px] mx-auto">
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-slate-950 shadow-2xl relative border border-slate-800">
          
          {/* Native Live Video Stream */}
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover z-10"
          />

          {/* Fallback Viewfinder indicators */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div className="w-[180px] h-[180px] border-4 border-dashed border-orange-500/90 rounded-2xl shadow-[0_0_0_2000px_rgba(15,23,42,0.65)] flex flex-col items-center justify-center">
              {!cameraActive && (
                <div className="text-center p-3 text-[10px] text-slate-400 max-w-[140px] leading-tight">
                  <Camera className="w-6 h-6 text-orange-400 mx-auto opacity-70 mb-2 animate-bounce" />
                  Consenti i permessi fotocamera dal browser
                </div>
              )}
            </div>
          </div>

          {/* Real-time status badge */}
          {cameraActive && (
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black font-mono text-[9.5px] uppercase z-30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span> LIVE CAMERA
            </div>
          )}
        </div>

        {/* Action Toggle */}
        <div className="flex justify-center gap-2 mt-3.5">
          <button
            onClick={startNativeCamera}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-[11px] font-extrabold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-orange-500/10"
          >
            <Video className="w-3.5 h-3.5" />
            Attiva / Ripristina Cameram
          </button>
          {cameraActive && (
            <button
              onClick={stopNativeCamera}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition active:scale-95"
            >
              Spegni
            </button>
          )}
        </div>
      </div>

      {/* Manual verification */}
      <div className="mt-6 bg-slate-900 rounded-3xl p-5 shadow-lg border border-slate-800">
        <form onSubmit={handleManualForm}>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Verifica con Codice Manuale o Emulazione
          </label>
          <div className="flex gap-2 mt-2.5">
            <input
              type="text"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 focus:outline-none focus:ring-1 focus:ring-orange-500 text-[14px] font-mono uppercase tracking-widest text-white font-bold"
              placeholder="ES. CORSO-001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl active:scale-95 transition-all text-[13.5px]"
            >
              Confronta
            </button>
          </div>
        </form>

        {/* Shortcuts for sandbox testing */}
        <div className="mt-5 border-t border-slate-850 pt-4">
          <p className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest mb-3.5 font-mono">
            Simula scansione tramite bottoni rapidi della Bottega:
          </p>
          <div className="flex flex-wrap gap-2">
            {SHOPS.map(s => {
              const alreadyHas = stamps.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => handleProcessCode(s.qr_secret)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[10.5px] transition-all active:scale-95 border ${
                    alreadyHas
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 line-through font-medium"
                      : "bg-slate-950 hover:bg-orange-500/5 border-orange-500/20 text-orange-400 font-bold"
                  }`}
                >
                  {s.qr_secret}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
