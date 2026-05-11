import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';

export default function useFirebaseObject(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onValue(
      ref(db, path),
      (snapshot) => {
        setData(snapshot.val());
        setLoading(false);
        setError(null);
      },
      () => {
        setError('Failed to load data.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [path]);

  return { data, loading, error };
}
