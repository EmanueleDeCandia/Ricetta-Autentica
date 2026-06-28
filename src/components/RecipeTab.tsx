import React, { useState } from "react";
import { useAppSelector, useAppDispatch } from "../store";
import { selectRecipe, selectVariantAction, setCart, setAiLoading, updateRecipeVariants } from "../store/recipeSlice";
import { db, doc, setDoc } from "../lib/firebase";
import { updatePoints } from "../store/userSlice";

interface RecipeTabProps {
  onFocusShop: (shopId: string) => void;
  showToastMsg: (msg: string, type: "success" | "error" | "info") => void;
}

export default function RecipeTab({ onFocusShop, showToastMsg }: RecipeTabProps) {
  const dispatch = useAppDispatch();
  const { recipes, selectedRecipeId, selectedVariant, aiPersonalizationLoading, shoppingCart } = useAppSelector(state => state.recipe);
  const { stamps, uid, points } = useAppSelector(state => state.user);

  const [customIdea, setCustomIdea] = useState("");
  const [showIdeaInput, setShowIdeaInput] = useState(false);

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId) || null;

  const handleSelectRecipe = (id: string) => {
    dispatch(selectRecipe(id));
    setCustomIdea("");
    setShowIdeaInput(false);
  };

  const handleGoBack = () => {
    dispatch(selectRecipe(null));
  };

  const currentStampsCount = selectedRecipe
    ? stamps.filter(s => selectedRecipe.ingredients.some(ing => ing.shopId === s)).length
    : 0;

  const handleCreateList = async () => {
    if (!selectedRecipe) return;
    dispatch(setCart(selectedRecipe.ingredients));
    
    if (uid) {
      try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          shoppingCart: selectedRecipe.ingredients
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to sync shopping cart to Firestore:", err);
      }
    } else {
      // For local guest
      const localGuestStr = localStorage.getItem("local_guest_profile");
      if (localGuestStr) {
        try {
          const localGuest = JSON.parse(localGuestStr);
          localGuest.shoppingCart = selectedRecipe.ingredients;
          localStorage.setItem("local_guest_profile", JSON.stringify(localGuest));
        } catch (e) {}
      }
    }
    
    showToastMsg("Lista spesa aggiunta! Dirigiti in centro sulla Mappa! 🗺️", "success");
  };

  const handleAIPersonalize = async () => {
    if (!selectedRecipe || aiPersonalizationLoading) return;
    dispatch(setAiLoading(true));
    showToastMsg("L'IA sta elaborando una ricetta guidata esclusiva per Macerata... 🧠", "info");

    try {
      const response = await fetch("/api/personalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeName: selectedRecipe.name,
          ingredients: selectedRecipe.ingredients.map(i => i.name),
          customIdea: customIdea.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("API response error");
      }

      const data = await response.json();
      if (data.variants && Array.isArray(data.variants)) {
        // Update recipe slices to keep these custom generations 
        dispatch(updateRecipeVariants({ recipeId: selectedRecipe.id, variants: data.variants }));
        // Auto-select the first one generated
        dispatch(selectVariantAction(data.variants[0]));
        
        // Grant tourist loyalty points for doing AI hacking!
        if (uid) {
          const userRef = doc(db, "users", uid);
          await setDoc(userRef, {
            points: points + 20
          }, { merge: true });
          dispatch(updatePoints(20));
          showToastMsg("Hacking gastronomico! Variante creata e sbloccati +20 Punti! ✨", "success");
        } else {
          dispatch(updatePoints(20));
          showToastMsg("Variante creata con successo!", "success");
        }
      }
    } catch (err) {
      console.warn("Personalization failure (seamless offline variants loaded instead):", err);
      showToastMsg("Errore di connessione all'IA. Carico varianti tradizionali offline.", "error");
      
      // Fallback to offline defaults
      dispatch(selectVariantAction(selectedRecipe.variants[0]));
    } finally {
      dispatch(setAiLoading(false));
    }
  };

  const handleSelectVariant = (variant: any) => {
    dispatch(selectVariantAction(variant));
    showToastMsg(`Variante selezionata: ${variant.name} 🍽️`, "info");
  };

  if (!selectedRecipe) {
    return (
      <div className="px-5 pt-5 pb-6 animate-fade-in text-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[28px] font-bold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Cucina Macerata
            </h2>
            <p className="text-[13px] text-orange-400 mt-1 font-semibold">
              Scegli una ricetta e compi il percorso degli ingredienti autentici
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[26px]">
            🏰
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(r => {
            const completedCount = stamps.filter(s => r.ingredients.some(ing => ing.shopId === s)).length;
            const percentage = Math.round((completedCount / r.ingredients.length) * 100);

            return (
              <button
                key={r.id}
                onClick={() => handleSelectRecipe(r.id)}
                className="w-full text-left bg-slate-900 rounded-2xl p-4 shadow-md border border-slate-800 hover:border-orange-500/30 active:scale-[0.99] transition-all flex gap-4"
              >
                <div
                  className="w-[76px] h-[76px] rounded-xl flex items-center justify-center text-[38px] shrink-0 bg-slate-950 border border-slate-800"
                >
                  {r.image}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h3 className="font-bold text-[17px] text-white truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {r.name}
                    </h3>
                    <p className="text-[12px] text-slate-400 leading-snug line-clamp-1 mt-0.5">
                      {r.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-orange-400 font-mono font-bold border border-slate-800">
                        ⏱ {r.time} min
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-amber-500 font-mono font-bold border border-slate-800">
                        {r.difficulty}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        Progresso: {percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Martech Info Banner */}
        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 shadow-lg relative overflow-hidden border border-orange-400/20">
          <div className="absolute right-2 bottom-0 text-[100px] opacity-10 select-none pointer-events-none font-bold">
            🍽️
          </div>
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-950 opacity-15">
            // HACKING ENOGASTRONOMICO
          </p>
          <p className="font-extrabold mt-1 text-[14.5px] leading-snug">
            Sblocca la Sfida dei Ristoratori completando la ricetta d'origine! Le tue varianti IA saranno cucinate dagli agriturismi partner della community.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 animate-fade-in text-slate-100">
      {/* Recipe Header */}
      <div className="relative h-[180px] bg-slate-950 border-b border-slate-900 overflow-hidden">
        {/* Subtle orange ambient glow in background of cover */}
        <div className="absolute top-0 right-1/4 w-[160px] h-[160px] rounded-full bg-orange-500/10 blur-[40px] pointer-events-none"></div>
        <button
          onClick={handleGoBack}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-slate-900/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-90 transition-all border border-slate-800"
        >
          <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-[84px] drop-shadow-2xl transform translate-y-3 animate-bounce-slow">
            {selectedRecipe.image}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10">
        <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-5">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-[25px] font-extrabold leading-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {selectedRecipe.name}
              </h2>
              <p className="text-[12px] text-orange-400 font-semibold mt-1">
                {selectedRecipe.city} • {selectedRecipe.story}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider font-mono">
                Ingredienti
              </span>
              <span className="text-[22px] font-extrabold text-orange-500 block leading-none mt-1 font-mono">
                {currentStampsCount}/{selectedRecipe.ingredients.length}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[13px] text-slate-350 my-4 leading-relaxed font-medium">
            {selectedRecipe.description}
          </p>

          {/* Checklist */}
          <div>
            <h3 className="font-extrabold text-[14px] text-white tracking-tight mb-3">
              Ingredienti e Botteghe Centenarie
            </h3>
            
            <div className="space-y-2.5">
              {selectedRecipe.ingredients.map(ing => {
                const done = stamps.includes(ing.shopId);
                return (
                  <div
                    key={ing.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      done
                        ? "bg-emerald-500/10 border-emerald-500/20 shadow-sm text-slate-100"
                        : "bg-slate-950/60 border-slate-800 hover:bg-slate-950 text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center text-[12px] font-bold ${
                        done
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-900 border border-slate-800 text-slate-500"
                      }`}
                    >
                      {done ? "✓" : "•"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13.5px] font-bold leading-none ${done ? "text-emerald-300 font-extrabold" : "text-white"}`}>
                        {ing.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                        Quantità: {ing.qty}
                      </p>
                    </div>
                    <button
                      onClick={() => onFocusShop(ing.shopId)}
                      className={`px-3 py-1.5 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[11px] font-extrabold active:scale-95 transition-all shrink-0 border ${
                        done ? "border-orange-500/10" : "border-slate-800"
                      }`}
                    >
                      Mappa 📍
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Customization Machine */}
          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-[14px] text-white tracking-tight">
                Personalizzazione Chef AI 🧪
              </h3>
              <button
                type="button"
                onClick={() => setShowIdeaInput(!showIdeaInput)}
                className="text-[11.5px] text-orange-400 font-bold hover:underline"
              >
                {showIdeaInput ? "Nascondi preferenza" : "Aggiungi ingrediente extra +"}
              </button>
            </div>

            {showIdeaInput && (
              <div className="mb-3.5 animate-fade-in">
                <input
                  type="text"
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[13px] text-slate-100 outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Es. 'Carne di vitello', 'Senza Glutine', 'Piccante d'Altino'..."
                  value={customIdea}
                  onChange={(e) => setCustomIdea(e.target.value)}
                />
                <span className="text-[10px] text-slate-500 mt-1.5 block leading-normal">
                  L'IA combinerà le tue idee culinarie con la tradizione culinaria di Macerata.
                </span>
              </div>
            )}

            <button
              disabled={true}
              className="w-full relative overflow-hidden rounded-xl py-3.5 bg-slate-800/80 text-slate-500 font-bold text-[14px] flex items-center justify-center gap-2 cursor-not-allowed border border-slate-850"
            >
              <span>🔒</span>
              <span>Personalizza Menù con AI (Disattivato)</span>
            </button>

            {/* Selected AI / Pre-set variant */}
            {selectedRecipe.variants && selectedRecipe.variants.length > 0 && (
              <div className="mt-5 space-y-2.5">
                <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                  Opzioni Menu da Adottare ({selectedRecipe.variants.length})
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedRecipe.variants.map(v => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-orange-500 bg-orange-500/5 text-white"
                            : "border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div>
                            <p className="font-extrabold text-[13.5px] text-white flex items-center gap-2">
                              {v.name}
                              {isSelected && <span className="text-[8.5px] bg-orange-500 text-slate-950 px-2 py-0.5 rounded font-black font-mono leading-none uppercase tracking-wider">ADOTTATO</span>}
                            </p>
                            <p className="text-[12px] text-slate-400 mt-1.5 leading-normal">
                              {v.changes}
                            </p>
                            <p className="text-[11px] text-orange-400 italic font-medium mt-1.5 flex items-center gap-1">
                              <span>💡</span> <span>Chef tip: {v.tip}</span>
                            </p>
                          </div>
                          <div
                            className={`w-4.5 h-4.5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                              isSelected ? "border-orange-500 bg-orange-500" : "border-slate-700 bg-slate-950"
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
            {shoppingCart && shoppingCart.length > 0 ? (
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl text-center">
                <p className="text-[13px] text-amber-500 font-bold flex items-center justify-center gap-1.5 mb-1">
                  <span>🛒</span>
                  <span>Lista della Spesa già inviata!</span>
                </p>
                <p className="text-[11.5px] text-slate-400 leading-normal">
                  Per garantire l'integrità del torneo, puoi avere solo una lista attiva alla volta. 
                  Se desideri selezionare un'altra ricetta, vai nella scheda <span className="font-bold text-orange-400">Profilo</span> e clicca su <b>"Cambia Lista della Spesa"</b>.
                </p>
              </div>
            ) : (
              <button
                onClick={handleCreateList}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl font-bold text-[14.5px] active:scale-[0.98] transition-all shadow-md shadow-orange-500/10 text-center"
              >
                Crea Lista della Spesa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
