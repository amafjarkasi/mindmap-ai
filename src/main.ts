import './styles/main.css';
import { MindMapGenerator } from './components/MindMapGenerator';
import { AuthModal } from './components/AuthModal';
import { authService } from './services/auth';
import { mindMapStorageService } from './services/mindMapStorage';
import { searchService } from './services/searchService';
import { analyticsService } from './services/analyticsService';
import { collaborationService } from './services/collaborationService';
import { themeService } from './services/themeService';
import type { User } from './types';

class App {
  private mindMapGenerator: MindMapGenerator | null = null;
  private authModal: AuthModal | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Initialize authentication state listener
      authService.onAuthStateChange((user) => {
        this.handleAuthStateChange(user);
      });

      // Initialize the mind map generator
      this.mindMapGenerator = new MindMapGenerator();

      // Initialize auth modal
      this.authModal = new AuthModal();

      // Set up global error handling
      this.setupErrorHandling();

      // Initialize service worker for PWA features
      this.initializeServiceWorker();

      // Initialize theme service
      themeService.applyTheme(themeService.getCurrentTheme() || themeService.getAllThemes()[0]);

      console.log('🧠 AI Mind Map Generator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  private handleAuthStateChange(user: User | null): void {
    this.currentUser = user;
    
    if (user) {
      console.log('User authenticated:', user.email);
      this.onUserAuthenticated(user);
    } else {
      console.log('User signed out');
      this.onUserSignedOut();
    }
  }

  private async onUserAuthenticated(user: User): Promise<void> {
    try {
      // Load user's mind maps and update search index
      const mindMaps = await mindMapStorageService.getUserMindMaps(user.uid);
      searchService.updateSearchIndex(mindMaps);

      // Update UI to show authenticated state
      this.updateUIForAuthenticatedUser(user);

      // Show welcome message for new users
      if (this.isNewUser(user)) {
        this.showWelcomeMessage(user);
      }
    } catch (error) {
      console.error('Error handling user authentication:', error);
    }
  }

  private onUserSignedOut(): void {
    // Clear search index
    searchService.updateSearchIndex([]);
    
    // Update UI to show unauthenticated state
    this.updateUIForUnauthenticatedUser();
    
    // Clear any sensitive data from memory
    this.clearUserData();
  }

  private isNewUser(user: User): boolean {
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const oneHour = 60 * 60 * 1000;
    return accountAge < oneHour;
  }

  private showWelcomeMessage(user: User): void {
    const welcomeMessage = `
      <div class="welcome-message">
        <h3>Welcome to AI Mind Map Generator! 🎉</h3>
        <p>Hi ${user.displayName || 'there'}! Here's what you can do:</p>
        <ul>
          <li>🧠 Create AI-powered mind maps from any topic</li>
          <li>💾 Save and organize your mind maps in the cloud</li>
          <li>🔍 Search across all your mind maps</li>
          <li>📤 Export in multiple formats (PNG, PDF, SVG, etc.)</li>
          <li>🎨 Use templates to get started quickly</li>
        </ul>
        <p>Try creating your first mind map by typing a topic below!</p>
      </div>
    `;
    
    this.showNotification(welcomeMessage, 'info', 10000);
  }

  private updateUIForAuthenticatedUser(user: User): void {
    // Update user profile display
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
      userProfile.innerHTML = `
        <div class="user-info">
          <img src="${user.photoURL || '/default-avatar.png'}" alt="Profile" class="user-avatar">
          <span class="user-name">${user.displayName || user.email}</span>
        </div>
        <button class="sign-out-btn" onclick="app.signOut()">Sign Out</button>
      `;
    }

    // Show authenticated features
    const authFeatures = document.querySelectorAll('.auth-required');
    authFeatures.forEach(element => {
      (element as HTMLElement).style.display = 'block';
    });

    // Hide sign-in prompts
    const signInPrompts = document.querySelectorAll('.sign-in-prompt');
    signInPrompts.forEach(element => {
      (element as HTMLElement).style.display = 'none';
    });
  }

  private updateUIForUnauthenticatedUser(): void {
    // Update user profile display
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
      userProfile.innerHTML = `
        <button class="sign-in-btn" onclick="app.showAuthModal()">Sign In</button>
      `;
    }

    // Hide authenticated features
    const authFeatures = document.querySelectorAll('.auth-required');
    authFeatures.forEach(element => {
      (element as HTMLElement).style.display = 'none';
    });

    // Show sign-in prompts
    const signInPrompts = document.querySelectorAll('.sign-in-prompt');
    signInPrompts.forEach(element => {
      (element as HTMLElement).style.display = 'block';
    });
  }

  private clearUserData(): void {
    // Clear any cached user data
    // This is important for security when user signs out
  }

  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred. Please try again.');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('An unexpected error occurred. Please try again.');
      event.preventDefault();
    });
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Public methods that can be called from the global scope
  public async signOut(): Promise<void> {
    try {
      await authService.signOut();
      this.showNotification('Successfully signed out', 'success');
    } catch (error) {
      console.error('Sign out error:', error);
      this.showError('Failed to sign out. Please try again.');
    }
  }

  public showAuthModal(): void {
    if (this.authModal) {
      this.authModal.show();
    }
  }

  public showError(message: string): void {
    this.showNotification(message, 'error');
  }

  public showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  public showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 5000): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        ${message}
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add to page
    const container = document.querySelector('.notification-container') || document.body;
    container.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, duration);
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getMindMapGenerator(): MindMapGenerator | null {
    return this.mindMapGenerator;
  }
}

// Initialize the application
const app = new App();

// Make app globally available for debugging and external access
(window as any).app = app;

export default app;
