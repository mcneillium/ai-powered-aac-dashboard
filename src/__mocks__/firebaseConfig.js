// src/__mocks__/firebaseConfig.js
export const db = {};
export const auth = {
  currentUser: { uid: 'test-uid', email: 'test@example.com', getIdToken: jest.fn(() => Promise.resolve('mock-token')) },
  onAuthStateChanged: jest.fn(),
};
