// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebaseConfig';

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

        // 1. Try custom claims first (server-set, tamper-proof)
        let role = null;
        try {
          const tokenResult = await user.getIdTokenResult();
          role = tokenResult.claims.role || null;
        } catch (err) {
          console.error('Failed to fetch role from claims:', err);
        }

        // 2. Fall back to /users/{uid}/role in Realtime Database
        //    This is where the mobile app stores the role.
        if (!role) {
          try {
            const snap = await get(ref(db, `users/${user.uid}/role`));
            if (snap.exists()) {
              const dbRole = snap.val();
              if (dbRole === ROLES.ADMIN || dbRole === ROLES.CAREGIVER) {
                role = dbRole;
              }
            }
          } catch (err) {
            console.error('Failed to fetch role from database:', err);
          }
        }

        setUserRole(role);
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
