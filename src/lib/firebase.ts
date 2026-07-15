import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "graphical-monolith-l7c1c",
  appId: "1:758946223172:web:b0601ffa6c3192c5fc9811",
  apiKey: "AIzaSyCG9sfKctgvQmxEBlVLRjEJ7E0pAajoaBo",
  authDomain: "graphical-monolith-l7c1c.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-tankrosathyamang-53cad950-09ec-46a2-bcba-3152a10d6c06",
  storageBucket: "graphical-monolith-l7c1c.firebasestorage.app",
  messagingSenderId: "758946223172"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore using the designated databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
