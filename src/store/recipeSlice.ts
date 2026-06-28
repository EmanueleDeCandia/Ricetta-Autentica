import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Recipe, Ingredient, RecipeVariant } from "../types";

interface RecipeState {
  recipes: Recipe[];
  selectedRecipeId: string | null;
  shoppingCart: Ingredient[];
  selectedVariant: RecipeVariant | null;
  aiPersonalizationLoading: boolean;
}

const initialRecipes: Recipe[] = [
  {
    id: 'r1',
    name: 'Vincisgrassi Maceratesi STG',
    city: "Macerata",
    time: 120,
    difficulty: 'Difficile',
    image: '🥘',
    color: '#A0522D',
    description: "La sontuosa lasagna tipica di Macerata con dodici strati di pasta, besciamella e un denso ragù arricchito con regaglie di pollo.",
    story: "Ereditata dall'opera del 1779 di Antonio Nebbia ('Il Cuoco Maceratese'), è uno dei primi piatti storici italiani più complessi e prelibati.",
    ingredients:[
      {id:'i1', name:'Farina di grano tenero e uova', qty:'500g', shopId:'shop1'},
      {id:'i2', name:'Regaglie di pollo e rigaglie fresche', qty:'300g', shopId:'shop2'},
      {id:'i3', name:'Salsa di pomodoro concentrata', qty:'700g', shopId:'shop3'},
      {id:'i4', name:'Pecorino dei Monti Sibillini', qty:'120g', shopId:'shop4'},
      {id:'i5', name:'Carni miste tritate (vitello, maiale)', qty:'350g', shopId:'shop5'},
    ],
    variants:[
      {id:'v1', name:'Vincisgrassi Nobiliare al Tartufo', changes:'Sfoglie profumate col Tartufo Nero dei Sibillini', tip:'Aggiungi scaglie di tartufo fresco tra gli strati di besciamella.'},
      {id:'v2', name:'Vincisgrassi al Vino Cotto', changes:'Ragù aromatizzato con riduzione di Vino Cotto maceratese', tip:'Sfuma le regaglie di pollo con due cucchiai di vino cotto ben invecchiato.'},
      {id:'v3', name:'Vincisgrassi del Giorno Dopo', changes:'Crosticina croccante gratinata allo zafferano', tip:'Spolvera pecorino e zafferano a fine cottura per una gratinatura dorata.'},
    ]
  },
  {
    id:'r2',
    name:'Ciavuscolo IGP su Pane Caldo',
    city:"Macerata",
    time:15,
    difficulty:'Facile',
    image:'🥖',
    color:'#556B2F',
    description:"Il salame morbido e spalmabile dei colli maceratesi, profumato all'aglio e spezie, servito tiepido.",
    story:"Un capolavoro mastro norcino a indicazione geografica protetta, con un impasto così morbido da potersi spalmare generosamente.",
    ingredients:[
      {id:'i6', name:'Ciavuscolo IGP di Norcia/Macerata', qty:'500g', shopId:'shop5'},
      {id:'i7', name:'Pane di farro lievitato naturalmente', qty:'1 pagnotta', shopId:'shop1'},
      {id:'i8', name:'Aglio fresco e erbe aromatiche', qty:'q.b.', shopId:'shop3'},
      {id:'i9', name:'Olio extravergine del Piantone di Mogliano', qty:'q.b.', shopId:'shop3'},
    ],
    variants:[
      {id:'v1', name:'Ciavuscolo e Miele di Volpe', changes:'Accoppiata agrodolce con miele di acacia e noci tostate', tip:'Spalma il ciavuscolo sul pane bollente prima di colare un filo di miele d\'api.'},
      {id:'v2', name:'Bruschetta del Norcino Piccante', changes:'Con crema calda di pecorino aromatizzato al peperoncino', tip:'Fondi il pecorino a bagnomaria prima di riversarlo sopra il salame spalmato.'},
      {id:'v3', name:'Ciavuscolo Rustico Sfogliato', changes:'Infornato in una focaccia tiepida al rosmarino selvatico', tip:'Farcisci la focaccia calda lasciando riposare due minuti affinché il ciavuscolo si ammorbidisca.'},
    ]
  },
  {
    id:'r3',
    name:'Frascarelli Maceratesi',
    city:"Macerata",
    time:35,
    difficulty:'Media',
    image:'🥣',
    color:'#F4B400',
    description:"Riso cotto in cagnara unito a grumi di farina ('frascarelli'), condito tradizionalmente con ragù di maiale o lardo batituto.",
    story:"Antica ricetta povera contadina delle campagne di Macerata, concepita per rinvigorire i lavoratori dei campi durante la mietitura.",
    ingredients:[
      {id:'i10', name:'Farina tipo 0 di stocco marchigiano', qty:'250g', shopId:'shop1'},
      {id:'i11', name:'Riso Originario per cagnara', qty:'150g', shopId:'shop2'},
      {id:'i12', name:'Pancetta tesa nostrana e lardo', qty:'100g', shopId:'shop5'},
      {id:'i13', name:'Pecorino dei Monti Sibillini DOP', qty:'80g', shopId:'shop4'},
    ],
    variants:[
      {id:'v1', name:'Frascarelli con Crema di Ciauscolo', changes:'Sugo cremoso al ciavuscolo stemperato nel vino cotto', tip:'Cuoci il ciuscolo sgranato e versalo a caldo direttamente sui frascarelli.'},
      {id:'v2', name:'Frascarelli Dorati e Zafferano', changes:'Mantecatura allo zafferano dei colli maceratesi', tip:'Unisci lo zafferano all\'acqua di frascatura prima di incorporare la farina.'},
      {id:'v3', name:'Frascarelli alla Cacciatora', changes:'Abbinato a sugo denso di coniglio in porchetta', tip:'Prepara un sugo ristretto aromatizzato con abbondante finocchietto selvatico.'},
    ]
  },
];

const initialState: RecipeState = {
  recipes: initialRecipes,
  selectedRecipeId: null,
  shoppingCart: [],
  selectedVariant: null,
  aiPersonalizationLoading: false,
};

const recipeSlice = createSlice({
  name: "recipe",
  initialState,
  reducers: {
    selectRecipe: (state, action: PayloadAction<string | null>) => {
      state.selectedRecipeId = action.payload;
      state.selectedVariant = null; // Reset variant
    },
    setCart: (state, action: PayloadAction<Ingredient[]>) => {
      state.shoppingCart = action.payload;
    },
    clearCart: (state) => {
      state.shoppingCart = [];
    },
    selectVariantAction: (state, action: PayloadAction<RecipeVariant | null>) => {
      state.selectedVariant = action.payload;
    },
    setAiLoading: (state, action: PayloadAction<boolean>) => {
      state.aiPersonalizationLoading = action.payload;
    },
    updateRecipeVariants: (state, action: PayloadAction<{ recipeId: string; variants: RecipeVariant[] }>) => {
      const rec = state.recipes.find(r => r.id === action.payload.recipeId);
      if (rec) {
        rec.variants = action.payload.variants;
      }
    }
  }
});

export const { 
  selectRecipe, 
  setCart, 
  clearCart, 
  selectVariantAction, 
  setAiLoading,
  updateRecipeVariants 
} = recipeSlice.actions;

export default recipeSlice.reducer;
