// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { ref, get } from 'firebase/database';
import { ROLES } from '../shared/schema';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        setCurrentUser(user);
        setAuthReady(true);
        setRoleLoading(true);

        try {
          const dbPromise = get(ref(db, `users/${user.uid}/role`));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Role lookup timed out')), 5000)
          );
          const snap = await Promise.race([dbPromise, timeoutPromise]);
          const role = snap.val();
          setUserRole(role);
          setIsAdmin(role === ROLES.ADMIN);
          setIsCaregiver(role === ROLES.CAREGIVER || role === ROLES.ADMIN);
        } catch (err) {
          console.error('Failed to fetch role:', err);
          setUserRole(null);
          setIsAdmin(false);
          setIsCaregiver(false);
        }

        setRoleLoading(false);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setIsAdmin(false);
        setIsCaregiver(false);
        setAuthReady(true);
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
    <AuthContext.Provider value={{
      currentUser,
      user: currentUser,
      userRole,
      isAdmin,
      isCaregiver,
      authReady,
      roleLoading,
      loading: !authReady || roleLoading,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
