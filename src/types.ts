export interface Ingredient {
  id: string;
  name: string;
  qty: string;
  shopId: string;
}

export interface RecipeVariant {
  id: string;
  name: string;
  changes: string;
  tip: string;
}

export interface Recipe {
  id: string;
  name: string;
  city: string;
  time: number;
  difficulty: "Facile" | "Media" | "Difficile";
  image: string;
  color: string;
  description: string;
  story: string;
  ingredients: Ingredient[];
  variants: RecipeVariant[];
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  qr_secret: string;
  hours: string;
}

export interface AdoptedRecipe {
  recipeId: string;
  recipeName: string;
  variantId: string;
  variantName: string;
  touristId: string;
  touristName: string;
  touristAvatar: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  specialty: string;
  price: "€" | "€€" | "€€€";
  votes: number;
  orders: number;
  adoptedRecipes: AdoptedRecipe[];
  image?: string;
  phone?: string;
  hours?: string;
}

export interface EarnedMediaPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  restaurantId: string;
  restaurantName: string;
  recipeId: string;
  recipeName: string;
  variantName: string;
  imageUrl: string;
  caption: string;
  platform: "instagram" | "tiktok";
  likes: number;
  views: number;
  timestamp: any;
}

export interface UserState {
  uid: string | null;
  name: string;
  avatar: string;
  points: number;
  stamps: string[];
  badge: "Novizio" | "Bronzo" | "Argento" | "Oro";
  is_winner: boolean;
  bookedRestaurants: string[];
  votedRestaurants?: string[];
  votedSubmissions?: string[];
  hasProposedRecipe?: boolean;
  hasRedeemedPrize: boolean;
  authenticated: boolean;
  loading: boolean;
}
