// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const AuthContext = createContext();

/**
 * Provides authentication state and methods to the component tree.
 * Listens for Firebase Auth state changes and resolves the user's role
 * from custom claims.
 *
 * Context value:
 * - currentUser {Object|null} - Firebase Auth user object
 * - userRole {string|null} - Role from custom claims ('admin', 'caregiver', or null)
 * - isAdmin {boolean} - Shorthand for userRole === 'admin'
 * - loading {boolean} - True while auth state is being resolved
 * - signIn {Function} - (email, password) => Promise
 * - signOut {Function} - () => Promise
 */
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

/**
 * Hook to access the AuthContext value.
 * Must be used within an AuthProvider.
 * @returns {{ currentUser: Object|null, userRole: string|null, isAdmin: boolean, loading: boolean, signIn: Function, signOut: Function }}
 */
export function useAuth() {
  return useContext(AuthContext);
}
