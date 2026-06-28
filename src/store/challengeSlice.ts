import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Restaurant, EarnedMediaPost, AdoptedRecipe } from "../types";

interface ChallengeState {
  restaurants: Restaurant[];
  earnedMediaPosts: EarnedMediaPost[];
  votedRestaurantIds: string[]; // Track user votes
  orderedRestaurantIds: string[]; // Track user registered orders
  globalReach: number; // Aggregate view count
  totalLikes: number; // Aggregate like count
  activeTabChallenge: "ristoranti" | "feed" | "martech";
  sharingLoading: boolean;
}

const initialRestaurants: Restaurant[] = [
  {
    id: 'rest1',
    name: 'Osteria San Nicola',
    address: 'Via San Nicola, 13, Tolentino (MC)',
    lat: 43.2085,
    lng: 13.2847,
    specialty: 'Vincisgrassi tradizionali, coniglio in porchetta, ciavuscolo di Tolentino',
    price: '€€',
    votes: 185,
    orders: 94,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=60',
    phone: '+39 0733 901234',
    hours: 'Aperto: 12:30-14:30, 19:30-22:30 (Chiuso Lun)',
    adoptedRecipes: [
      {
        recipeId: 'r1',
        recipeName: 'Vincisgrassi Maceratesi STG',
        variantId: 'v1',
        variantName: 'Vincisgrassi Nobiliare al Tartufo dei Sibillini',
        touristId: 'seeded1',
        touristName: 'Evelyn Smith',
        touristAvatar: '👩‍✈️'
      }
    ]
  },
  {
    id: 'rest2',
    name: 'Le Sette Cuccagne',
    address: 'Viale Foro Boario, 2, Caldarola (MC)',
    lat: 43.1385,
    lng: 13.2268,
    specialty: 'Gnocchi fatti a mano con sugo di papera, grigliata dei Sibillini',
    price: '€€',
    votes: 152,
    orders: 78,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=60',
    phone: '+39 0733 905477',
    hours: 'Aperto: Ven-Dom: 12:00-15:00, 19:00-23:00',
    adoptedRecipes: [
      {
        recipeId: 'r2',
        recipeName: 'Ciavuscolo IGP su Pane Caldo',
        variantId: 'v2',
        variantName: 'Ciavuscolo IGP Aromatizzato al Vino Cotto',
        touristId: 'seeded2',
        touristName: 'Hans Müller',
        touristAvatar: '👨‍🚀'
      }
    ]
  },
  {
    id: 'rest3',
    name: 'Osteria del Silenzio',
    address: 'Via del Borgo, 15, Ripe San Ginesio (MC)',
    lat: 43.1432,
    lng: 13.3674,
    specialty: 'Tagliolini all\'uovo al tartufo estivo maceratese, ciavuscolo fuso',
    price: '€€€',
    votes: 128,
    orders: 64,
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=60',
    phone: '+39 0733 500122',
    hours: 'Aperto: Lun-Sab: 19:00-23:30',
    adoptedRecipes: []
  },
  {
    id: 'rest4',
    name: 'Trattoria Da Ezio',
    address: 'Via Giuseppe Mazzini, 4, Macerata (MC)',
    lat: 43.3002,
    lng: 13.4534,
    specialty: 'Vincisgrassi storici STG, coniglio in porchetta marchigiano',
    price: '€€',
    votes: 164,
    orders: 85,
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=60',
    phone: '+39 0733 232233',
    hours: 'Aperto: 12:30-14:30, 19:30-22:30 (Chiuso Lun)',
    adoptedRecipes: []
  },
  {
    id: 'rest5',
    name: 'Osteria da Vittorio',
    address: 'Corso Garibaldi, 45, Tolentino (MC)',
    lat: 43.2108,
    lng: 13.2885,
    specialty: 'Tagliata marchigiana al sale di Cervia, ravioli di ricotta e cinghiale',
    price: '€€',
    votes: 140,
    orders: 72,
    image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&auto=format&fit=crop&q=60',
    phone: '+39 0733 974522',
    hours: 'Aperto: 12:00-14:30, 19:30-22:30 (Chiuso Mar)',
    adoptedRecipes: []
  }
];

const initialPosts: EarnedMediaPost[] = [
  {
    id: 'post_seed_1',
    userId: 'seeded1',
    userName: 'Evelyn Smith',
    userAvatar: '👩‍✈️',
    restaurantId: 'rest1',
    restaurantName: 'Trattoria Da Ezio',
    recipeId: 'r1',
    recipeName: 'Vincisgrassi Maceratesi STG',
    variantName: 'Vincisgrassi Nobiliare al Tartufo dei Sibillini',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60',
    caption: 'La mia Ricetta Autentica approvata ed adottata dalla Trattoria Da Ezio a Macerata! Un\'emozione pazzesca assaggiarla preparata sapientemente dallo Chef! #LaRicettaAutentica #Macerata #MarcheFood #ChefChallenge',
    platform: 'instagram',
    likes: 342,
    views: 2450,
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: 'post_seed_2',
    userId: 'seeded2',
    userName: 'Hans Müller',
    userAvatar: '👨‍🚀',
    restaurantId: 'rest2',
    restaurantName: 'Osteria dei Fiori',
    recipeId: 'r2',
    recipeName: 'Ciavuscolo IGP su Pane Caldo',
    variantName: 'Ciavuscolo IGP Aromatizzato al Vino Cotto',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=60',
    caption: 'Unbelievable gourmet variant with Macerata ciavuscolo and local Vino Cotto caramelized reduction! Highly recommended in beautiful Macerata medieval city center. #LaRicettaAutentica #MarcheMartech #EcoTourism',
    platform: 'tiktok',
    likes: 512,
    views: 4890,
    timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
  }
];

const calculateTotals = (posts: EarnedMediaPost[]) => {
  const reach = posts.reduce((acc, p) => acc + p.views, 0);
  const likes = posts.reduce((acc, p) => acc + p.likes, 0);
  return { reach, likes };
};

const initialState: ChallengeState = {
  restaurants: initialRestaurants,
  earnedMediaPosts: initialPosts,
  votedRestaurantIds: [],
  orderedRestaurantIds: [],
  globalReach: 7340,
  totalLikes: 854,
  activeTabChallenge: "ristoranti",
  sharingLoading: false,
};

const challengeSlice = createSlice({
  name: "challenge",
  initialState,
  reducers: {
    setRestaurants: (state, action: PayloadAction<Restaurant[]>) => {
      state.restaurants = action.payload;
    },
    setEarnedMediaPosts: (state, action: PayloadAction<EarnedMediaPost[]>) => {
      state.earnedMediaPosts = action.payload;
      const { reach, likes } = calculateTotals(action.payload);
      state.globalReach = reach;
      state.totalLikes = likes;
    },
    addPostToState: (state, action: PayloadAction<EarnedMediaPost>) => {
      // Add to beginning of layout
      state.earnedMediaPosts.unshift(action.payload);
      const { reach, likes } = calculateTotals(state.earnedMediaPosts);
      state.globalReach = reach;
      state.totalLikes = likes;
    },
    voteRestaurantState: (state, action: PayloadAction<string>) => {
      if (!state.votedRestaurantIds.includes(action.payload)) {
        state.votedRestaurantIds.push(action.payload);
        const rest = state.restaurants.find(r => r.id === action.payload);
        if (rest) {
          rest.votes += 1;
        }
      }
    },
    orderRestaurantState: (state, action: PayloadAction<string>) => {
      if (!state.orderedRestaurantIds.includes(action.payload)) {
        state.orderedRestaurantIds.push(action.payload);
        const rest = state.restaurants.find(r => r.id === action.payload);
        if (rest) {
          rest.orders += 1;
        }
      }
    },
    adoptMenuAction: (state, action: PayloadAction<{ restaurantId: string; adoption: AdoptedRecipe }>) => {
      const rest = state.restaurants.find(r => r.id === action.payload.restaurantId);
      if (rest) {
        // Prevent duplicate adoptions
        const alreadyAdopted = rest.adoptedRecipes.some(
          a => a.recipeId === action.payload.adoption.recipeId && a.touristId === action.payload.adoption.touristId
        );
        if (!alreadyAdopted) {
          rest.adoptedRecipes.push(action.payload.adoption);
        }
      }
    },
    setChallengeTab: (state, action: PayloadAction<"ristoranti" | "feed" | "martech">) => {
      state.activeTabChallenge = action.payload;
    },
    setSharingLoading: (state, action: PayloadAction<boolean>) => {
      state.sharingLoading = action.payload;
    }
  }
});

export const {
  setRestaurants,
  setEarnedMediaPosts,
  addPostToState,
  voteRestaurantState,
  orderRestaurantState,
  adoptMenuAction,
  setChallengeTab,
  setSharingLoading
} = challengeSlice.actions;

export default challengeSlice.reducer;
