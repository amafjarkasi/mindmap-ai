import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getEnvVar, isProd, isDev } from '../utils/env';

// Firebase configuration
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', "demo-api-key"),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', "mindmap-ai-demo.firebaseapp.com"),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', "mindmap-ai-demo"),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', "mindmap-ai-demo.appspot.com"),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', "123456789"),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', "1:123456789:web:abcdef123456"),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', "G-ABCDEF123456")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics only in production
export const analytics = typeof window !== 'undefined' && isProd()
  ? getAnalytics(app)
  : null;

// Connect to emulators in development
if (isDev() && typeof window !== 'undefined') {
  try {
    // Only connect if not already connected
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    
    // Check if Firestore emulator is not already connected
    if (!(db as any)._delegate._databaseId.projectId.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    // Check if Storage emulator is not already connected
    if (!storage.app.options.storageBucket?.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  } catch (error) {
    console.warn('Firebase emulators may already be connected:', error);
  }
}

export default app;
