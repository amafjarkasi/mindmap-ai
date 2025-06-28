import { authService } from './auth';

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  isBuiltIn: boolean;
  author?: string;
  created?: string;
}

interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

interface ThemeFonts {
  primary: string;
  secondary: string;
  monospace: string;
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    xxl: string;
  };
}

interface ThemeSpacing {
  borderRadius: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

interface CustomNodeStyle {
  id: string;
  name: string;
  shape: 'rectangle' | 'rounded' | 'ellipse' | 'diamond' | 'hexagon';
  colors: {
    fill: string;
    stroke: string;
    text: string;
  };
  font: {
    family: string;
    size: number;
    weight: string;
  };
  effects: {
    shadow: boolean;
    gradient: boolean;
    animation: string;
  };
}

class ThemeService {
  private currentTheme: Theme | null = null;
  private builtInThemes: Theme[] = [];
  private customThemes: Theme[] = [];
  private customNodeStyles: CustomNodeStyle[] = [];

  constructor() {
    this.initializeBuiltInThemes();
    this.loadUserThemes();
    this.applyStoredTheme();
  }

  private initializeBuiltInThemes(): void {
    this.builtInThemes = [
      {
        id: 'light',
        name: 'Light Theme',
        description: 'Clean and bright theme for daytime use',
        colors: {
          primary: '#667eea',
          primaryDark: '#4c51bf',
          secondary: '#48bb78',
          accent: '#ed8936',
          background: '#f7fafc',
          surface: '#ffffff',
          textPrimary: '#2d3748',
          textSecondary: '#4a5568',
          border: '#e2e8f0',
          success: '#38a169',
          warning: '#d69e2e',
          error: '#e53e3e',
          info: '#3182ce'
        },
        fonts: {
          primary: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          secondary: "'Georgia', serif",
          monospace: "'Fira Code', 'Consolas', monospace",
          sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            xxl: '1.5rem'
          }
        },
        spacing: {
          borderRadius: '8px',
          shadowSm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        },
        isBuiltIn: true
      },
      {
        id: 'dark',
        name: 'Dark Theme',
        description: 'Easy on the eyes for low-light environments',
        colors: {
          primary: '#667eea',
          primaryDark: '#4c51bf',
          secondary: '#48bb78',
          accent: '#ed8936',
          background: '#1a202c',
          surface: '#2d3748',
          textPrimary: '#f7fafc',
          textSecondary: '#e2e8f0',
          border: '#4a5568',
          success: '#38a169',
          warning: '#d69e2e',
          error: '#e53e3e',
          info: '#3182ce'
        },
        fonts: {
          primary: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          secondary: "'Georgia', serif",
          monospace: "'Fira Code', 'Consolas', monospace",
          sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            xxl: '1.5rem'
          }
        },
        spacing: {
          borderRadius: '8px',
          shadowSm: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
          shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
        },
        isBuiltIn: true
      },
      {
        id: 'ocean',
        name: 'Ocean Theme',
        description: 'Calming blue tones inspired by the ocean',
        colors: {
          primary: '#0ea5e9',
          primaryDark: '#0284c7',
          secondary: '#06b6d4',
          accent: '#f59e0b',
          background: '#f0f9ff',
          surface: '#ffffff',
          textPrimary: '#0c4a6e',
          textSecondary: '#075985',
          border: '#bae6fd',
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0284c7'
        },
        fonts: {
          primary: "'Inter', sans-serif",
          secondary: "'Merriweather', serif",
          monospace: "'JetBrains Mono', monospace",
          sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            xxl: '1.5rem'
          }
        },
        spacing: {
          borderRadius: '12px',
          shadowSm: '0 1px 3px 0 rgba(14, 165, 233, 0.1)',
          shadowMd: '0 4px 6px -1px rgba(14, 165, 233, 0.1)',
          shadowLg: '0 10px 15px -3px rgba(14, 165, 233, 0.1)'
        },
        isBuiltIn: true
      },
      {
        id: 'forest',
        name: 'Forest Theme',
        description: 'Natural green tones for a refreshing experience',
        colors: {
          primary: '#059669',
          primaryDark: '#047857',
          secondary: '#65a30d',
          accent: '#dc2626',
          background: '#f0fdf4',
          surface: '#ffffff',
          textPrimary: '#14532d',
          textSecondary: '#166534',
          border: '#bbf7d0',
          success: '#16a34a',
          warning: '#ca8a04',
          error: '#dc2626',
          info: '#0891b2'
        },
        fonts: {
          primary: "'Nunito', sans-serif",
          secondary: "'Crimson Text', serif",
          monospace: "'Source Code Pro', monospace",
          sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            xxl: '1.5rem'
          }
        },
        spacing: {
          borderRadius: '6px',
          shadowSm: '0 1px 3px 0 rgba(5, 150, 105, 0.1)',
          shadowMd: '0 4px 6px -1px rgba(5, 150, 105, 0.1)',
          shadowLg: '0 10px 15px -3px rgba(5, 150, 105, 0.1)'
        },
        isBuiltIn: true
      }
    ];
  }

  private loadUserThemes(): void {
    try {
      const stored = localStorage.getItem('custom_themes');
      if (stored) {
        this.customThemes = JSON.parse(stored);
      }

      const storedStyles = localStorage.getItem('custom_node_styles');
      if (storedStyles) {
        this.customNodeStyles = JSON.parse(storedStyles);
      }
    } catch (error) {
      console.error('Error loading user themes:', error);
    }
  }

  private applyStoredTheme(): void {
    const storedThemeId = localStorage.getItem('selected_theme') || 'light';
    const theme = this.getTheme(storedThemeId);
    if (theme) {
      this.applyTheme(theme);
    }
  }

  getAllThemes(): Theme[] {
    return [...this.builtInThemes, ...this.customThemes];
  }

  getTheme(id: string): Theme | null {
    return this.getAllThemes().find(theme => theme.id === id) || null;
  }

  getCurrentTheme(): Theme | null {
    return this.currentTheme;
  }

  applyTheme(theme: Theme): void {
    this.currentTheme = theme;
    
    // Apply CSS custom properties
    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = this.camelToKebab(key);
      root.style.setProperty(`--${cssVar}`, value);
    });

    Object.entries(theme.fonts).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const cssVar = this.camelToKebab(key);
        root.style.setProperty(`--font-${cssVar}`, value);
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([sizeKey, sizeValue]) => {
          root.style.setProperty(`--font-size-${sizeKey}`, sizeValue);
        });
      }
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      const cssVar = this.camelToKebab(key);
      root.style.setProperty(`--${cssVar}`, value);
    });

    // Set theme attribute for CSS selectors
    root.setAttribute('data-theme', theme.id);

    // Store selection
    localStorage.setItem('selected_theme', theme.id);

    console.log('Theme applied:', theme.name);
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  async createCustomTheme(
    name: string, 
    description: string, 
    baseThemeId: string,
    customizations: Partial<Theme>
  ): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to create themes');
    }

    const baseTheme = this.getTheme(baseThemeId);
    if (!baseTheme) {
      throw new Error('Base theme not found');
    }

    const customTheme: Theme = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      colors: { ...baseTheme.colors, ...customizations.colors },
      fonts: { ...baseTheme.fonts, ...customizations.fonts },
      spacing: { ...baseTheme.spacing, ...customizations.spacing },
      isBuiltIn: false,
      author: user.uid,
      created: new Date().toISOString()
    };

    this.customThemes.push(customTheme);
    this.saveCustomThemes();

    return customTheme.id;
  }

  updateCustomTheme(id: string, updates: Partial<Theme>): void {
    const themeIndex = this.customThemes.findIndex(theme => theme.id === id);
    if (themeIndex === -1) {
      throw new Error('Custom theme not found');
    }

    const user = authService.getCurrentUser();
    const theme = this.customThemes[themeIndex];
    
    if (theme.author !== user?.uid) {
      throw new Error('You can only edit your own themes');
    }

    this.customThemes[themeIndex] = { ...theme, ...updates };
    this.saveCustomThemes();
  }

  deleteCustomTheme(id: string): void {
    const themeIndex = this.customThemes.findIndex(theme => theme.id === id);
    if (themeIndex === -1) {
      throw new Error('Custom theme not found');
    }

    const user = authService.getCurrentUser();
    const theme = this.customThemes[themeIndex];
    
    if (theme.author !== user?.uid) {
      throw new Error('You can only delete your own themes');
    }

    this.customThemes.splice(themeIndex, 1);
    this.saveCustomThemes();

    // Switch to default theme if deleted theme was active
    if (this.currentTheme?.id === id) {
      this.applyTheme(this.builtInThemes[0]);
    }
  }

  private saveCustomThemes(): void {
    try {
      localStorage.setItem('custom_themes', JSON.stringify(this.customThemes));
    } catch (error) {
      console.error('Error saving custom themes:', error);
    }
  }

  exportTheme(id: string): Blob {
    const theme = this.getTheme(id);
    if (!theme) {
      throw new Error('Theme not found');
    }

    const exportData = {
      ...theme,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  async importTheme(file: File): Promise<string> {
    try {
      const text = await file.text();
      const themeData = JSON.parse(text);

      // Validate theme structure
      if (!this.isValidThemeFormat(themeData)) {
        throw new Error('Invalid theme format');
      }

      // Generate new ID to avoid conflicts
      const importedTheme: Theme = {
        ...themeData,
        id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isBuiltIn: false,
        author: authService.getCurrentUser()?.uid,
        created: new Date().toISOString()
      };

      this.customThemes.push(importedTheme);
      this.saveCustomThemes();

      return importedTheme.id;
    } catch (error) {
      throw new Error(`Failed to import theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isValidThemeFormat(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.name &&
      data.colors &&
      data.fonts &&
      data.spacing &&
      typeof data.colors === 'object' &&
      typeof data.fonts === 'object' &&
      typeof data.spacing === 'object'
    );
  }

  // Node style customization
  getCustomNodeStyles(): CustomNodeStyle[] {
    return this.customNodeStyles;
  }

  createCustomNodeStyle(style: Omit<CustomNodeStyle, 'id'>): string {
    const customStyle: CustomNodeStyle = {
      ...style,
      id: `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.customNodeStyles.push(customStyle);
    this.saveCustomNodeStyles();

    return customStyle.id;
  }

  updateCustomNodeStyle(id: string, updates: Partial<CustomNodeStyle>): void {
    const styleIndex = this.customNodeStyles.findIndex(style => style.id === id);
    if (styleIndex === -1) {
      throw new Error('Custom node style not found');
    }

    this.customNodeStyles[styleIndex] = { ...this.customNodeStyles[styleIndex], ...updates };
    this.saveCustomNodeStyles();
  }

  deleteCustomNodeStyle(id: string): void {
    const styleIndex = this.customNodeStyles.findIndex(style => style.id === id);
    if (styleIndex === -1) {
      throw new Error('Custom node style not found');
    }

    this.customNodeStyles.splice(styleIndex, 1);
    this.saveCustomNodeStyles();
  }

  private saveCustomNodeStyles(): void {
    try {
      localStorage.setItem('custom_node_styles', JSON.stringify(this.customNodeStyles));
    } catch (error) {
      console.error('Error saving custom node styles:', error);
    }
  }

  // Auto theme detection
  detectSystemTheme(): 'light' | 'dark' {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  enableAutoTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e: MediaQueryListEvent) => {
      const themeId = e.matches ? 'dark' : 'light';
      const theme = this.getTheme(themeId);
      if (theme) {
        this.applyTheme(theme);
      }
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Apply initial theme
    const initialThemeId = this.detectSystemTheme();
    const initialTheme = this.getTheme(initialThemeId);
    if (initialTheme) {
      this.applyTheme(initialTheme);
    }

    localStorage.setItem('auto_theme_enabled', 'true');
  }

  disableAutoTheme(): void {
    localStorage.removeItem('auto_theme_enabled');
    // Remove event listener would require storing the reference
  }

  isAutoThemeEnabled(): boolean {
    return localStorage.getItem('auto_theme_enabled') === 'true';
  }
}

export const themeService = new ThemeService();
export default themeService;
