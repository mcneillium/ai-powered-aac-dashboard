// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole]               = useState(null);
  const [loading, setLoading]         = useState(true);

  const isAdmin = role === 'admin';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setCurrentUser(user);

        // Check custom claims first (set via Firebase Admin SDK), fall back to DB
        try {
          const tokenResult = await user.getIdTokenResult();
          const claimRole = tokenResult.claims.role;
          if (claimRole) {
            setRole(claimRole);
          } else {
            const snap = await get(ref(db, `users/${user.uid}/role`));
            setRole(snap.val() || 'caregiver');
          }
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setRole(null);
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = (email, pwd) =>
    signInWithEmailAndPassword(auth, email, pwd);

  const signOut = () =>
    fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, role, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
