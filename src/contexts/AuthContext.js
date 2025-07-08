// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        // ALWAYS set the Firebase user object
        setCurrentUser(user);

        // THEN fetch their role from your database:
        try {
          const snap = await get(ref(db, `users/${user.uid}/role`));
          const role = snap.val();
          setIsAdmin(role === 'admin');
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }

      // Now that we've done both steps, loading is done
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = (email, pwd) =>
    signInWithEmailAndPassword(auth, email, pwd);

  const signOut = () =>
    fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
