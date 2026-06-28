import { describe, test, expect } from "vitest";
import userReducer, { 
  setUser, 
  updatePoints, 
  addStampToState 
} from "../store/userSlice";
import recipeReducer, { 
  selectRecipe, 
  setCart 
} from "../store/recipeSlice";
import challengeReducer, { 
  voteRestaurantState, 
  orderRestaurantState, 
  addPostToState 
} from "../store/challengeSlice";

describe("Redux User Slice State Engine", () => {
  test("should load the correct default initial state", () => {
    const state = userReducer(undefined, { type: "@@INIT" });
    expect(state).toEqual({
      uid: null,
      name: "",
      avatar: "👨‍🍳",
      points: 0,
      stamps: [],
      badge: "Novizio",
      is_winner: false,
      authenticated: false,
      loading: true,
    });
  });

  test("should handle user registration and login", () => {
    const state = userReducer(
      undefined,
      setUser({ uid: "user_test_id", name: "Emanuele", avatar: "👩‍🍳", points: 45 })
    );
    expect(state.uid).toBe("user_test_id");
    expect(state.name).toBe("Emanuele");
    expect(state.avatar).toBe("👩‍🍳");
    expect(state.points).toBe(45);
    expect(state.authenticated).toBe(true);
  });

  test("should accumulate point totals and calculate badges correctly", () => {
    let state = userReducer(undefined, updatePoints(120));
    expect(state.points).toBe(120);
    expect(state.badge).toBe("Bronzo");

    state = userReducer(state, updatePoints(100)); // Total 220
    expect(state.points).toBe(220);
    expect(state.badge).toBe("Argento");
  });

  test("should allocate stamp and trigger chef victory at 4 stamps", () => {
    let state = userReducer(undefined, addStampToState("shop1"));
    expect(state.stamps).toContain("shop1");
    expect(state.points).toBe(50); // Scanned stamp reward points

    // Scans 3 additional stamps, leading to 4 total stamps
    state = userReducer(state, addStampToState("shop2"));
    state = userReducer(state, addStampToState("shop3"));
    state = userReducer(state, addStampToState("shop4"));

    expect(state.stamps.length).toBe(4);
    expect(state.badge).toBe("Oro");
    expect(state.is_winner).toBe(true);
    expect(state.points).toBe(350); // (4 * 50) + 150 gold bonus points
  });
});

describe("Redux Recipe Integration State", () => {
  test("should handle recipe active focus selection", () => {
    const state = recipeReducer(undefined, selectRecipe("r1"));
    expect(state.selectedRecipeId).toBe("r1");
  });

  test("should handle shopping cart initialization", () => {
    const listIngredients = [
      { id: "i1", name: "Farina di semola", qty: "400g", shopId: "shop1" },
      { id: "i2", name: "Uova fresche", qty: "4", shopId: "shop2" }
    ];
    const state = recipeReducer(undefined, setCart(listIngredients));
    expect(state.shoppingCart).toEqual(listIngredients);
  });
});

describe("Redux Challenge Standing & Telemetry Slices", () => {
  test("should register voting triggers dynamically", () => {
    let state = challengeReducer(undefined, voteRestaurantState("rest1"));
    expect(state.votedRestaurantIds).toContain("rest1");
    
    const rest = state.restaurants.find(r => r.id === "rest1");
    expect(rest?.votes).toBe(146); // Default 145 + 1 new vote
  });

  test("should register orders count dynamically", () => {
    let state = challengeReducer(undefined, orderRestaurantState("rest1"));
    expect(state.orderedRestaurantIds).toContain("rest1");

    const rest = state.restaurants.find(r => r.id === "rest1");
    expect(rest?.orders).toBe(88); // Default 87 + 1 new order
  });

  test("should include new Earned Media post in social feed", () => {
    const mockedPost = {
      id: "media_p1",
      userId: "u_test",
      userName: "Alex",
      userAvatar: "👨‍🍳",
      restaurantId: "rest2",
      restaurantName: "Trattoria Elodia",
      recipeId: "r1",
      recipeName: "Chitarra",
      variantName: "Variante Zafferano",
      imageUrl: "http://example.com/asset.png",
      caption: "Cucinata per davvero!",
      platform: "instagram" as const,
      likes: 12,
      views: 120,
      timestamp: "2026-06-17"
    };

    let state = challengeReducer(undefined, addPostToState(mockedPost));
    expect(state.earnedMediaPosts[0].id).toBe("media_p1");
    // Verifies aggregate analytics summation
    expect(state.globalReach).toBe(mockedPost.views + 7340); // 7340 is seed base
    expect(state.totalLikes).toBe(mockedPost.likes + 854); // 854 is seed base
  });
});
