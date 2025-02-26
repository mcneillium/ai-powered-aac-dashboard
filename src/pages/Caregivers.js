import React, { useEffect, useState } from 'react';
import { ref, onValue, push, set } from 'firebase/database'; // If using Firebase
import { db } from '../firebaseConfig'; // If using Firebase

export default function Caregivers() {
  const [caregivers, setCaregivers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Listen for caregiver data in Realtime DB
  useEffect(() => {
    const caregiversRef = ref(db, 'caregivers');
    const unsubscribe = onValue(caregiversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setCaregivers(list);
    });
    return () => unsubscribe();
  }, []);

  const handleAddCaregiver = async () => {
    if (!name.trim() || !email.trim()) return;
    const newRef = push(ref(db, 'caregivers'));
    await set(newRef, { name, email });
    setName('');
    setEmail('');
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Caregivers</h2>
      <div>
        <input
          placeholder="Caregiver Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Caregiver Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={handleAddCaregiver}>Add Caregiver</button>
      </div>

      <table style={{ marginTop: 20, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>ID</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Email</th>
          </tr>
        </thead>
        <tbody>
          {caregivers.map(cg => (
            <tr key={cg.id}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{cg.id}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{cg.name}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{cg.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
