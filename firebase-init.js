import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDYXw90W3-OZufNG_yfoit0KRuRa8eHESM",
  authDomain: "ithaca-demo-d9425.firebaseapp.com",
  projectId: "ithaca-demo-d9425",
  storageBucket: "ithaca-demo-d9425.firebasestorage.app",
  messagingSenderId: "264823953180",
  appId: "1:264823953180:web:64d9c2716dfbfad5714cd9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);