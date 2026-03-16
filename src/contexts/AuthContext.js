// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole]       = useState(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setCurrentUser(user);

        // Use custom claims for role detection (consistent with Login.js)
        try {
          const tokenResult = await user.getIdTokenResult();
          const role = tokenResult.claims.role || null;
          setUserRole(role);
          setIsAdmin(role === 'admin');
        } catch (err) {
          console.error('Failed to fetch role from token claims:', err);
          setUserRole(null);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setIsAdmin(false);
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
    <AuthContext.Provider value={{ currentUser, userRole, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
