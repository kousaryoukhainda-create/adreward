// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [loading, setLoading]         = useState(true);

  // Register new user
  async function register(name, email, password) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    await setDoc(doc(db, "users", user.uid), {
      name, email, balance: 0, totalEarned: 0,
      adsWatched: 0, status: "active",
      joinDate: serverTimestamp(), kycVerified: false,
    });
    return user;
  }

  // Sign in
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign out
  function logout() {
    return signOut(auth);
  }

  // Watch auth state + load user profile from Firestore
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check admin claim
        const token = await user.getIdTokenResult();
        setIsAdmin(!!token.claims.admin);

        // Live profile listener
        const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) setUserProfile({ id: snap.id, ...snap.data() });
        });
        setLoading(false);
        return () => unsubProfile();
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isAdmin, loading, register, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
