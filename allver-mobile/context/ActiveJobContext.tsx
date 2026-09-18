import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import SocketService from '../utils/SocketService';
import { BACKEND_URL } from '../constants/Config';
import { getToken, getStoredUser } from '../constants/Auth';

export const isAuthOrPublicRoute = (pathname?: string | null, segments?: string[]): boolean => {
  if (segments && segments.length > 0) {
    const first = segments[0]?.toLowerCase().replace(/^\//, '');
    if (['login', 'signup', 'choose-language', 'index', 'about', 'contact', 'privacy-policy', 'terms'].includes(first)) {
      return true;
    }
  }

  if (!pathname || pathname === '/' || pathname === '') {
    return true; // Root splash / initial index route
  }

  const cleanPath = pathname.toLowerCase().split('?')[0].split('#')[0];
  const publicPaths = [
    '/login',
    '/signup',
    '/choose-language',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms',
    '/index',
  ];

  return publicPaths.some(p => cleanPath === p || cleanPath.startsWith(p + '/'));
};

interface ActiveJobContextType {
  activeJob: any | null;
  activeJobUserId: string | null;
  isLoading: boolean;
  userRole: string;
  checkActiveJob: (forceUser?: any) => Promise<any | null>;
  clearActiveJob: () => void;
  setActiveJob: React.Dispatch<React.SetStateAction<any | null>>;
}

const ActiveJobContext = createContext<ActiveJobContextType | undefined>(undefined);

// Global event bus for non-React callers (e.g. logout in Auth.ts or profile.tsx)
type ActiveJobClearListener = () => void;
const clearListeners = new Set<ActiveJobClearListener>();

export const notifyClearActiveJob = () => {
  clearListeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.warn('[ActiveJobContext] Error in clearListener:', e);
    }
  });
};

export const ActiveJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const segments = useSegments();

  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [activeJobUserId, setActiveJobUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Keep a ref to activeJob and activeJobUserId for synchronous checks
  const activeJobRef = useRef<any | null>(null);
  activeJobRef.current = activeJob;
  const activeJobUserIdRef = useRef<string | null>(null);
  activeJobUserIdRef.current = activeJobUserId;

  const clearActiveJob = useCallback(() => {
    console.log('[ActiveJobContext] clearActiveJob called. Clearing all active job state.');
    setActiveJob(null);
    setActiveJobUserId(null);
    activeJobRef.current = null;
    activeJobUserIdRef.current = null;
  }, []);

  // Register with global clear notifier
  useEffect(() => {
    clearListeners.add(clearActiveJob);
    return () => {
      clearListeners.delete(clearActiveJob);
    };
  }, [clearActiveJob]);

  const checkActiveJob = useCallback(async (forceUser?: any): Promise<any | null> => {
    // 1. NEVER check active job on auth or public screens
    if (isAuthOrPublicRoute(pathname, segments)) {
      console.log('[ActiveJobContext] Skipping checkActiveJob on auth/public screen:', pathname);
      if (activeJobRef.current !== null) {
        clearActiveJob();
      }
      return null;
    }

    try {
      setIsLoading(true);

      // 2. Resolve current authenticated user
      let user = forceUser || (global as any).currentUser;
      if (!user) {
        const stored = await getStoredUser();
        if (stored) {
          try {
            user = typeof stored === 'string' ? JSON.parse(stored) : stored;
            (global as any).currentUser = user;
          } catch (e) {}
        }
      }

      // If no authenticated user, immediately wipe active job and abort
      if (!user || !user._id) {
        console.log('[ActiveJobContext] No authenticated user. Clearing active job state.');
        clearActiveJob();
        return null;
      }

      // Verify user isolation: If existing activeJob belongs to another user, clear it immediately
      if (activeJobUserIdRef.current && activeJobUserIdRef.current !== user._id) {
        console.log(`[ActiveJobContext] User mismatch (was ${activeJobUserIdRef.current}, now ${user._id}). Clearing active job.`);
        clearActiveJob();
      }

      const role = user.role || 'Client';
      setUserRole(role);

      const token = await getToken();
      if (!token) {
        console.log('[ActiveJobContext] No auth token found. Clearing active job state.');
        clearActiveJob();
        return null;
      }

      const endpoint = role === 'Labour' || role === 'Contractor'
        ? `${BACKEND_URL}/api/worker/active-job`
        : `${BACKEND_URL}/api/customer/active-job`;

      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      let foundJob = null;
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hasActiveJob && data.activeJob) {
          foundJob = data.activeJob;
        }
      } else if (res.status === 401 || res.status === 403) {
        // Token expired / invalid
        console.warn('[ActiveJobContext] Token invalid (401/403). Clearing active job.');
        clearActiveJob();
        return null;
      }

      // Fallback check by user ID only if token query didn't find one and server allows
      if (!foundJob && user._id) {
        try {
          const fallbackRes = await fetch(`${BACKEND_URL}/api/jobs/active/user/${user._id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.success && fallbackData.hasActiveJob && fallbackData.activeJob) {
              foundJob = fallbackData.activeJob;
            }
          }
        } catch (fbErr) {}
      }

      if (foundJob) {
        setActiveJob(foundJob);
        setActiveJobUserId(user._id);
        activeJobRef.current = foundJob;
        activeJobUserIdRef.current = user._id;
      } else {
        clearActiveJob();
      }

      return foundJob;
    } catch (err) {
      console.warn('[ActiveJobContext] Check active job error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [pathname, segments, clearActiveJob]);

  // Route transition guard: When transitioning to an auth or public route, immediately clear active job state
  useEffect(() => {
    if (isAuthOrPublicRoute(pathname, segments)) {
      if (activeJob !== null) {
        console.log('[ActiveJobContext] Navigated to auth/public route. Resetting active job state.');
        clearActiveJob();
      }
    } else {
      // Authenticated screen: Check/restore active job
      checkActiveJob();
    }
  }, [pathname, segments, isAuthOrPublicRoute, clearActiveJob, checkActiveJob]);

  // AppState & Socket subscriptions (ONLY active when authenticated)
  useEffect(() => {
    if (isAuthOrPublicRoute(pathname, segments)) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !isAuthOrPublicRoute(pathname, segments)) {
        checkActiveJob();
      }
    });

    const onJobStatusChanged = () => {
      if (!isAuthOrPublicRoute(pathname, segments)) {
        checkActiveJob();
      }
    };

    SocketService.on('connect', onJobStatusChanged);
    SocketService.on('reconnect', onJobStatusChanged);
    SocketService.on('job_status_changed', onJobStatusChanged);
    SocketService.on('job_payment_completed', onJobStatusChanged);
    SocketService.on('job_cancelled', onJobStatusChanged);
    SocketService.on('booking_notification', onJobStatusChanged);

    return () => {
      subscription.remove();
      SocketService.off('connect', onJobStatusChanged);
      SocketService.off('reconnect', onJobStatusChanged);
      SocketService.off('job_status_changed', onJobStatusChanged);
      SocketService.off('job_payment_completed', onJobStatusChanged);
      SocketService.off('job_cancelled', onJobStatusChanged);
      SocketService.off('booking_notification', onJobStatusChanged);
    };
  }, [pathname, segments, checkActiveJob]);

  return (
    <ActiveJobContext.Provider
      value={{
        activeJob,
        activeJobUserId,
        isLoading,
        userRole,
        checkActiveJob,
        clearActiveJob,
        setActiveJob,
      }}
    >
      {children}
    </ActiveJobContext.Provider>
  );
};

export const useActiveJob = (): ActiveJobContextType => {
  const context = useContext(ActiveJobContext);
  if (!context) {
    throw new Error('useActiveJob must be used within an ActiveJobProvider');
  }
  return context;
};
