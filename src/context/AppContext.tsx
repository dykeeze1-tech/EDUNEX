import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../utils/apiFetch';

export interface UserData {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: 'student' | 'super_admin' | 'content_admin' | 'academic_admin' | 'community_moderator';
  department: string;
  country: string;
  date_of_birth: string | null;
  is_minor: number;
  bio: string;
  academic_interests: string;
  avatar_url: string;
  cover_url: string;
  profile_visibility: string;
  public_display_name?: string;
  leaderboard_consent?: number;
  leaderboard_hidden?: number;
  email_verified: number;
  status: string;
  notification_prefs: Record<string, boolean>;
  dashboard_prefs: {
    theme: 'light' | 'dark';
    accent: string;
    density: 'spacious' | 'compact';
    textSize: 'normal' | 'large';
    highContrast: boolean;
    reducedMotion: boolean;
    widgets: string[];
  };
  created_at: string;
}

export interface SiteAppearance {
  primaryColor?: string;
  accentCyan?: string;
  navyColor?: string;
  bannerText?: string;
  showBanner?: boolean;
  showStatsSection?: boolean;
  showFrameworksSection?: boolean;
  showSubjectsSection?: boolean;
  showAiSection?: boolean;
  showLeaderboardSection?: boolean;
  showTestimonialsSection?: boolean;
  showCommunitySection?: boolean;
  featuredSubjectIds?: number[];
  examPageIntro?: string;
}

export interface BootstrapData {
  mediaSlots: Record<string, any>;
  cmsBlocks: Record<string, any>;
  siteAppearance?: SiteAppearance;
  announcements?: any[];
  stats: {
    studentsCount: number;
    subjectsCount: number;
    examinationsCount: number;
    certificatesCount: number;
    questionsCount: number;
    videosCount: number;
    materialsCount?: number;
  };
  subjects: any[];
  examinations: any[];
  testimonials: any[];
  faqs: any[];
  videos: any[];
  learningMaterials?: any[];
  leaderboard: any[];
  programmes: any[];
}

interface AppContextValue {
  user: UserData | null;
  authLoading: boolean;
  bootstrap: BootstrapData | null;
  bootstrapLoading: boolean;
  previewMode: boolean;
  refreshUser: () => Promise<void>;
  refreshBootstrap: (forceDraftPreview?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshBootstrap = useCallback(async (forceDraftPreview?: boolean) => {
    try {
      const isDraftQuery =
        forceDraftPreview ??
        (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'draft');
      setPreviewMode(Boolean(isDraftQuery));
      const url = isDraftQuery ? '/api/public/bootstrap?preview=draft' : '/api/public/bootstrap';
      const res = await apiFetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBootstrap(data);
      }
    } catch (err) {
      console.error('Bootstrap load error:', err);
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    refreshBootstrap();
  }, [refreshUser, refreshBootstrap]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      sessionStorage.removeItem('edunexa_token');
      sessionStorage.removeItem('edunexa_pending_verify_code');
      setUser(null);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        bootstrap,
        bootstrapLoading,
        previewMode,
        refreshUser,
        refreshBootstrap,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
