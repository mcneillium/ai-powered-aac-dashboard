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
    // Safety timeout — if auth never resolves, stop loading after 5s
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);

      if (user) {
        setCurrentUser(user);

        try {
          const tokenResult = await user.getIdTokenResult();
          const claimRole = tokenResult.claims.role;
          if (claimRole) {
            setRole(claimRole);
          } else {
            // DB lookup with its own timeout
            const dbPromise = get(ref(db, `users/${user.uid}/role`));
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('DB role lookup timed out')), 5000)
            );
            const snap = await Promise.race([dbPromise, timeoutPromise]);
            setRole(snap.val() || 'caregiver');
          }
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setRole('caregiver');
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
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
