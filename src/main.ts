import './styles/main.css';
import { MindMapGenerator } from './components/MindMapGenerator';
import { AuthModal } from './components/AuthModal';
import { authService } from './services/auth';
import { mindMapStorageService } from './services/mindMapStorage';
import { searchService } from './services/searchService';
import { analyticsService } from './services/analyticsService';
import { collaborationService } from './services/collaborationService';
import { themeService } from './services/themeService';
import { isProd } from './utils/env';
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
      // Ensure DOM is ready and reset layout immediately
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.resetDemoSectionLayout();
          this.stabilizeLayout();
        });
      } else {
        this.resetDemoSectionLayout();
        this.stabilizeLayout();
      }

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

      // Set up WebSocket connection monitoring
      this.setupWebSocketMonitoring();

      // Initialize service worker for PWA features
      this.initializeServiceWorker();

      // Initialize theme service
      themeService.applyTheme(themeService.getCurrentTheme() || themeService.getAllThemes()[0]);

      // Fix layout issues when navigating back from other pages
      this.setupLayoutStabilization();

      // Reset demo section layout to prevent layout issues
      this.resetDemoSectionLayout();

      // Set up page visibility listener to reset button state when returning to page
      this.setupPageVisibilityListener();

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
    // Global error handler with Vite HMR error filtering
    window.addEventListener('error', (event) => {
      // Check if this is a Vite HMR related error
      if (event.error && event.error.message) {
        const errorMessage = event.error.message.toLowerCase();
        if (errorMessage.includes('websocket closed without opened') ||
            errorMessage.includes('failed to connect to websocket') ||
            errorMessage.includes('websocket connection failed')) {
          console.warn('Vite HMR error suppressed:', event.error.message);
          event.preventDefault();
          return;
        }
      }

      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred. Please try again.');
    });

    // Unhandled promise rejection handler with enhanced WebSocket handling
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Check if this is a Vite HMR WebSocket-related error
      if (event.reason && typeof event.reason === 'object') {
        const reason = event.reason.toString().toLowerCase();
        const message = event.reason.message?.toLowerCase() || '';

        // Enhanced detection for Vite HMR WebSocket errors
        const viteHmrErrors = [
          'websocket closed without opened',
          'websocket connection failed',
          'failed to connect to websocket',
          'websocket',
          'ws://',
          'connection',
          'hmr',
          'vite'
        ];

        if (viteHmrErrors.some(error => reason.includes(error) || message.includes(error))) {
          console.warn('Vite HMR WebSocket error detected and suppressed:', event.reason);
          event.preventDefault();
          return;
        }
      }

      // Check for specific Vite error messages
      if (event.reason && event.reason.message) {
        const errorMessage = event.reason.message.toLowerCase();
        if (errorMessage.includes('websocket closed without opened') ||
            errorMessage.includes('failed to connect to websocket')) {
          console.warn('Vite WebSocket error suppressed:', event.reason.message);
          event.preventDefault();
          return;
        }
      }

      // For other errors, show user-friendly message
      this.showError('An unexpected error occurred. Please try again.');
      event.preventDefault();
    });
  }

  private setupWebSocketMonitoring(): void {
    // Monitor WebSocket connections for development HMR
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Override WebSocket constructor to add enhanced error handling
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);

          // Enhanced error handling for Vite HMR WebSockets
          this.addEventListener('error', (event) => {
            const urlString = url.toString();
            if (urlString.includes('localhost') && (urlString.includes('token=') || urlString.includes('vite'))) {
              console.warn('Vite HMR WebSocket error suppressed:', urlString);
              event.stopPropagation();
              event.preventDefault();
            } else {
              console.warn('WebSocket connection error:', event);
            }
          });

          this.addEventListener('close', (event) => {
            const urlString = url.toString();
            if (event.code !== 1000) { // 1000 is normal closure
              if (urlString.includes('localhost') && (urlString.includes('token=') || urlString.includes('vite'))) {
                console.warn('Vite HMR WebSocket closed (suppressed):', event.code, event.reason);
              } else {
                console.warn('WebSocket closed unexpectedly:', event.code, event.reason);
              }
            }
          });

          // Handle connection open for debugging
          this.addEventListener('open', (event) => {
            const urlString = url.toString();
            if (urlString.includes('localhost') && (urlString.includes('token=') || urlString.includes('vite'))) {
              console.log('Vite HMR WebSocket connected successfully');
            }
          });
        }
      };
    }
  }

  private setupLayoutStabilization(): void {
    // Fix layout issues when page becomes visible (e.g., when navigating back)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Force layout recalculation when page becomes visible
        setTimeout(() => {
          this.stabilizeLayout();
        }, 100);
      }
    });

    // Handle page show event (back/forward navigation)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Page was restored from bfcache, force layout recalculation
        setTimeout(() => {
          this.stabilizeLayout();
        }, 100);
      }
    });

    // Initial layout stabilization
    setTimeout(() => {
      this.stabilizeLayout();
    }, 200);
  }

  private stabilizeLayout(): void {
    // Force layout recalculation and ensure proper demo section constraints
    const demoSection = document.querySelector('.demo-section') as HTMLElement;
    const chatContainer = document.querySelector('.chat-container') as HTMLElement;
    const chatInputContainer = document.querySelector('.chat-input-container') as HTMLElement;
    const chatMessages = document.querySelector('.chat-messages') as HTMLElement;

    if (chatContainer) {
      // Force complete layout reset on chat container
      chatContainer.style.setProperty('display', 'flex', 'important');
      chatContainer.style.setProperty('flex-direction', 'column', 'important');
      chatContainer.style.setProperty('height', '100%', 'important');
      chatContainer.style.setProperty('overflow', 'hidden', 'important');
      chatContainer.style.setProperty('position', 'relative', 'important');
      chatContainer.style.setProperty('min-height', '0', 'important');
    }

    if (chatMessages) {
      // Ensure chat messages maintain proper flex properties
      chatMessages.style.setProperty('flex', '1', 'important');
      chatMessages.style.setProperty('order', '1', 'important');
      chatMessages.style.setProperty('overflow-y', 'auto', 'important');
      chatMessages.style.setProperty('min-height', '300px', 'important');
      chatMessages.style.setProperty('max-height', '75%', 'important');
    }

    if (demoSection) {
      // Temporarily force a style recalculation
      const originalDisplay = demoSection.style.display;
      demoSection.style.display = 'none';
      demoSection.offsetHeight; // Force reflow
      demoSection.style.display = originalDisplay;

      // Aggressively ensure proper flex order and layout constraints
      demoSection.style.setProperty('order', '2', 'important');
      demoSection.style.setProperty('min-height', '80px', 'important');
      demoSection.style.setProperty('max-height', '80px', 'important');
      demoSection.style.setProperty('height', '80px', 'important');
      demoSection.style.setProperty('flex', '0 0 auto', 'important');
      demoSection.style.setProperty('position', 'relative', 'important');
      demoSection.style.setProperty('z-index', '1', 'important');
      demoSection.style.setProperty('display', 'flex', 'important');
      demoSection.style.setProperty('align-items', 'center', 'important');
      demoSection.style.setProperty('overflow', 'hidden', 'important');
    }

    // Ensure chat input container maintains proper positioning
    if (chatInputContainer) {
      chatInputContainer.style.setProperty('order', '3', 'important');
      chatInputContainer.style.setProperty('flex', '0 0 auto', 'important');
      chatInputContainer.style.setProperty('position', 'relative', 'important');
      chatInputContainer.style.setProperty('z-index', '2', 'important');
    }

    // Force multiple reflows to ensure changes take effect
    if (chatContainer) chatContainer.offsetHeight;
    if (chatMessages) chatMessages.offsetHeight;
    if (demoSection) demoSection.offsetHeight;
    if (chatInputContainer) chatInputContainer.offsetHeight;
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator && isProd()) {
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

  // Public method for testing demo button state
  public testDemoButtonState(): void {
    const demoButton = document.querySelector('.demo-link-prominent') as HTMLAnchorElement;
    if (demoButton) {
      const computedStyle = window.getComputedStyle(demoButton);
      const inlineStyle = demoButton.style;

      console.log('Demo Button State Test:', {
        computed: {
          background: computedStyle.background,
          backgroundColor: computedStyle.backgroundColor,
          backgroundImage: computedStyle.backgroundImage,
          color: computedStyle.color,
          textDecoration: computedStyle.textDecoration,
          transform: computedStyle.transform,
          boxShadow: computedStyle.boxShadow
        },
        inline: {
          background: inlineStyle.background,
          color: inlineStyle.color,
          textDecoration: inlineStyle.textDecoration,
          transform: inlineStyle.transform,
          boxShadow: inlineStyle.boxShadow,
          cssText: inlineStyle.cssText
        },
        states: {
          visited: demoButton.matches(':visited'),
          hover: demoButton.matches(':hover'),
          active: demoButton.matches(':active'),
          focus: demoButton.matches(':focus')
        },
        attributes: {
          href: demoButton.href,
          className: demoButton.className,
          id: demoButton.id
        }
      });

      // Test child elements
      const demoIcon = demoButton.querySelector('.demo-icon') as HTMLElement;
      const demoText = demoButton.querySelector('.demo-text') as HTMLElement;
      const demoArrow = demoButton.querySelector('.demo-arrow') as HTMLElement;

      console.log('Child Elements:', {
        icon: demoIcon ? {
          color: window.getComputedStyle(demoIcon).color,
          inlineColor: demoIcon.style.color
        } : null,
        text: demoText ? {
          color: window.getComputedStyle(demoText).color,
          inlineColor: demoText.style.color
        } : null,
        arrow: demoArrow ? {
          color: window.getComputedStyle(demoArrow).color,
          transform: window.getComputedStyle(demoArrow).transform,
          inlineColor: demoArrow.style.color,
          inlineTransform: demoArrow.style.transform
        } : null
      });
    } else {
      console.log('Demo button not found');
    }
  }

  // Public method to force reset demo button state
  public forceResetDemoButton(): void {
    console.log('Forcing demo button state reset...');
    this.resetDemoButtonState();
    setTimeout(() => {
      this.testDemoButtonState();
    }, 100);
  }

  private resetDemoSectionLayout(): void {
    try {
      // Focus on layout positioning rather than just styling
      const demoSection = document.querySelector('.demo-section') as HTMLElement;
      const demoButton = document.querySelector('.demo-link-prominent') as HTMLAnchorElement;
      const chatContainer = document.querySelector('.chat-container') as HTMLElement;
      const chatInputContainer = document.querySelector('.chat-input-container') as HTMLElement;

      if (demoSection) {
        // Aggressively reset all layout properties
        demoSection.style.cssText = '';

        // Apply proper layout constraints with high priority
        demoSection.style.setProperty('min-height', '80px', 'important');
        demoSection.style.setProperty('max-height', '80px', 'important');
        demoSection.style.setProperty('height', '80px', 'important');
        demoSection.style.setProperty('flex', '0 0 auto', 'important');
        demoSection.style.setProperty('order', '2', 'important');
        demoSection.style.setProperty('position', 'relative', 'important');
        demoSection.style.setProperty('z-index', '1', 'important');
        demoSection.style.setProperty('display', 'flex', 'important');
        demoSection.style.setProperty('align-items', 'center', 'important');
        demoSection.style.setProperty('padding', '1rem', 'important');
        demoSection.style.setProperty('border-bottom', '1px solid var(--border-color)', 'important');
        demoSection.style.setProperty('overflow', 'hidden', 'important');

        // Force layout recalculation
        demoSection.offsetHeight;
      }

      if (chatInputContainer) {
        // Ensure chat input container maintains proper positioning
        chatInputContainer.style.setProperty('order', '3', 'important');
        chatInputContainer.style.setProperty('flex', '0 0 auto', 'important');
        chatInputContainer.style.setProperty('position', 'relative', 'important');
        chatInputContainer.style.setProperty('z-index', '2', 'important');
      }

      if (demoButton) {
        // Reset any problematic inline styles that might affect layout
        demoButton.style.removeProperty('position');
        demoButton.style.removeProperty('top');
        demoButton.style.removeProperty('left');
        demoButton.style.removeProperty('transform');
        demoButton.style.removeProperty('z-index');
        demoButton.style.removeProperty('width');
        demoButton.style.removeProperty('height');

        // Ensure proper button styling (minimal approach)
        demoButton.style.setProperty('background', 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))', 'important');
        demoButton.style.setProperty('color', 'white', 'important');
        demoButton.style.setProperty('text-decoration', 'none', 'important');
        demoButton.style.setProperty('width', '100%', 'important');
        demoButton.style.setProperty('box-sizing', 'border-box', 'important');

        // Force layout recalculation
        demoButton.offsetHeight;
      }

      // Force a complete layout recalculation on the chat container
      if (chatContainer) {
        chatContainer.style.setProperty('display', 'flex', 'important');
        chatContainer.style.setProperty('flex-direction', 'column', 'important');
        chatContainer.style.setProperty('height', '100%', 'important');
        chatContainer.offsetHeight;
      }

      // Call layout stabilization to ensure proper positioning
      this.stabilizeLayout();

    } catch (error) {
      console.debug('Demo section layout reset skipped:', error);
    }
  }

  private resetDemoButtonState(): void {
    // Legacy method - now calls the layout-focused approach
    this.resetDemoSectionLayout();
  }

  private setupPageVisibilityListener(): void {
    let lastResetTime = 0;
    const resetThrottle = 500; // Reduced throttle for more responsive resets

    const throttledReset = () => {
      const now = Date.now();
      if (now - lastResetTime > resetThrottle) {
        lastResetTime = now;
        setTimeout(() => {
          this.resetDemoSectionLayout();
        }, 50); // Faster reset timing
      }
    };

    // Enhanced page visibility handling
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible - user returned from demo page
        throttledReset();
        // Additional reset after a short delay to handle browser caching
        setTimeout(() => {
          this.resetDemoSectionLayout();
        }, 200);
      }
    });

    // Enhanced focus event handling
    window.addEventListener('focus', () => {
      throttledReset();
      // Additional reset for edge cases
      setTimeout(() => {
        this.resetDemoSectionLayout();
      }, 150);
    });

    // Enhanced pageshow event (critical for back button navigation)
    window.addEventListener('pageshow', (event) => {
      throttledReset();
      // Handle bfcache scenarios
      if (event.persisted) {
        // Page was restored from bfcache
        setTimeout(() => {
          this.resetDemoSectionLayout();
        }, 100);
      }
    });

    // Enhanced popstate event (browser navigation)
    window.addEventListener('popstate', throttledReset);

    // Additional DOMContentLoaded reset for initial page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          this.resetDemoButtonState();
        }, 100);
      });
    } else {
      // Document already loaded
      setTimeout(() => {
        this.resetDemoButtonState();
      }, 100);
    }

    // Enhanced hashchange event
    window.addEventListener('hashchange', throttledReset);

    // Additional beforeunload preparation
    window.addEventListener('beforeunload', () => {
      // Prepare for potential state issues on return
      sessionStorage.setItem('demo-button-needs-reset', 'true');
    });

    // Check for reset flag on page load
    if (sessionStorage.getItem('demo-button-needs-reset') === 'true') {
      sessionStorage.removeItem('demo-button-needs-reset');
      setTimeout(() => {
        this.resetDemoButtonState();
      }, 200);
    }

    // Only reset on specific demo button interactions to prevent constant manipulation
    const demoButton = document.querySelector('.demo-link-prominent');
    if (demoButton) {
      demoButton.addEventListener('mouseenter', () => {
        // Only reset if there are problematic inline styles
        const hasProblematicStyles = demoButton.style.cssText &&
          (demoButton.style.background !== '' ||
           demoButton.style.color !== '' ||
           demoButton.style.textDecoration !== '');

        if (hasProblematicStyles) {
          throttledReset();
        }
      });

      // Set up a minimal MutationObserver only for critical style changes
      const observer = new MutationObserver((mutations) => {
        let needsReset = false;
        mutations.forEach((mutation) => {
          try {
            if (mutation.type === 'attributes' &&
                mutation.attributeName === 'style' &&
                mutation.target &&
                'classList' in mutation.target &&
                (mutation.target as HTMLElement).classList?.contains('demo-link-prominent')) {
              // Only reset if there are actually problematic styles
              const element = mutation.target as HTMLElement;
              const hasProblematicStyles = element.style.cssText &&
                (element.style.background !== '' ||
                 element.style.color !== '' ||
                 element.style.textDecoration !== '');

              if (hasProblematicStyles) {
                needsReset = true;
              }
            }
          } catch (error) {
            console.debug('MutationObserver error:', error);
          }
        });

        if (needsReset) {
          throttledReset();
        }
      });

      // Start observing only style changes on the demo button
      try {
        observer.observe(demoButton, {
          attributes: true,
          attributeFilter: ['style']
        });
      } catch (error) {
        console.warn('Failed to set up MutationObserver:', error);
      }
    }
  }
}

// Initialize the application
const app = new App();

// Make app globally available for debugging and external access
(window as any).app = app;

export default app;
