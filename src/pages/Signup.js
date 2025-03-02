// src/screens/SignupScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState(''); // Optional: caregiver name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth();
  const db = getDatabase();

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // Create a new user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save additional caregiver info in the Realtime Database under "caregivers"
      await set(ref(db, `caregivers/${user.uid}`), {
        name: name || 'Unnamed Caregiver',
        email: email,
        createdAt: Date.now()
      });
      
      // Navigate to the main app screen or home screen after successful sign-up
      navigation.navigate('MainApp');
    } catch (error) {
      alert('Sign up error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Name (optional)"
        autoCapitalize="words"
        onChangeText={setName}
        value={name}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  input: { 
    width: '100%', 
    height: 50, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    marginBottom: 15, 
    fontSize: 16 
  },
  button: { 
    backgroundColor: '#4CAF50', 
    paddingVertical: 15, 
    paddingHorizontal: 30, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600' 
  },
  link: { 
    color: '#4CAF50', 
    fontSize: 16 
  }
});
