import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserState } from "../types";

const initialState: UserState = {
  uid: null,
  name: "",
  avatar: "👨‍🍳",
  points: 0,
  stamps: [],
  badge: "Novizio",
  is_winner: false,
  bookedRestaurants: [],
  votedRestaurants: [],
  votedSubmissions: [],
  hasProposedRecipe: false,
  hasRedeemedPrize: false,
  authenticated: false,
  loading: true,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<UserState> & { uid: string }>) => {
      state.uid = action.payload.uid;
      state.name = action.payload.name || state.name || "Turista Guerriero";
      state.avatar = action.payload.avatar || state.avatar;
      state.points = typeof action.payload.points === "number" ? action.payload.points : state.points;
      state.stamps = action.payload.stamps || state.stamps;
      state.badge = action.payload.badge || state.badge;
      state.is_winner = typeof action.payload.is_winner === "boolean" ? action.payload.is_winner : state.is_winner;
      state.bookedRestaurants = action.payload.bookedRestaurants || state.bookedRestaurants || [];
      state.votedRestaurants = action.payload.votedRestaurants || state.votedRestaurants || [];
      state.votedSubmissions = action.payload.votedSubmissions || state.votedSubmissions || [];
      state.hasProposedRecipe = typeof action.payload.hasProposedRecipe === "boolean" ? action.payload.hasProposedRecipe : state.hasProposedRecipe || false;
      state.hasRedeemedPrize = typeof action.payload.hasRedeemedPrize === "boolean" ? action.payload.hasRedeemedPrize : state.hasRedeemedPrize;
      state.authenticated = true;
      state.loading = false;
    },
    updatePoints: (state, action: PayloadAction<number>) => {
      state.points += action.payload;
      // Calculate badge
      if (state.stamps.length >= 4) {
        state.badge = "Oro";
      } else if (state.points >= 200) {
        state.badge = "Argento";
      } else if (state.points >= 100) {
        state.badge = "Bronzo";
      } else {
        state.badge = "Novizio";
      }
    },
    addStampToState: (state, action: PayloadAction<string>) => {
      if (!state.stamps.includes(action.payload)) {
        state.stamps.push(action.payload);
        state.points += 50; // Award 50 points per stamp
        
        // Check level / badge
        if (state.stamps.length >= 4) {
          state.badge = "Oro";
          state.is_winner = true;
          state.points += 150; // Bonus points for completing the recipe
        } else if (state.points >= 200) {
          state.badge = "Argento";
        } else if (state.points >= 100) {
          state.badge = "Bronzo";
        }
      }
    },
    addBookedRestaurant: (state, action: PayloadAction<string>) => {
      if (!state.bookedRestaurants.includes(action.payload)) {
        state.bookedRestaurants.push(action.payload);
      }
    },
    addVotedRestaurant: (state, action: PayloadAction<string>) => {
      if (!state.votedRestaurants) {
        state.votedRestaurants = [];
      }
      if (!state.votedRestaurants.includes(action.payload)) {
        state.votedRestaurants.push(action.payload);
      }
    },
    addVotedSubmission: (state, action: PayloadAction<string>) => {
      if (!state.votedSubmissions) {
        state.votedSubmissions = [];
      }
      if (!state.votedSubmissions.includes(action.payload)) {
        state.votedSubmissions.push(action.payload);
      }
    },
    setRedeemedPrize: (state, action: PayloadAction<boolean>) => {
      state.hasRedeemedPrize = action.payload;
    },
    setProposedRecipeAction: (state, action: PayloadAction<boolean>) => {
      state.hasProposedRecipe = action.payload;
    },
    setWinnerState: (state, action: PayloadAction<boolean>) => {
      state.is_winner = action.payload;
      if (action.payload) {
        state.badge = "Oro";
      }
    },
    setLoadingState: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearUserState: (state) => {
      state.uid = null;
      state.name = "";
      state.avatar = "👨‍🍳";
      state.points = 0;
      state.stamps = [];
      state.badge = "Novizio";
      state.is_winner = false;
      state.bookedRestaurants = [];
      state.votedRestaurants = [];
      state.votedSubmissions = [];
      state.hasProposedRecipe = false;
      state.hasRedeemedPrize = false;
      state.authenticated = false;
      state.loading = false;
    }
  }
});

export const { 
  setUser, 
  updatePoints, 
  addStampToState, 
  addBookedRestaurant,
  addVotedRestaurant,
  addVotedSubmission,
  setRedeemedPrize,
  setProposedRecipeAction,
  setWinnerState, 
  setLoadingState, 
  clearUserState 
} = userSlice.actions;

export default userSlice.reducer;
