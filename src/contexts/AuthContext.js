// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole]               = useState(null);
  const [authReady, setAuthReady]     = useState(false);  // true once onAuthStateChanged fires
  const [roleLoading, setRoleLoading] = useState(false);  // true only while fetching role

  const isAdmin = role === 'admin';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setCurrentUser(user);
        setAuthReady(true);       // auth resolved — public routes can render now
        setRoleLoading(true);     // start role fetch

        try {
          const tokenResult = await user.getIdTokenResult();
          const claimRole = tokenResult.claims.role;
          if (claimRole) {
            setRole(claimRole);
          } else {
            const dbPromise = get(ref(db, `users/${user.uid}/role`));
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Role lookup timed out')), 5000)
            );
            const snap = await Promise.race([dbPromise, timeoutPromise]);
            setRole(snap.val() || 'caregiver');
          }
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setRole('caregiver');
        }

        setRoleLoading(false);    // role resolved — private routes can render now
      } else {
        setCurrentUser(null);
        setRole(null);
        setAuthReady(true);       // auth resolved — no user
        setRoleLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = (email, pwd) =>
    signInWithEmailAndPassword(auth, email, pwd);

  const signOut = () =>
    fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, role, isAdmin, authReady, roleLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
