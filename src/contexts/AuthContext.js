// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        firebaseUser.getIdTokenResult()
          .then((tokenResult) => {
            setClaims(tokenResult.claims);
            setLoading(false);
          })
          .catch((error) => {
            console.error('Error fetching token claims:', error);
            setLoading(false);
          });
      } else {
        setClaims({});
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [auth]);

  // Provide an isAdmin flag
  const isAdmin = claims.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, claims, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
