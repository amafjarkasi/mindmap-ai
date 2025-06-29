import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserPreferences } from '@types/index';

class AuthService {
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  constructor() {
    this.initAuthStateListener();
    this.handleConnectionRecovery();
  }

  private initAuthStateListener() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          this.currentUser = await this.createUserFromFirebaseUser(firebaseUser);
        } else {
          this.currentUser = null;
        }

        // Notify all listeners
        this.authStateListeners.forEach(listener => {
          try {
            listener(this.currentUser);
          } catch (error) {
            console.error('Error in auth state listener:', error);
          }
        });
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        // Don't sign out user on temporary errors
        if (this.isTemporaryError(error)) {
          console.warn('Temporary auth error, maintaining current state');
          return;
        }
        this.currentUser = null;
        this.authStateListeners.forEach(listener => {
          try {
            listener(null);
          } catch (listenerError) {
            console.error('Error in auth state listener:', listenerError);
          }
        });
      }
    });
  }

  private isTemporaryError(error: any): boolean {
    if (!error) return false;

    const errorCode = error.code || '';
    const errorMessage = error.message || '';

    // Network-related errors that might be temporary
    const temporaryErrors = [
      'auth/network-request-failed',
      'auth/timeout',
      'unavailable',
      'deadline-exceeded',
      'internal',
      'websocket',
      'connection'
    ];

    return temporaryErrors.some(tempError =>
      errorCode.includes(tempError) || errorMessage.toLowerCase().includes(tempError)
    );
  }

  private async createUserFromFirebaseUser(firebaseUser: FirebaseUser): Promise<User> {
    let userData: any = null;

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      userData = userDoc.data();
    } catch (error) {
      console.warn('Failed to fetch user data from Firestore, using Firebase user data only:', error);
      // Continue with just Firebase user data if Firestore fails
    }

    const defaultPreferences: UserPreferences = {
      theme: 'auto',
      defaultAIProvider: 'openai',
      autoSave: true,
      notifications: {
        email: true,
        push: true,
        collaboration: true,
        updates: false
      },
      privacy: {
        profileVisibility: 'private',
        allowAnalytics: true,
        shareUsageData: false
      }
    };

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || userData?.displayName || '',
      photoURL: firebaseUser.photoURL || userData?.photoURL || '',
      emailVerified: firebaseUser.emailVerified,
      createdAt: userData?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: userData?.preferences || defaultPreferences
    };
  }

  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update profile with display name
      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Send email verification
      await sendEmailVerification(firebaseUser);

      // Create user document in Firestore
      const user = await this.createUserFromFirebaseUser(firebaseUser);
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...user,
        createdAt: new Date().toISOString()
      });

      return user;
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = await this.createUserFromFirebaseUser(userCredential.user);
      
      // Update last login time
      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: new Date().toISOString()
      });

      return user;
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        const user = await this.createUserFromFirebaseUser(firebaseUser);
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...user,
          createdAt: new Date().toISOString()
        });
        return user;
      } else {
        const user = await this.createUserFromFirebaseUser(firebaseUser);
        // Update last login time
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lastLoginAt: new Date().toISOString()
        });
        return user;
      }
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error: any) {
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Update Firebase Auth profile
      if (updates.displayName || updates.photoURL) {
        await updateProfile(auth.currentUser!, {
          displayName: updates.displayName || auth.currentUser!.displayName,
          photoURL: updates.photoURL || auth.currentUser!.photoURL
        });
      }

      // Update Firestore user document
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        ...updates,
        modified: new Date().toISOString()
      });

      // Update local user object
      this.currentUser = { ...this.currentUser, ...updates };
    } catch (error: any) {
      throw new Error('Failed to update profile. Please try again.');
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user is currently signed in');
    }

    try {
      const updatedPreferences = { ...this.currentUser.preferences, ...preferences };
      
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        preferences: updatedPreferences,
        modified: new Date().toISOString()
      });

      this.currentUser.preferences = updatedPreferences;
    } catch (error: any) {
      throw new Error('Failed to update preferences. Please try again.');
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);

    // Call immediately with current state
    callback(this.currentUser);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  }

  // Method to refresh authentication state (useful for connection recovery)
  async refreshAuthState(): Promise<void> {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        this.currentUser = await this.createUserFromFirebaseUser(auth.currentUser);
        this.authStateListeners.forEach(listener => {
          try {
            listener(this.currentUser);
          } catch (error) {
            console.error('Error in auth state listener during refresh:', error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
    }
  }

  // Method to handle connection recovery
  handleConnectionRecovery(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Connection restored, refreshing auth state');
        this.refreshAuthState();
      });
    }
  }
}

export const authService = new AuthService();
export default authService;
