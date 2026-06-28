import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  addDoc,
  where
} from "firebase/firestore";

// Config from firebase-applet-config.json
const firebaseConfig = {
  projectId: "my-project-first-330911",
  appId: "1:898481966164:web:d3a04bd3e075192e79b1c1",
  apiKey: "AIzaSyCQMCIek7Lv1-E0DkB2mCpabF0q4Y2AMz0",
  authDomain: "my-project-first-330911.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-342251d3-74e4-4cde-9b8b-2ca54300b99c",
  storageBucket: "my-project-first-330911.firebasestorage.app",
  messagingSenderId: "898481966164"
};

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);

// Use the custom firestoreDatabaseId "ai-studio-342251d3-74e4-4cde-9b8b-2ca54300b99c"
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Google Sign In
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Google Sign In Error (popup may be blocked):", error);
    // If we're inside an iframe or popup is blocked, we can fall back to anonymous/quick login
    if (error.code === "auth/popup-blocked" || error.code === "auth/operation-not-allowed" || error.code === "auth/popup-closed-by-user") {
      throw error;
    }
    throw error;
  }
};

// Anonymous/Fallback quick login
export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.warn("Anonymous login error / restricted environment (standard fallback to local guest session active):", error);
    throw error;
  }
};

export const logout = async () => {
  return firebaseSignOut(auth);
};

// Firestore collections helpers
export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  increment,
  arrayUnion,
  addDoc,
  where
};
