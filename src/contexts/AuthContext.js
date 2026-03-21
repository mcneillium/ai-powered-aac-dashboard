// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

const ROLES = {
  ADMIN: 'admin',
  CAREGIVER: 'caregiver',
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === ROLES.ADMIN;
  const isCaregiver = userRole === ROLES.CAREGIVER;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // Try custom claims first (more secure), fall back to database
        try {
          const tokenResult = await user.getIdTokenResult();
          const claimRole = tokenResult.claims.role;
          if (claimRole) {
            setUserRole(claimRole);
          } else {
            // Fallback to database role
            const snap = await get(ref(db, `users/${user.uid}/role`));
            setUserRole(snap.val() || null);
          }
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback((email, pwd) =>
    signInWithEmailAndPassword(auth, email, pwd), []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  const value = {
    currentUser,
    userRole,
    isAdmin,
    isCaregiver,
    loading,
    signIn,
    signOut,
    ROLES,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { ROLES };
