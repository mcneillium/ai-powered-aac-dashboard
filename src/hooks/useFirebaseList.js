import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';

export default function useFirebaseList(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onValue(
      ref(db, path),
      (snapshot) => {
        const val = snapshot.val();
        setData(
          val
            ? Object.entries(val).map(([id, v]) =>
                typeof v === 'object' && v !== null ? { id, ...v } : { id, value: v }
              )
            : []
        );
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
