import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../store";
import { db, doc, collection, addDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp, increment, arrayUnion } from "../lib/firebase";
import { updatePoints, setWinnerState, addBookedRestaurant, addVotedRestaurant, addVotedSubmission, setRedeemedPrize } from "../store/userSlice";

interface RistoranteTabProps {
  showToastMsg: (msg: string, type: "success" | "error" | "info") => void;
  onNavigateTab: (tab: string) => void;
}

export default function RistoranteTab({ showToastMsg, onNavigateTab }: RistoranteTabProps) {
  const dispatch = useAppDispatch();
  const { stamps, uid, points, name, avatar, is_winner, bookedRestaurants, votedRestaurants, votedSubmissions, hasRedeemedPrize } = useAppSelector(state => state.user);
  
  const getUserId = () => {
    if (uid) return uid;
    let localId = localStorage.getItem("local_device_uid");
    if (!localId) {
      localId = "local_device_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("local_device_uid", localId);
    }
    return localId;
  };

  const { recipes, selectedRecipeId, selectedVariant } = useAppSelector(state => state.recipe);
  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId) || null;

  // Phase 2 subtabs: ristoranti (booking/adoption), challenge (chef challenge pool), feed (earned media), incoronazione (votes/dashboard)
  const [activeSubTab, setActiveSubTab] = useState<"ristoranti" | "challenge" | "feed" | "incoronazione">("ristoranti");
  const [showAllWeekendDishes, setShowAllWeekendDishes] = useState(false);

  // Local state retrieved from Firestore
  const [dbRestaurants, setDbRestaurants] = useState<any[]>([]);
  const [socialFeed, setSocialFeed] = useState<any[]>([]);
  const [bookedRestId, setBookedRestId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  
  // Review form state
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState<number>(1); // 1 = 👍 positive, -1 = 👎 negative
  const [reviewRestId, setReviewRestId] = useState("rest1");
  const [reviewLoading, setReviewLoading] = useState(false);
  
  // Chef Challenge state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submittingToChallenge, setSubmittingToChallenge] = useState(false);
  const [selectedSubForFeature, setSelectedSubForFeature] = useState<any | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureRestId, setFeatureRestId] = useState("rest1");
  const [congratsFeatured, setCongratsFeatured] = useState<any | null>(null);

  // Selfie simulator state
  const [selfieTaken, setSelfieTaken] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Original");
  const [customCaption, setCustomCaption] = useState("");
  const [postingLoading, setPostingLoading] = useState(false);
  const [simulatedChef, setSimulatedChef] = useState("👨‍🍳 Beppe");
  const [hasAdoptionSelected, setHasAdoptionSelected] = useState(false);
  const [selectedAdoptionRestId, setSelectedAdoptionRestId] = useState("rest1");
  const [customUserPhoto, setCustomUserPhoto] = useState<string | null>(null);
  const [simulatedOverlayStep, setSimulatedOverlayStep] = useState<number>(-1);

  const [bookingTicketCode, setBookingTicketCode] = useState<string | null>(null);

  const stampsCount = stamps.length;
  const isUnlocked = stampsCount >= 4 || is_winner;

  // Unsplash food/chef placeholder image URLs for the earned media simulator
  const chefPictures = [
    "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1622021142947-da7dedc7c398?w=600&auto=format&fit=crop&q=60"
  ];

  const filterStyles: Record<string, string> = {
    "Original": "brightness-100 contrast-100",
    "Retro Warm": "sepia contrast-110 saturate-120 hue-rotate-15",
    "Foodie Vignette": "contrast-125 saturate-135 brightness-105",
    "B&W Heritage": "grayscale contrast-130 brightness-95"
  };

  // Listen to Firestore restaurants
  useEffect(() => {
    const defaultRestaurants = [
      {
        id: "rest1",
        name: "Osteria San Nicola",
        address: "Via San Nicola, 13, Tolentino (MC)",
        lat: 43.2085,
        lng: 13.2847,
        specialty: "Vincisgrassi tradizionali, coniglio in porchetta, ciavuscolo di Tolentino",
        price: "€€",
        votes: 185,
        orders: 94,
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 901234",
        hours: "Aperto: 12:30-14:30, 19:30-22:30 (Chiuso Lun)",
        adoptedRecipes: []
      },
      {
        id: "rest2",
        name: "Le Sette Cuccagne",
        address: "Viale Foro Boario, 2, Caldarola (MC)",
        lat: 43.1385,
        lng: 13.2268,
        specialty: "Gnocchi fatti a mano con sugo di papera, grigliata dei Sibillini",
        price: "€€",
        votes: 152,
        orders: 78,
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 905477",
        hours: "Aperto: Ven-Dom: 12:00-15:00, 19:00-23:00",
        adoptedRecipes: []
      },
      {
        id: "rest3",
        name: "Osteria del Silenzio",
        address: "Via del Borgo, 15, Ripe San Ginesio (MC)",
        lat: 43.1432,
        lng: 13.3674,
        specialty: "Tagliolini all'uovo al tartufo estivo maceratese, ciavuscolo fuso",
        price: "€€€",
        votes: 128,
        orders: 64,
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 500122",
        hours: "Aperto: Lun-Sat: 19:00-23:30",
        adoptedRecipes: []
      },
      {
        id: "rest4",
        name: "Trattoria Da Ezio",
        address: "Via Giuseppe Mazzini, 4, Macerata (MC)",
        lat: 43.3002,
        lng: 13.4534,
        specialty: "Vincisgrassi storici STG, coniglio in porchetta marchigiano",
        price: "€€",
        votes: 164,
        orders: 85,
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=60",
        phone: "+39 0733 232233",
        hours: "Aperto: 12:30-14:30, 19:30-22:30 (Chiuso Lun)",
        adoptedRecipes: []
      },
      {
        id: "rest5",
        name: "Osteria da Vittorio",
        address: "Corso Garibaldi, 45, Tolentino (MC)",
        lat: 43.2108,
        lng: 13.2885,
        specialty: "Tagliata marchigiana al sale di Cervia, ravioli di ricotta e cinghiale",
        price: "€€",
        votes: 140,
        orders: 72,
        image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 974522",
        hours: "Aperto: 12:00-14:30, 19:30-22:30 (Chiuso Mar)",
        adoptedRecipes: []
      }
    ];

    const rQuery = query(collection(db, "restaurants"));
    const unsubscribeRestaurants = onSnapshot(rQuery, (snapshot) => {
      const fbRests: Record<string, any> = {};
      snapshot.forEach(doc => {
        const dId = doc.id;
        if (dId && dId !== "rest1()" && dId.trim() !== "" && doc.data()?.name) {
          fbRests[dId] = doc.data();
        }
      });

      // Merge defaults with Firestore so we ALWAYS have all 5, preserving dynamic fields from Firestore
      const mergedList = defaultRestaurants.map(def => {
        const fbData = fbRests[def.id];
        if (fbData) {
          return {
            ...def,
            votes: typeof fbData.votes === 'number' ? fbData.votes : def.votes,
            orders: typeof fbData.orders === 'number' ? fbData.orders : def.orders,
            adoptedRecipes: fbData.adoptedRecipes || def.adoptedRecipes || []
          };
        }
        return def;
      });

      setDbRestaurants(mergedList.sort((a, b) => b.votes - a.votes));

      // Proactively write missing ones back to Firestore if the user is authenticated to seed them cleanly
      if (uid) {
        defaultRestaurants.forEach(async (def) => {
          if (!fbRests[def.id]) {
            try {
              await setDoc(doc(db, "restaurants", def.id), def, { merge: true });
            } catch (e) {
              console.warn("Seeding rest", def.id, e);
            }
          }
        });
      }
    }, (err) => {
      console.warn("Firestore restaurants snap error, using fallback seed.");
      seedFallbackRestaurants();
    });

    return () => unsubscribeRestaurants();
  }, [uid]);

  // Listen to Firestore earned media posts
  useEffect(() => {
    const pQuery = query(collection(db, "earned_media_posts"), orderBy("timestamp", "desc"));
    const unsubscribePosts = onSnapshot(pQuery, (snapshot) => {
      const postsArr: any[] = [];
      snapshot.forEach(doc => {
        postsArr.push({ id: doc.id, ...doc.data() });
      });
      setSocialFeed(postsArr);
    }, (err) => {
      console.warn("Firestore social feed snaps error. Using local simulation.");
    });

    return () => unsubscribePosts();
  }, []);

  // Listen to Firestore challenge submissions
  useEffect(() => {
    const sQuery = query(collection(db, "challenge_submissions"), orderBy("votes", "desc"));
    const unsubscribeSubmissions = onSnapshot(sQuery, (snapshot) => {
      const subArr: any[] = [];
      snapshot.forEach(doc => {
        subArr.push({ id: doc.id, ...doc.data() });
      });
      if (subArr.length > 0) {
        setSubmissions(subArr);
      } else {
        seedFallbackSubmissions();
      }
    }, (err) => {
      console.warn("Firestore submissions snapshot error, using local fallback seed.");
      seedFallbackSubmissions();
    });

    return () => unsubscribeSubmissions();
  }, []);

  // Listen to Firestore feedbacks
  useEffect(() => {
    const fQuery = query(collection(db, "restaurant_feedbacks"), orderBy("timestamp", "desc"));
    const unsubscribeFeedbacks = onSnapshot(fQuery, (snapshot) => {
      const fbArr: any[] = [];
      snapshot.forEach(docSnap => {
        fbArr.push({ id: docSnap.id, ...docSnap.data() });
      });
      setFeedbacks(fbArr);
    }, (err) => {
      console.warn("Firestore feedbacks listener skipped during dev", err);
    });
    return () => unsubscribeFeedbacks();
  }, []);

  const seedFallbackSubmissions = async () => {
    const list = [
      {
        id: "sub1",
        recipeId: "r1",
        recipeName: "Vincisgrassi Maceratesi STG",
        variantId: "v1",
        variantName: "Vincisgrassi Nobiliare al Tartufo dei Sibillini",
        changes: "Sfoglie profumate col Tartufo Nero dei Sibillini interamente stese a mano",
        creatorId: "seeded1",
        creatorName: "Evelyn Smith",
        creatorAvatar: "👩‍✈️",
        votes: 12,
        featuredBy: ["rest1"],
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      },
      {
        id: "sub2",
        recipeId: "r2",
        recipeName: "Ciavuscolo IGP su Pane Caldo",
        variantId: "v2",
        variantName: "Ciavuscolo IGP Aromatizzato al Vino Cotto",
        changes: "Bruschetta con ciavuscolo nostrano caramellato con riduzione di Vino Cotto maceratese",
        creatorId: "seeded2",
        creatorName: "Hans Müller",
        creatorAvatar: "👨‍🚀",
        votes: 9,
        featuredBy: ["rest2"],
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: "sub3",
        recipeId: "r3",
        recipeName: "Frascarelli Maceratesi",
        variantId: "v3",
        variantName: "Frascarelli Dorati e Zafferano",
        changes: "Mantecatura allo zafferano biologico dei colli maceratesi con pancetta croccante",
        creatorId: "seeded3",
        creatorName: "Elena Rossi",
        creatorAvatar: "👩‍🍳",
        votes: 15,
        featuredBy: [],
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ];

    setSubmissions(list);

    // Save to Firestore if user is authenticated
    if (uid) {
      for (const s of list) {
        try {
          await setDoc(doc(db, "challenge_submissions", s.id), s, { merge: true });
        } catch (e) {}
      }
    }
  };

  useEffect(() => {
    if (selectedRecipe && selectedVariant) {
      setCustomCaption(`La mia Ricetta Autentica di "${selectedRecipe.name}" (nella speciale variante gourmet "${selectedVariant.name}") cucinata dallo Chef di ${getRestaurantName(selectedAdoptionRestId)}! Semplicemente divina. 🇮🇹🥘 #LaRicettaAutentica #Macerata #MarcheMartech`);
    } else {
      setCustomCaption(`Assaggiando un piatto leggendario nel cuore di Macerata! Tradizione marchigiana pura. 🥖🍷 #LaRicettaAutentica #MarcheFood`);
    }
  }, [selectedRecipe, selectedVariant, selectedAdoptionRestId, dbRestaurants]);

  const seedFallbackRestaurants = async () => {
    const list = [
      {
        id: "rest1",
        name: "Osteria San Nicola",
        address: "Via San Nicola, 13, Tolentino (MC)",
        lat: 43.2085,
        lng: 13.2847,
        specialty: "Vincisgrassi tradizionali, coniglio in porchetta, ciavuscolo di Tolentino",
        price: "€€",
        votes: 185,
        orders: 94,
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 901234",
        hours: "Aperto: 12:30-14:30, 19:30-22:30 (Chiuso Lun)",
        adoptedRecipes: []
      },
      {
        id: "rest2",
        name: "Le Sette Cuccagne",
        address: "Viale Foro Boario, 2, Caldarola (MC)",
        lat: 43.1385,
        lng: 13.2268,
        specialty: "Gnocchi fatti a mano con sugo di papera, grigliata dei Sibillini",
        price: "€€",
        votes: 152,
        orders: 78,
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 905477",
        hours: "Aperto: Ven-Dom: 12:00-15:00, 19:00-23:00",
        adoptedRecipes: []
      },
      {
        id: "rest3",
        name: "Osteria del Silenzio",
        address: "Via del Borgo, 15, Ripe San Ginesio (MC)",
        lat: 43.1432,
        lng: 13.3674,
        specialty: "Tagliolini all'uovo al tartufo estivo maceratese, ciavuscolo fuso",
        price: "€€€",
        votes: 128,
        orders: 64,
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 500122",
        hours: "Aperto: Lun-Sab: 19:00-23:30",
        adoptedRecipes: []
      },
      {
        id: "rest4",
        name: "Trattoria Da Ezio",
        address: "Via Giuseppe Mazzini, 4, Macerata (MC)",
        lat: 43.3002,
        lng: 13.4534,
        specialty: "Vincisgrassi storici STG, coniglio in porchetta marchigiano",
        price: "€€",
        votes: 164,
        orders: 85,
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=60",
        phone: "+39 0733 232233",
        hours: "Aperto: 12:30-14:30, 19:30-22:30 (Chiuso Lun)",
        adoptedRecipes: []
      },
      {
        id: "rest5",
        name: "Osteria da Vittorio",
        address: "Corso Garibaldi, 45, Tolentino (MC)",
        lat: 43.2108,
        lng: 13.2885,
        specialty: "Tagliata marchigiana al sale di Cervia, ravioli di ricotta e cinghiale",
        price: "€€",
        votes: 140,
        orders: 72,
        image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&auto=format&fit=crop&q=60",
        phone: "+39 0733 974522",
        hours: "Aperto: 12:00-14:30, 19:30-22:30 (Chiuso Mar)",
        adoptedRecipes: []
      }
    ];
    setDbRestaurants(list.sort((a,b)=>b.votes-a.votes));

    // Seed Firestore so they become real persistent records!
    if (uid) {
      for (const r of list) {
        try {
          await setDoc(doc(db, "restaurants", r.id), r, { merge: true });
        } catch (e) {}
      }
    }
  };

  const getRestaurantName = (id: string) => {
    return dbRestaurants.find(r => r.id === id)?.name || "Agriturismo Territoriale";
  };

  // Adopt user recipe variant to selected restaurant
  const handleAdoptRecipe = async () => {
    if (!selectedRecipe || !selectedVariant) {
      showToastMsg("Genera prima una variante AI nella scheda Ricetta! ⚠️", "error");
      return;
    }

    // Single candidature/featured constraint: Each tourist can propose/feature only one recipe in total
    const alreadyCandidatedAny = dbRestaurants.some((r: any) => 
      (r.adoptedRecipes || []).some((a: any) => a.touristId === getUserId() || a.featurerId === getUserId())
    );

    if (alreadyCandidatedAny) {
      showToastMsg("Hai già proposto o inserito un piatto d'autore nel menù di un ristorante! Puoi farlo solo una volta. 🏆", "error");
      return;
    }

    try {
      showToastMsg("Inoltro proposta di menu allo Chef dello stabilimento... 🕊️", "info");
      const restRef = doc(db, "restaurants", selectedAdoptionRestId);
      
      const newAdoption = {
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        touristId: getUserId(),
        touristName: name || "Ospite",
        touristAvatar: avatar || "👨‍🍳",
        featurerId: getUserId()
      };

      const matchedRest = dbRestaurants.find(r => r.id === selectedAdoptionRestId);
      const currentAdoptions = matchedRest?.adoptedRecipes || [];

      // Avoid duplication
      if (currentAdoptions.some((a: any) => a.touristId === getUserId() && a.recipeId === selectedRecipe.id)) {
        showToastMsg("Questo ristorante ha già adottato la tua variante! 🛎️", "info");
        setHasAdoptionSelected(true);
        return;
      }

      await setDoc(restRef, {
        name: matchedRest?.name || selectedAdoptionRestId,
        address: matchedRest?.address || "",
        specialty: matchedRest?.specialty || "",
        price: matchedRest?.price || "€€",
        votes: matchedRest?.votes || 0,
        orders: matchedRest?.orders || 0,
        adoptedRecipes: [...currentAdoptions, newAdoption]
      }, { merge: true });

      setHasAdoptionSelected(true);
      showToastMsg(`COMPLIMENTI! Lo Chef di "${matchedRest?.name}" ha accettato ed inserito il piatto nel menù del weekend! 🎉`, "success");

      // Give reward points
      if (uid) {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          points: points + 50
        }, { merge: true });
        dispatch(updatePoints(50));
      }
    } catch (err) {
      console.warn("Propose adoption database warning (loaded local fallback simulation):", err);
      setHasAdoptionSelected(true);
      showToastMsg("Proposta accettata con successo (simulazione locale)!", "success");
    }
  };

  // Submit selected recipe variant to the Chef Challenge Pool
  const handleSubmitToChallenge = async () => {
    if (!selectedRecipe || !selectedVariant) {
      showToastMsg("Seleziona prima una ricetta e genera una variante AI nella scheda 'Ricette'! ⚠️", "error");
      return;
    }

    setSubmittingToChallenge(true);
    try {
      const docId = `challenge_sub_${getUserId()}_${selectedVariant.id}`;
      
      const alreadySubmitted = submissions.some(
        s => s.creatorId === getUserId() && s.variantId === selectedVariant.id
      );

      if (alreadySubmitted) {
        showToastMsg("Hai già candidato questa variante alla Sfida dello Chef! 🛎️", "info");
        setActiveSubTab("challenge");
        setSubmittingToChallenge(false);
        return;
      }

      showToastMsg("Candidatura della ricetta in corso... 🕊️", "info");

      const newSubmission = {
        id: docId,
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        changes: selectedVariant.changes || "Variante gastronomica personalizzata",
        creatorId: getUserId(),
        creatorName: name || "Turista Gourmand",
        creatorAvatar: avatar || "🧙‍♂️",
        votes: 1, // Self approval
        featuredBy: [],
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, "challenge_submissions", docId), newSubmission);
      
      showToastMsg("RICETTA CANDIDATA! Ora aspetta che i ristoratori la integrino nel menù! 🎉", "success");

      // Give reward points
      if (uid) {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          points: points + 30
        }, { merge: true });
        dispatch(updatePoints(30));
      }

      setActiveSubTab("challenge");
    } catch (err) {
      console.warn("Error submitting recipe to challenge:", err);
      showToastMsg("Candidatura completata (Simulazione Locale)!", "success");
      // Local fallback simulation append
      const localSub = {
        id: `challenge_sub_local_${Date.now()}`,
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        changes: selectedVariant.changes || "Variante gastronomica personalizzata",
        creatorId: getUserId(),
        creatorName: name || "Turista Gourmand",
        creatorAvatar: avatar || "🧙‍♂️",
        votes: 1,
        featuredBy: [],
        timestamp: new Date().toISOString()
      };
      setSubmissions(prev => [localSub, ...prev]);
      setActiveSubTab("challenge");
    } finally {
      setSubmittingToChallenge(false);
    }
  };

  // Vote for a community candidate recipe
  const handleVoteSubmission = async (subId: string) => {
    const userVotedSubs = votedSubmissions || [];
    if (userVotedSubs.length > 0) {
      showToastMsg("Hai già espresso il tuo unico voto di gradimento! È consentito un solo voto in totale. ❤️", "error");
      return;
    }

    try {
      const subRef = doc(db, "challenge_submissions", subId);
      await setDoc(subRef, {
        votes: increment(1)
      }, { merge: true });

      showToastMsg("Voto per la creazione culinaria registrato! Grazie per aver partecipato. 🗳️", "success");

      // Save to user doc in Firestore to prevent multiple votes
      if (uid) {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          votedSubmissions: arrayUnion(subId),
          points: points + 5
        }, { merge: true });
      }

      dispatch(addVotedSubmission(subId));
      dispatch(updatePoints(5));
    } catch (err) {
      console.warn("Database vote warning, using local update:", err);
      setSubmissions(prev =>
        prev.map(s => s.id === subId ? { ...s, votes: (s.votes || 0) + 1 } : s)
      );
      dispatch(addVotedSubmission(subId));
      showToastMsg("Voto espresso con successo! 🗳️", "success");
    }
  };

  // Partner Establishment selects and features a recipe for the weekend
  const handleFeatureSubmissionWeekend = async (restaurantId: string, sub: any) => {
    const matchedRest = dbRestaurants.find(r => r.id === restaurantId);
    if (!matchedRest) return;

    // Strict single feature/proposed constraint across all restaurants
    const userHasFeaturedOrProposed = dbRestaurants.some((r: any) => 
      (r.adoptedRecipes || []).some((a: any) => a.touristId === getUserId() || a.featurerId === getUserId())
    );

    if (userHasFeaturedOrProposed) {
      showToastMsg("Hai già inserito o proposto una ricetta nel menù di un ristorante! Puoi farlo solo una volta. 👨‍🍳", "error");
      setShowFeatureModal(false);
      setSelectedSubForFeature(null);
      return;
    }

    try {
      showToastMsg(`In corso l'attivazione nel menù del weekend di ${matchedRest.name}... 👨‍🍳`, "info");
      
      // 1. Put adoption on restaurant in Firestore
      const restRef = doc(db, "restaurants", restaurantId);
      const currentAdoptions = matchedRest.adoptedRecipes || [];
      
      const newAdoption = {
        recipeId: sub.recipeId,
        recipeName: sub.recipeName,
        variantId: sub.variantId,
        variantName: sub.variantName,
        touristId: sub.creatorId,
        touristName: sub.creatorName,
        touristAvatar: sub.creatorAvatar,
        featurerId: getUserId()
      };

      const alreadyAdopted = currentAdoptions.some(
        (a: any) => a.touristId === sub.creatorId && a.variantId === sub.variantId
      );

      if (!alreadyAdopted) {
        await setDoc(restRef, {
          adoptedRecipes: [...currentAdoptions, newAdoption]
        }, { merge: true });
      }

      // 2. Add restaurantId to featuredBy in challenge_submissions
      const subRef = doc(db, "challenge_submissions", sub.id);
      const currentFeaturedBy = sub.featuredBy || [];
      if (!currentFeaturedBy.includes(restaurantId)) {
        await setDoc(subRef, {
          featuredBy: [...currentFeaturedBy, restaurantId]
        }, { merge: true });
      }

      // 3. Check if current user is the creator of this submission
      const isCurrentUserCreator = sub.creatorId === getUserId();
      if (isCurrentUserCreator) {
        // Massive reward & celebration!
        if (uid) {
          const userRef = doc(db, "users", uid);
          await setDoc(userRef, {
            points: points + 150
          }, { merge: true });
          dispatch(updatePoints(150));
        }

        // Trigger congratulatory overlay
        setCongratsFeatured({
          restaurantName: matchedRest.name,
          recipeName: sub.recipeName,
          variantName: sub.variantName,
        });
      } else {
        showToastMsg(`Straordinario! Lo stabilimento ${matchedRest.name} ha selezionato ed inserito nel menù del weekend la variante di ${sub.creatorName}! 👨‍🍳🎉`, "success");
      }

      setShowFeatureModal(false);
      setSelectedSubForFeature(null);
    } catch (e) {
      console.warn("Featured assignment database warning, using local fallback simulation:", e);
      // Local fallback updates
      setSubmissions(prev =>
        prev.map(s => {
          if (s.id === sub.id) {
            const currentF = s.featuredBy || [];
            return { ...s, featuredBy: currentF.includes(restaurantId) ? currentF : [...currentF, restaurantId] };
          }
          return s;
        })
      );

      setDbRestaurants(prev =>
        prev.map(r => {
          if (r.id === restaurantId) {
            const currentAd = r.adoptedRecipes || [];
            const newAd = {
              recipeId: sub.recipeId,
              recipeName: sub.recipeName,
              variantId: sub.variantId,
              variantName: sub.variantName,
              touristId: sub.creatorId,
              touristName: sub.creatorName,
              touristAvatar: sub.creatorAvatar,
              featurerId: getUserId()
            };
            return { ...r, adoptedRecipes: [...currentAd, newAd] };
          }
          return r;
        })
      );

      if (sub.creatorId === getUserId()) {
        dispatch(updatePoints(150));
        setCongratsFeatured({
          restaurantName: matchedRest.name,
          recipeName: sub.recipeName,
          variantName: sub.variantName,
        });
      } else {
        showToastMsg(`Ricetta inserita nel menù del weekend di ${matchedRest.name}!`, "success");
      }

      setShowFeatureModal(false);
      setSelectedSubForFeature(null);
    }
  };

  // Generate a table reservation
  const handleBookTable = async (restaurantId: string) => {
    if (stamps.length < 4) {
      showToastMsg("Devi prima raccogliere almeno 4 ingredienti (acquistandoli con i timbri nei negozi) per riscattare il premio! 🥕", "error");
      return;
    }

    if (hasRedeemedPrize || (bookedRestaurants && bookedRestaurants.includes(restaurantId))) {
      showToastMsg("Hai già riscattato il premio! Puoi riservare soltanto un tavolo omaggio.", "error");
      return;
    }

    const matched = dbRestaurants.find(r => r.id === restaurantId);
    setBookedRestId(restaurantId);
    const code = `LRA-${uid || "guest"}-${restaurantId.toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setBookingTicketCode(code);
    showToastMsg(`Prenotazione tavolo confermata presso ${matched?.name}! Codice: ${code} 🍽️`, "success");
    
    // Update local Redux state
    dispatch(addBookedRestaurant(restaurantId));
    dispatch(setRedeemedPrize(true));

    // Update in Firestore
    if (uid) {
      try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          bookedRestaurants: arrayUnion(restaurantId),
          hasRedeemedPrize: true
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to commit booking state to Firestore:", err);
      }
    } else {
      // Offline guest session fallback logic
      const localGuestStr = localStorage.getItem("local_guest_profile");
      if (localGuestStr) {
        try {
          const localGuest = JSON.parse(localGuestStr);
          localGuest.bookedRestaurants = [...(localGuest.bookedRestaurants || []), restaurantId];
          localGuest.hasRedeemedPrize = true;
          localStorage.setItem("local_guest_profile", JSON.stringify(localGuest));
        } catch (e) {}
      }
    }

    registerOrderOnFirestore(restaurantId);
  };

  const registerOrderOnFirestore = async (restaurantId: string) => {
    try {
      const restRef = doc(db, "restaurants", restaurantId);
      const matched = dbRestaurants.find(r => r.id === restaurantId);
      await setDoc(restRef, {
        name: matched?.name || restaurantId,
        address: matched?.address || "",
        specialty: matched?.specialty || "",
        price: matched?.price || "€€",
        votes: matched?.votes || 0,
        orders: increment(1),
        adoptedRecipes: matched?.adoptedRecipes || []
      }, { merge: true });
    } catch (err) {}
  };

  // Handle simulation selfie action
  const handleTakeSelfie = () => {
    setSelfieTaken(true);
    const chefNames = ["👨‍🍳 Chef Beppe", "👩‍🍳 Chef Elodia", "👨‍🍳 Mastro Vittorio", "👨‍🍳 Chef Marina"];
    setSimulatedChef(chefNames[Math.floor(Math.random() * chefNames.length)]);
    showToastMsg("Selfie scattato con lo Chef! Scegli un filtro martech ed esporta! 📸", "success");
  };

  // Post the simulated Earned Media post to Firestore and socials
  const handlePostEarnedMedia = async () => {
    if (postingLoading) return;
    setPostingLoading(true);
    setSimulatedOverlayStep(0);

    // Simulated Martech steps to educate and delight the user during testing
    const stepsTimeout = [
      { text: "Connessione sicura col Router Martech del distretto di Macerata...", ms: 1000 },
      { text: "Simulazione handshake con Facebook & Instagram Graph API...", ms: 1100 },
      { text: "Verifica autenticità contrassegno geotag & tracciamento Earned Media...", ms: 1100 },
      { text: "Pubblicazione in corso sui profili della Sandbox Macerata...", ms: 900 }
    ];

    for (let i = 0; i < stepsTimeout.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepsTimeout[i].ms));
      setSimulatedOverlayStep(i + 1);
    }

    try {
      const finalImage = customUserPhoto || chefPictures[Math.floor(Math.random() * chefPictures.length)];
      
      const newPostObj = {
        userId: uid || "guest_influencer",
        userName: name || "Turista Foodie",
        userAvatar: avatar || "👩‍🌾",
        restaurantId: selectedAdoptionRestId,
        restaurantName: getRestaurantName(selectedAdoptionRestId),
        recipeId: selectedRecipe ? selectedRecipe.id : "r1",
        recipeName: selectedRecipe ? selectedRecipe.name : "Pasta Chitarra",
        variantName: selectedVariant ? selectedVariant.name : "Edizione Speciale",
        imageUrl: finalImage,
        caption: customCaption,
        platform: Math.random() > 0.5 ? "instagram" : "tiktok",
        likes: Math.floor(Math.random() * 40) + 120, // Give high engagement for a satisfying taste of viral marketing!
        views: Math.floor(Math.random() * 300) + 1240,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, "earned_media_posts"), newPostObj);

      if (uid) {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          points: points + 100
        }, { merge: true });
        dispatch(updatePoints(100));
      } else {
        dispatch(updatePoints(100));
      }

      showToastMsg(`VIRALE! Post pubblicato su Social Feed! Guadagnati +100 PUNTI Martech! 📣`, "success");
      setSelfieTaken(false);
      setCustomUserPhoto(null);
      setActiveSubTab("feed");
    } catch (err) {
      console.warn("Social feed post database warning (processed locally):", err);
      showToastMsg("Post pubblicato con successo (modalità offline)!", "success");
      setActiveSubTab("feed");
    } finally {
      setPostingLoading(false);
      setSimulatedOverlayStep(-1); // complete simulation
    }
  };

  // Vote for a restaurant
  const handleVote = async (restaurantId: string) => {
    const listVoted = votedRestaurants || [];
    if (listVoted.length > 0) {
      showToastMsg("Hai già espresso il tuo unico voto per i ristoranti! È consentito un solo voto in totale. 🗳️", "error");
      return;
    }

    try {
      const rRef = doc(db, "restaurants", restaurantId);
      const matched = dbRestaurants.find(r => r.id === restaurantId);
      
      // Update restaurant votes
      await setDoc(rRef, {
        name: matched?.name || restaurantId,
        address: matched?.address || "",
        specialty: matched?.specialty || "",
        price: matched?.price || "€€",
        votes: increment(1),
        orders: matched?.orders || 0,
        adoptedRecipes: matched?.adoptedRecipes || []
      }, { merge: true });

      // Save to user doc in Firestore to prevent fraud
      if (uid) {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, {
          votedRestaurants: arrayUnion(restaurantId),
          points: points + 10
        }, { merge: true });
      }

      // Update local Redux state
      dispatch(addVotedRestaurant(restaurantId));
      dispatch(updatePoints(10));

      showToastMsg(`Voto aggiunto per "${matched?.name || restaurantId}"! Ti abbiamo assegnato +10 PUNTI! 🗳️`, "success");
    } catch (err) {
      console.warn("Database vote warning (processed locally):", err);
      dispatch(addVotedRestaurant(restaurantId));
      dispatch(updatePoints(10));
      showToastMsg(`Voto aggiunto con successo! 🗳️`, "success");
    }
  };

  // Submit ex-post feedback/review
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      showToastMsg("Inserisci un commento alla tua recensione! 📝", "error");
      return;
    }

    setReviewLoading(true);
    try {
      const rest = dbRestaurants.find(r => r.id === reviewRestId);
      const restName = rest?.name || "Ristorante Marchigiano";
      
      const hasBooked = bookedRestaurants && bookedRestaurants.includes(reviewRestId);
      const hasAdoption = rest?.adoptedRecipes && rest.adoptedRecipes.some((a: any) => a.touristId === getUserId());
      const isVerifiedGuest = !!(hasBooked || hasAdoption);

      const feedbackData = {
        restaurantId: reviewRestId,
        restaurantName: restName,
        userId: uid || "local_guest",
        userName: name || "Turista Foodie",
        userAvatar: avatar || "👨‍🍳",
        rating: reviewRating, // 1 = Positive, -1 = Negative
        comment: reviewComment.trim(),
        isVerifiedGuest,
        timestamp: new Date().toISOString()
      };

      const feedbacksCol = collection(db, "restaurant_feedbacks");
      await addDoc(feedbacksCol, feedbackData);

      dispatch(updatePoints(10));
      if (uid) {
        try {
          const userRef = doc(db, "users", uid);
          await setDoc(userRef, {
            points: points + 10
          }, { merge: true });
        } catch (dbErr) {}
      }

      showToastMsg("Grazie! Recensione ex-post inviata. Guadagnati +10 Punti! 🗳️", "success");
      setReviewComment("");
    } catch (err) {
      console.error(err);
      showToastMsg("Errore durante l'invio del feedback.", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  if (!isUnlocked) {
    const p = stampsCount;
    return (
      <div className="px-5 pt-12 text-center pb-6 animate-fade-in select-none text-slate-100">
        <div className="w-24 h-24 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[48px] filter saturate-50 opacity-40">
          🔒
        </div>
        <h2 className="text-[25px] font-bold mt-5 text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Ristorante degli Chef
        </h2>
        <p className="text-[13.5px] text-slate-400 mt-2.5 max-w-[290px] mx-auto leading-relaxed">
          Completa prima il percorso della tua ricetta d'origine (scansiona almeno <b>4 ingredienti</b>) per sbloccare la ristorazione VIP d'eccellenza, dove potrai veder cucinata la tua ricetta dallo Chef!
        </p>

        <div className="mt-8 max-w-[300px] mx-auto text-left">
          <div className="flex justify-between text-[11.5px] mb-2 font-bold font-mono">
            <span className="text-orange-400 uppercase tracking-wider">Tassonomia Ingredienti</span>
            <span className="font-extrabold text-[#fff]">{p} / 4</span>
          </div>
          <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700 shadow-inner"
              style={{ width: `${Math.min((p / 4) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-2.5 font-mono">
            Tessera fedeltà attiva • Macerata PWA
          </p>

          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab("ricetta") : {}}
            className="mt-6 w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-[14px] shadow-lg shadow-orange-500/10 active:scale-[0.98] transition-all text-center block"
          >
            Sfoglia ed Acquista Ingredienti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] animate-fade-in select-none text-slate-100">
      {/* Sub tabs header */}
      <div className="pt-4 px-4 pb-2 bg-slate-950 sticky top-[64px] z-20 flex gap-2 scrollbar-hide overflow-x-auto border-b border-slate-900">
        <button
          onClick={() => setActiveSubTab("ristoranti")}
          className={`px-4 py-2 rounded-xl text-[12px] font-extrabold transition-all shrink-0 border ${
            activeSubTab === "ristoranti"
              ? "bg-orange-500 border-transparent text-slate-950 shadow-md shadow-orange-500/10"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🍳 Chef & Abbinamento
        </button>
        <button
          onClick={() => setActiveSubTab("challenge")}
          className={`px-4 py-2 rounded-xl text-[12px] font-extrabold transition-all shrink-0 border ${
            activeSubTab === "challenge"
              ? "bg-orange-500 border-transparent text-slate-950 shadow-md shadow-orange-500/10"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          👨‍🍳 Sfida dello Chef
        </button>
        <button
          onClick={() => setActiveSubTab("feed")}
          className={`px-4 py-2 rounded-xl text-[12px] font-extrabold transition-all shrink-0 border ${
            activeSubTab === "feed"
              ? "bg-orange-500 border-transparent text-slate-950 shadow-md shadow-orange-500/10"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📷 Earned Media Hub
        </button>
        <button
          onClick={() => setActiveSubTab("incoronazione")}
          className={`px-4 py-2 rounded-xl text-[12px] font-extrabold transition-all shrink-0 border ${
            activeSubTab === "incoronazione"
              ? "bg-orange-500 border-transparent text-slate-950 shadow-md shadow-orange-500/10"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🏆 Incoronazione Weekend
        </button>
      </div>

      {/* Main reactive panels */}
      <div className="flex-1 px-4.5 pb-6">
        
        {/* TAB: CHEF CHALLENGE */}
        {activeSubTab === "challenge" && (
          <div className="space-y-6 animate-fade-in mt-3.5">
            {/* Header / Intro Banner */}
            <div className="bg-gradient-to-br from-orange-500/20 to-amber-600/10 rounded-3xl p-5 border border-orange-500/20 shadow-lg relative overflow-hidden">
              <div className="absolute right-4 top-4 text-[50px] opacity-20 select-none">🥗</div>
              <h3 className="text-[19px] font-black text-white leading-tight">
                Chef Challenge Macerata 👨‍🍳
              </h3>
              <p className="text-[12.5px] text-slate-350 leading-relaxed mt-2">
                I turisti candidano le proprie varianti originali. Gli **agriturismi** e i **ristoranti partner** le selezionano per inserirle nel loro <b>Menù Reale del Weekend</b>! Vota le migliori idee o candidane una creata con l'IA.
              </p>
            </div>

            {/* Candidate Your own Active Variant Section */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                La Tua Candidatura Estemporanea
              </p>
              {selectedRecipe && selectedVariant ? (
                <div className="mt-3">
                  <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    <span className="text-[28px] shrink-0">{selectedRecipe.image}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-extrabold text-white truncate">
                        {selectedVariant.name}
                      </p>
                      <p className="text-[11.5px] text-slate-400 mt-1 line-clamp-1 italic">
                        "{selectedVariant.changes}"
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSubmitToChallenge}
                    disabled={submittingToChallenge}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-extrabold text-[13px] rounded-xl active:scale-[0.98] transition shadow-md shadow-orange-500/10 flex items-center justify-center gap-2"
                  >
                    {submittingToChallenge ? (
                      <span>Candidatura in corso...</span>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Candida questa variante al Chef Challenge (+30 pt)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-3 p-4 bg-slate-950/60 rounded-2xl border border-slate-850/60 text-center">
                  <p className="text-[12px] text-slate-455 leading-normal">
                    Nessuna variante selezionata. Vai sul tab <b>Ricette</b>, personalizza un piatto tipico con Chef AI e candidalo qui!
                  </p>
                </div>
              )}
            </div>

            {/* Showcase: Active Weekend Featured Menu Specials */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider ml-1 font-mono">
                📅 Menù Speciali del Weekend in Corso
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dbRestaurants.slice(0, showAllWeekendDishes ? 10 : 5).map((rest: any) => {
                  const adoptions = rest.adoptedRecipes || [];
                  return (
                    <div key={rest.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute right-3 top-3 text-[26px] opacity-15">🏪</div>
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-extrabold font-mono text-[9px] uppercase tracking-wider">Partner Verificato</span>
                        <h4 className="font-black text-[15.5px] text-white mt-1.5 leading-snug">
                          {rest.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-1">📍 {rest.address}</p>
                        
                        <div className="mt-4 space-y-2">
                          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide font-mono">Piatti del Weekend:</p>
                          {adoptions.length === 0 ? (
                            <p className="text-[11.5px] text-slate-400 italic pb-1">Nessun piatto d'autore programmato per questo weekend.</p>
                          ) : (
                            <div className="space-y-2">
                              {adoptions.map((ad: any, idx: number) => (
                                <div key={idx} className="bg-slate-950/60 border border-slate-850/40 rounded-xl p-3 text-[12px] flex items-center justify-between gap-1.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-white truncate flex items-center gap-1.5">
                                      <span>🍽️</span> <span>{ad.variantName}</span>
                                    </p>
                                    <p className="text-[11px] text-orange-400 mt-1 flex items-center gap-1.5 font-medium">
                                      <span>Ideato da:</span>
                                      <span className="text-[11.5px] font-bold text-white flex items-center gap-1">
                                        <span>{ad.touristAvatar}</span> <span>{ad.touristName}</span>
                                      </span>
                                    </p>
                                  </div>
                                  <span className="text-[9.5px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-wider font-mono">ATTIVO</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-850 flex gap-2">
                        <button
                          onClick={() => {
                            setActiveSubTab("ristoranti");
                            onNavigateTab && onNavigateTab("mappa");
                            showToastMsg(`Trova ${rest.name} sulla mappa per completare la sfida! 🗺️`, "info");
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 font-extrabold text-[12px] text-slate-300 active:scale-95 transition text-center block"
                        >
                          Trova sulla Mappa 📍
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dbRestaurants.length > 5 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowAllWeekendDishes(!showAllWeekendDishes)}
                    className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[11.5px] font-bold text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <span>{showAllWeekendDishes ? "▲ Mostra Meno (Max 5)" : "▼ Mostra Altri Piatti (Max 10)"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* List: Candidate Pool and voting */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider ml-1 font-mono">
                  🗳️ Candidature dei Turisti in Gara ({submissions.length})
                </p>
                <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider font-mono bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Selezionate dai Ristoratori</span>
              </div>

              <div className="space-y-3">
                {submissions.map((sub: any) => {
                  const isUserSub = sub.creatorId === getUserId();
                  return (
                    <div
                      key={sub.id}
                      className={`bg-slate-900 border rounded-3xl p-4.5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                        isUserSub ? "border-orange-500/30 bg-orange-500/[0.02]" : "border-slate-800 hover:border-slate-750"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 shrink-0 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[22px] shadow-sm">
                          {sub.creatorAvatar || "👨‍🍳"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-black text-white leading-tight">
                              {sub.variantName}
                            </span>
                            {isUserSub && (
                              <span className="text-[8px] bg-orange-500 text-slate-950 px-2 py-0.5 rounded font-black uppercase tracking-wider font-mono leading-none">TUA RICETTA</span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-orange-400 mt-1 font-semibold">
                            Ricetta base: {sub.recipeName}
                          </p>
                          <p className="text-[12px] text-slate-350 leading-relaxed mt-2 font-medium">
                            {sub.changes}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1">
                            <span>Inviato da:</span> <b className="text-white font-extrabold">{sub.creatorName}</b>
                          </p>
                          
                          {/* List establishments featuring this submission */}
                          {sub.featuredBy && sub.featuredBy.length > 0 && (
                            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Presente in Menù da:</span>
                              {sub.featuredBy.map((restId: string) => (
                                <span key={restId} className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-extrabold border border-emerald-500/20">
                                  🏪 {getRestaurantName(restId)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 border-t border-slate-850/60 md:border-t-0 pt-3 md:pt-0">
                        {/* Vote Button */}
                        <button
                          onClick={() => handleVoteSubmission(sub.id)}
                          className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-905 border border-slate-800 text-[12px] font-extrabold text-slate-200 active:scale-95 transition flex items-center justify-center gap-2 min-w-[76px]"
                        >
                          <span className="text-rose-450">❤️</span>
                          <span>{sub.votes || 0}</span>
                        </button>

                        {/* Feature Selection trigger - simulates the restaurant selection */}
                        <button
                          onClick={() => {
                            setSelectedSubForFeature(sub);
                            setShowFeatureModal(true);
                          }}
                          className="flex-1 md:flex-none px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-[12px] rounded-xl active:scale-95 transition shrink-0 flex items-center justify-center gap-1"
                        >
                          <span>👨‍🍳</span>
                          <span>Includi in Menù</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: RISTORANTI & BOOKING */}
        {activeSubTab === "ristoranti" && (
          <div className="space-y-4 animate-fade-in mt-3.5">
            {selectedRecipe && selectedVariant ? (
              <div className="bg-slate-900 rounded-3xl p-4.5 border border-slate-800 shadow-lg relative">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400 font-mono">
                  Abbinamento Ricetta Attivo
                </p>
                <div className="flex items-center gap-2.5 mt-2">
                  <span className="text-[20px]">{selectedRecipe.image}</span>
                  <p className="text-[14px] font-extrabold text-white">
                    {selectedVariant.name}
                  </p>
                </div>
                <p className="text-[12.5px] text-slate-400 mt-2 leading-relaxed">
                  Fai adottare la tua variante personalizzata da un ristorante partner. Sarà preparata appositamente dallo Chef per te!
                </p>

                {!hasAdoptionSelected ? (
                  <div className="mt-4 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block font-mono">
                      Seleziona Ristorante Partner:
                    </label>
                    <select
                      className="w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-[13px] text-white outline-none focus:ring-1 focus:ring-orange-500"
                      value={selectedAdoptionRestId}
                      onChange={(e) => setSelectedAdoptionRestId(e.target.value)}
                    >
                      {dbRestaurants.map(r => (
                        <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                          {r.name} ({r.specialty})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdoptRecipe}
                      className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold text-[13px] rounded-xl transition-all shadow-md shadow-orange-500/10 active:scale-95 text-center block"
                    >
                      Invia Proposta allo Chef
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-emerald-400 text-[13px] font-black">
                        ✓ Piatto inserito nel Menù!
                      </p>
                      <p className="text-[11.5px] text-slate-400 mt-1">
                        Incluso presso: <b>{getRestaurantName(selectedAdoptionRestId)}</b>
                      </p>
                    </div>
                    <span className="text-[22px] animate-pulse">✨</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-2xl p-4.5 border border-slate-800 text-center text-[12.5px] text-orange-400 leading-relaxed font-semibold">
                ⚠️ Non hai selezionato una variante personalizzata AI. Vai nella scheda <b>Ricette</b>, personalizzala con Chef AI e torna qui per candidarla nei Ristoranti!
              </div>
            )}

            {/* List of Partner Agriturismi offering tourist recipes */}
            <div className="space-y-4 pt-2">
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider ml-1 font-mono">
                Prenota un tavolo nei Ristoranti Partner
              </p>
              
              {dbRestaurants.map((rest: any) => {
                const isBooked = bookedRestId === rest.id || (bookedRestaurants && bookedRestaurants.includes(rest.id));
                const adoptions = rest.adoptedRecipes || [];

                return (
                  <div key={rest.id} className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col transition-all duration-300 hover:border-slate-700/60">
                    {rest.image && (
                      <div className="h-44 w-full relative overflow-hidden">
                        <img 
                          src={rest.image} 
                          alt={rest.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] text-orange-400 font-extrabold font-mono tracking-wider border border-slate-800/50">
                          FASCIA {rest.price}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-5 flex flex-col justify-between flex-1">
                      <div className="min-w-0">
                        <h3 className="font-black text-[17px] text-white leading-tight">
                          {rest.name}
                        </h3>
                        <p className="text-[12.5px] text-slate-400 leading-tight mt-1.5 flex items-center gap-1.5">
                          <span>📍</span> <span className="truncate">{rest.address}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 leading-tight mt-1.5 font-mono flex items-center gap-2">
                          <span>📞 {rest.phone || "+39 0733 ..."}</span>
                          <span className="text-slate-600">•</span>
                          <span>🕒 {rest.hours || "Aperto stasera"}</span>
                        </p>
                        
                        <div className="mt-3 p-3 rounded-2xl bg-slate-950/40 border border-slate-850 text-[12.5px] text-orange-400 leading-relaxed font-semibold">
                          <span className="text-slate-400 text-[11px] block font-mono font-bold uppercase tracking-wider mb-0.5">Specialità</span>
                          ✨ {rest.specialty}
                        </div>
                      </div>

                      {/* Adopted listings inside restaurant */}
                      {adoptions.length > 0 && (
                        <div className="mt-4 bg-slate-950/60 rounded-xl p-3.5 border border-slate-850 space-y-2">
                          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-orange-400 font-mono">
                            Menu Speciale dell'Evento ({adoptions.length})
                          </p>
                          {adoptions.map((ad: any, adIdx: number) => (
                            <div key={adIdx} className="text-[12px] text-slate-300 flex items-center justify-between gap-1.5 border-b border-slate-900/40 pb-1.5 last:border-0 last:pb-0">
                              <span className="truncate">
                                🥗 <b>{ad.variantName}</b> <span className="text-slate-500 text-[11px]">(Ricetta di {ad.touristName})</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-orange-400 font-mono font-bold shrink-0">
                                Adottato
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleBookTable(rest.id)}
                          disabled={isBooked}
                          className={`flex-1 py-3 text-[13px] font-extrabold rounded-xl transition-all active:scale-[0.98] shadow text-center leading-tight ${
                            isBooked
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-orange-500 hover:bg-orange-600 text-slate-950"
                          }`}
                        >
                        {isBooked ? "✓ Tavolo Riservato" : "Riserva Tavolo Omaggio"}
                      </button>
                    </div>

                    {/* Show Ticket Card if booked */}
                    {isBooked && (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center relative overflow-hidden animate-slideup">
                        <p className="text-[10.5px] font-extrabold uppercase text-emerald-400 font-mono tracking-wider">
                          Ticket VIP Valido per il Menù
                        </p>
                        <p className="text-[17px] font-black font-mono text-white tracking-widest mt-1.5">
                          {bookingTicketCode || `MCR-${(uid || "guest").slice(0, 5).toUpperCase()}-${rest.id.toUpperCase()}-${(rest.name || "").length}772`}
                        </p>
                        
                        {/* Simulation QR render block */}
                        <div className="mt-3.5 mx-auto bg-white p-3 rounded-2xl inline-block shadow-sm">
                          <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                            <rect width="100" height="100" fill="white" />
                            <rect x="10" y="10" width="20" height="20" fill="#0f172a" />
                            <rect x="14" y="14" width="12" height="12" fill="white" />
                            <rect x="70" y="10" width="20" height="20" fill="#0f172a" />
                            <rect x="74" y="14" width="12" height="12" fill="white" />
                            <rect x="10" y="70" width="20" height="20" fill="#0f172a" />
                            <rect x="14" y="74" width="12" height="12" fill="white" />
                            <path d="M40 20h10v10H40zm20 10h10v10H60zm-20 20h10v10H40zm20 0h10v10H60zm-10 20h10v10H50z" fill="#0f172a" />
                            <path d="M40 70h10v10H40zm30 0h15v15H70zm-10 10h10v10H60z" fill="#0f172a" />
                          </svg>
                        </div>
                        <p className="text-[10.5px] text-slate-500 mt-2.5 font-medium leading-normal">
                          Mostra questo codice allo Chef per ricevere lo sconto fedeltà!
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SOCIAL FEED & SELFIE ACCUMULATOR */}
        {activeSubTab === "feed" && (
          <div className="space-y-4 animate-fade-in mt-3.5">
            {/* Selfie Simulator Box */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-lg">
              <h3 className="font-extrabold text-[15px] text-white tracking-tight">
                Simula Selfie nel locale con lo Chef! 📸
              </h3>
              <p className="text-[12.5px] text-slate-400 leading-relaxed mt-1">
                Fatti immortalare al tavolo mentre lo Chef ti serve il tuo piatto preferito e guadagna +100 punti Earned Media!
              </p>

              {!selfieTaken ? (
                <div className="mt-4.5 space-y-3">
                  <button
                    type="button"
                    onClick={handleTakeSelfie}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-slate-950 rounded-xl font-bold text-[13.5px] flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-orange-500/10"
                  >
                    <span>📸</span>
                    <span>Cattura Selfie con lo Chef (Preimpostato)</span>
                  </button>

                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <span className="relative px-3 bg-slate-900 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Oppure carica la tua foto reale</span>
                  </div>

                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-6 bg-slate-950/40 hover:bg-slate-950 cursor-pointer transition-all duration-200">
                    <span className="text-[26px] mb-1.5">📤</span>
                    <span className="text-[12.5px] font-extrabold text-white">Carica una foto reale del piatto</span>
                    <span className="text-[10px] text-slate-550 mt-1">PNG, JPG, HEIC o GIF svelata al tavolo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setCustomUserPhoto(event.target.result as string);
                              setSimulatedChef("Tavolo Reale");
                              setSelfieTaken(true);
                              showToastMsg("Foto reale caricata con successo! Applica un filtro Martech e scrivi il caption! 🌟", "success");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-4.5 space-y-4">
                  {/* Selfie Preview with active filter */}
                  <div className="aspect-[4/3] w-full bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800">
                    <img
                      src={customUserPhoto || chefPictures[0]}
                      alt="Selfie with chef"
                      className={`w-full h-full object-cover transition-all duration-300 ${filterStyles[selectedFilter]}`}
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800 backdrop-blur px-3.5 py-1 rounded-full text-[11px] font-bold text-slate-200 shadow">
                      🎯 {name} • {simulatedChef}
                    </div>
                    {/* Emoji stickers overlay */}
                    <div className="absolute bottom-3 right-3 text-[48px] animate-bounce">
                      🍝👩‍🍳
                    </div>
                  </div>

                  {/* Filter switcher */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">
                      Seleziona Filtro Martech:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {Object.keys(filterStyles).map(fName => (
                        <button
                          key={fName}
                          type="button"
                          onClick={() => setSelectedFilter(fName)}
                          className={`py-2 rounded-lg text-[10px] font-bold transition border ${
                            selectedFilter === fName
                              ? "bg-orange-500/10 border-orange-500 text-orange-400"
                              : "bg-slate-950 border-slate-850 text-slate-400"
                          }`}
                        >
                          {fName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption Editor */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wide block font-mono">
                      Testo del Post (Earned Media Auto-generato):
                    </label>
                    <textarea
                      rows={3}
                      className="w-full mt-2 p-3 rounded-xl bg-slate-950 border border-slate-850 text-[12.5px] text-white outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed resize-none"
                      value={customCaption}
                      onChange={(e) => setCustomCaption(e.target.value)}
                    />
                    <span className="text-[9.5px] text-slate-550 block mt-1.5 leading-normal">
                      Include geolocalizzazione autentica e tag dell'agriturismo per moltiplicare l'earned media reach.
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelfieTaken(false)}
                      className="px-4 py-3 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-[13px] font-bold active:scale-95 transition"
                    >
                      Riprova
                    </button>
                    <button
                      type="button"
                      onClick={handlePostEarnedMedia}
                      disabled={postingLoading}
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-[13px] rounded-xl active:scale-[0.98] transition shadow flex items-center justify-center gap-2"
                    >
                      {postingLoading ? (
                        <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                      ) : (
                        <span>Simula Pubblicazione Virale (IG/TikTok) 🚀</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Social Feed of Earned Media Posts */}
            <div className="space-y-4 pt-2">
              <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 ml-1 font-mono">
                Feed Sociale dell'Evento (#LaRicettaAutentica)
              </p>

              {socialFeed.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-[12.5px] bg-slate-900 border border-slate-800 rounded-2xl">
                  Nessun post caricato nel social feed. Scatta il tuo selfie con lo Chef!
                </div>
              ) : (
                socialFeed.map(post => (
                  <div key={post.id} className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-lg">
                    {/* Poster details */}
                    <div className="p-3.5 flex items-center justify-between border-b border-slate-850">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[16px] ring-2 ring-orange-400/20">
                          {post.userAvatar || "👨‍🍳"}
                        </div>
                        <div className="leading-tight">
                          <p className="text-[13px] font-extrabold text-white">
                            {post.userName}
                          </p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            ha cenato presso: <b>{post.restaurantName}</b>
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        {post.platform}
                      </span>
                    </div>

                    {/* Post Picture */}
                    <div className="aspect-[4/3] w-full relative">
                      <img
                        src={post.imageUrl}
                        alt="Dish with chef"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 border border-slate-800 backdrop-blur px-2.5 py-1 rounded text-slate-100 text-[10.5px] font-bold flex items-center gap-1.5">
                        🍝 Variante: <b className="text-orange-400">{post.variantName}</b>
                      </div>
                    </div>

                    {/* Post engagement & caption */}
                    <div className="p-4">
                      <div className="flex items-center gap-4 text-[12.5px] font-extrabold text-slate-200 pb-3 border-b border-slate-850">
                        <span className="flex items-center gap-1 text-rose-400 hover:scale-105 transition cursor-pointer">
                          ❤️ {post.likes}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-slate-500 text-[11px] font-bold">
                          👁️ {post.views} Reach Visualizzazioni
                        </span>
                      </div>
                      
                      <p className="text-[12px] text-slate-350 mt-3.5 leading-relaxed">
                        <b className="text-white font-extrabold">{post.userName}</b>: {post.caption}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INCORONAZIONE WEEKEND */}
        {activeSubTab === "incoronazione" && (
          <div className="space-y-5 animate-fade-in mt-3.5">
            {/* Crown visual banner */}
            <div className="bg-slate-900 rounded-3xl p-5 text-slate-100 shadow-xl relative border border-slate-800 text-center select-none overflow-hidden">
              <div className="absolute -right-2 -bottom-2 text-[100px] opacity-5">🥇</div>
              <span className="text-[36px] animate-bounce block">🏆</span>
              <h3 className="text-[20px] font-extrabold mt-2 text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Incoronazione Ristoratore & Recensioni Ex-Post
              </h3>
              <p className="text-[12px] text-slate-400 mt-2 leading-relaxed max-w-[340px] mx-auto">
                La combinazione di ordini reali, adozione di ricette e recensioni turistiche ex-post determina il vincitore assoluto dell'Incoronazione!
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1 bg-slate-950/60 rounded-full text-[10px] font-bold border border-slate-800 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Incoronazione basata su dati cloud reali
              </div>
            </div>

            {/* Weighted Leaderboard Chart */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-lg pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider font-mono">
                  📊 Classifica Attiva della Ristorazione Maceratese
                </p>
                <span className="text-[9.5px] px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-extrabold leading-none">
                  Formula: (Adozioni×50) + (Ordini×20) + (👍×15) - (👎×10)
                </span>
              </div>

              <div className="space-y-4">
                {(() => {
                  // Calculate max adoptions count for crowning adoption champion
                  const adCounts = dbRestaurants.map(r => (r.adoptedRecipes || []).length);
                  const maxAdCount = adCounts.length > 0 ? Math.max(...adCounts) : 0;

                  // Render restaurants sorted by weighted leaderboard score
                  const scoredRestaurants = dbRestaurants.map(rt => {
                    const rFeedbacks = feedbacks.filter(f => f.restaurantId === rt.id);
                    const countPos = rFeedbacks.filter(f => f.rating === 1).length;
                    const countNeg = rFeedbacks.filter(f => f.rating === -1).length;
                    const adoptionsCount = (rt.adoptedRecipes || []).length;
                    const score = (adoptionsCount * 50) + (rt.orders * 22) + (countPos * 15) - (countNeg * 10);
                    return { ...rt, score, countPos, countNeg, adoptionsCount };
                  }).sort((a, b) => b.score - a.score);

                  const maxScore = scoredRestaurants.length > 0 ? Math.max(...scoredRestaurants.map(r => r.score), 1) : 1;

                  return scoredRestaurants.map((rt: any, rtIndex: number) => {
                    const barWidth = Math.max(Math.round((rt.score / maxScore) * 100), 5);
                    const isAdoptionChampion = rt.adoptionsCount > 0 && rt.adoptionsCount === maxAdCount;

                    return (
                      <div key={rt.id} className="space-y-2 p-3 rounded-2xl bg-slate-950/20 border border-slate-850/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[12.5px] font-bold text-white gap-1.5">
                          <span className="flex items-wrap items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-center font-mono">
                              #{rtIndex + 1}
                            </span>
                            <b className="text-[13.5px] text-white truncate">{rt.name}</b>
                            {isAdoptionChampion && (
                              <span className="text-[8.5px] font-black font-mono leading-none px-2 py-0.5 rounded bg-amber-500 text-slate-950 animate-pulse flex items-center gap-0.5" title="Questo ristorante ha adottato il maggior numero di varianti ricette degli utenti!">
                                👑 CAMPIONE ADOZIONI ({rt.adoptionsCount})
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[11.5px] text-orange-400 shrink-0">
                            {rt.score} pt <span className="text-[9.5px] text-slate-500">({rt.adoptionsCount} ric. / {rt.orders} ord. / {rt.countPos}👍 / {rt.countNeg}👎)</span>
                          </span>
                        </div>
                        
                        {/* Interactive bar graph display */}
                        <div className="h-6 bg-slate-950 rounded-xl overflow-hidden p-0.5 border border-slate-850 flex items-center">
                          <div
                            className={`h-full rounded-lg transition-all duration-1000 bg-gradient-to-r ${
                              rtIndex === 0
                                ? "from-amber-400 to-orange-500 text-slate-950 font-black shadow-inner"
                                : "from-slate-800 to-slate-700 text-slate-350"
                            } text-[9.5px] flex items-center pl-3.5 relative`}
                            style={{ width: `${barWidth}%` }}
                          >
                            <span className="font-mono font-bold">{barWidth}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Submit Ex-Post Feedbacks Form */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-lg">
              <p className="text-[11.5px] font-bold uppercase text-slate-400 tracking-wider mb-3.5 block font-mono">
                ✍️ Esprimi Accoglienza & Sostegno Ex-Post
              </p>
              
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-widest block mb-2 font-mono">
                    Ristorante da valutare
                  </label>
                  <select
                    value={reviewRestId}
                    onChange={(e) => setReviewRestId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 text-[13px] font-bold text-white"
                  >
                    {dbRestaurants.map((rt: any) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-widest block mb-1.5 font-mono">
                    Qualità dell'esperienza rispetto all'aspettativa:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setReviewRating(1)}
                      className={`py-3 rounded-xl border-2 font-bold text-[13px] flex items-center justify-center gap-1.5 transition ${
                        reviewRating === 1
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                          : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="text-[16px]">👍</span> All'altezza
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewRating(-1)}
                      className={`py-3 rounded-xl border-2 font-bold text-[13px] flex items-center justify-center gap-1.5 transition ${
                        reviewRating === -1
                          ? "bg-red-500/10 border-red-500 text-red-450 text-red-400"
                          : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300 text-slate-400"
                      }`}
                    >
                      <span className="text-[16px]">👎</span> Inferiore alle attese
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-widest block mb-2 font-mono">
                    Il tuo commento sulla degustazione
                  </label>
                  <textarea
                    rows={2.5}
                    maxLength={140}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 text-[13px] text-slate-100 placeholder-slate-600"
                    placeholder="Es. 'I vincisgrassi STG erano perfetti e croccanti!' o 'Tempo di attesa leggermente lungo...'"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-[13.5px] rounded-xl active:scale-[0.99] transition shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5"
                >
                  {reviewLoading ? "Inoltro recensione cloud..." : "Invia Recensione e Ricevi +10 Punti 🗳️"}
                </button>
              </form>
            </div>

            {/* ex-post Reviews Cloud Feed */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-lg">
              <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-4 block font-mono">
                💬 Recensioni Turistiche Ex-Post Attive ({feedbacks.length})
              </p>

              {feedbacks.length > 0 ? (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {feedbacks.map((f: any) => {
                    const isPositive = f.rating === 1;
                    return (
                      <div key={f.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-850 flex items-start gap-3.5 relative">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[20px] shrink-0">
                          {f.userAvatar || "👨‍🍳"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-[13px] text-white truncate">
                              {f.userName}
                            </span>
                            <span className="text-[16px]">
                              {isPositive ? "👍" : "👎"}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-orange-400 font-semibold mt-0.5">
                            Recensione su: {f.restaurantName}
                          </p>

                          <p className="text-[12px] text-slate-350 mt-1.5 leading-normal italic">
                            "{f.comment}"
                          </p>

                          {/* Verified Guest badge */}
                          {f.isVerifiedGuest && (
                            <span className="mt-2 inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded-md leading-none font-mono uppercase tracking-wider">
                              🏷️ OSPITE VERIFICATO
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-6 text-[12px] text-slate-500 font-medium">
                  Nessuna recensione registrata per questo weekend culinario. Sii il primo a scriverne una!
                </p>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Real-time Martech Simulation Publish Progress Overlay */}
      {simulatedOverlayStep !== -1 && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden animate-scaleup">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 animate-pulse" />
            
            <div className="text-center space-y-4">
              <span className="text-[44px] animate-bounce inline-block mt-2">📣</span>
              <h4 className="font-extrabold text-[17px] text-white tracking-tight">
                Simulatore di Pubblicazione Social
              </h4>
              <p className="text-[12px] text-slate-400 leading-normal">
                L'applicazione sta simulando la pubblicazione del tuo post "Earned Media" nei canali Sandbox.
              </p>
              
              <div className="space-y-2 py-3">
                {[
                  "Connessione sicura col Router Martech del distretto di Macerata...",
                  "Simulazione handshake con Facebook & Instagram Graph API...",
                  "Verifica autenticità contrassegno geotag & tracciamento Earned Media...",
                  "Pubblicazione in corso sui profili della Sandbox Macerata..."
                ].map((stepText, idx) => {
                  const isDone = simulatedOverlayStep > idx;
                  const isActive = simulatedOverlayStep === idx;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-left">
                      <div className="shrink-0 w-5 h-5 rounded-full border border-slate-800 flex items-center justify-center">
                        {isDone ? (
                          <span className="text-emerald-400 text-[10.5px] font-black">✓</span>
                        ) : isActive ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        )}
                      </div>
                      <span className={`text-[12px] font-medium leading-tight ${isDone ? 'text-slate-450 font-medium' : isActive ? 'text-orange-400 font-bold' : 'text-slate-650'}`}>
                        {stepText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {simulatedOverlayStep >= 3 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl block text-[11px] text-emerald-400 leading-relaxed font-semibold animate-fade-in text-left">
                  🤝 <b>Sandbox Notice:</b> In produzione questa azione collegherà gli account OAuth Instagram/TikTok degli utenti per certificare l'earned media organico.
                </div>
              )}

              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850 mt-4 animate-pulse">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (simulatedOverlayStep / 4) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Simulating Partner Restaurant Selection */}
      {showFeatureModal && selectedSubForFeature && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scaleup">
            <div className="flex items-center justify-between pb-4 border-b border-slate-850">
              <h4 className="font-extrabold text-[15.5px] text-white flex items-center gap-2">
                <span>👨‍🍳</span> Simulatore Ristoratore Partner
              </h4>
              <button
                onClick={() => {
                  setShowFeatureModal(false);
                  setSelectedSubForFeature(null);
                }}
                className="text-slate-400 hover:text-white font-extrabold text-[16px] w-7 h-7 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-[12.5px] text-slate-350 leading-relaxed">
                Rappresenti uno dei partner gastronomici del distretto marchigiano. Seleziona quale ristorante/agriturismo includerà questa ricetta autentica nel menù fisso di questo fine settimana:
              </p>
              
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                <span className="text-[10px] font-bold text-orange-400 font-mono uppercase tracking-wider block">Piatto Selezionato:</span>
                <p className="text-[13px] font-black text-white mt-1">🍽️ {selectedSubForFeature.variantName}</p>
                <p className="text-[11px] text-slate-500 mt-1">Autore: {selectedSubForFeature.creatorName}</p>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block">Scegli Ristorante:</label>
                {dbRestaurants.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => handleFeatureSubmissionWeekend(r.id, selectedSubForFeature)}
                    className="w-full p-3.5 bg-slate-950 hover:bg-slate-850/80 border border-slate-850 rounded-2xl text-left active:scale-[0.98] transition flex items-center justify-between gap-2 text-white"
                  >
                    <div>
                      <p className="text-[12.5px] font-extrabold">{r.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium italic">{r.specialty}</p>
                    </div>
                    <span className="text-[11px] font-bold text-orange-400 shrink-0 font-mono">Includi ➔</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: User Recipe Adoption Celebration Overlay */}
      {congratsFeatured && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-orange-500 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-center space-y-5 animate-scaleup">
            <span className="text-[64px] block animate-bounce">🏆</span>
            <span className="text-[10px] px-3 py-1 bg-orange-500 text-slate-950 font-black tracking-widest uppercase rounded-full font-mono inline-block">
              La Tua Creazione è in Menù!
            </span>
            
            <div className="space-y-2">
              <h3 className="text-[20px] font-black text-white px-2">
                Validazione Reale Completata!
              </h3>
              <p className="text-[13px] text-slate-300 leading-relaxed max-w-sm mx-auto">
                Lo Chef dello stabilimento <b className="text-orange-400 font-black">"{congratsFeatured.restaurantName}"</b> ha selezionato il tuo piatto come speciale d'autore d'eccellenza per questo weekend!
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-3xl border border-slate-850 space-y-1 text-left">
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wide font-mono">Specialità Gastronomica:</p>
              <p className="text-[13.5px] font-black text-white">🍽️ {congratsFeatured.variantName}</p>
              <p className="text-[11.5px] text-slate-400 mt-1 italic">La ricetta originale di {name || "Ospite"} è ora parte della cultura locale!</p>
            </div>

            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-3 flex items-center justify-center gap-2">
              <span className="text-[18px]">✨</span>
              <span className="text-[13px] font-extrabold text-orange-400 font-mono">Sbloccati +150 PUNTI FEDELTÀ MARTECH!</span>
            </div>

            <button
              onClick={() => setCongratsFeatured(null)}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-[13px] rounded-xl active:scale-95 transition shadow-lg shadow-orange-500/20"
            >
              Eccellente! Raccogli i Punti 🇮🇹
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
