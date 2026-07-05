import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import SocketService from '../utils/SocketService';
import { BACKEND_URL } from '../constants/Config';

interface UnreadActivityContextType {
  unreadActivityCount: number;
  setUnreadActivityCount: (count: number) => void;
  decrementUnreadActivityCount: (amount: number) => void;
  refreshUnreadActivityCount: () => Promise<void>;
}

const UnreadActivityContext = createContext<UnreadActivityContextType | undefined>(undefined);

export const UnreadActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          user = JSON.parse(stored);
        } catch (e) {}
      }
    }
    if (user && user._id) {
      setCurrentUserId(user._id);
    } else {
      setCurrentUserId(null);
    }
  }, []);

  const isProjectRelated = (text: string) => {
    const t = text || '';
    return t.includes('New Project') ||
           t.includes('[View Project]') ||
           t.includes('Applied') ||
           t.includes('[View Application]') ||
           t.includes('Project Invitation') ||
           t.includes('[View Invitation]') ||
           t.includes('Submitted Design') ||
           t.includes('[View Design]') ||
           t.includes('Labour Joined') ||
           t.includes('Joined Project') ||
           t.includes('Payment Received') ||
           t.includes('[View Details]') ||
           t.includes('Attendance Submitted') ||
           t.includes('[View Attendance]') ||
           t.includes('Milestone') ||
           t.includes('[View Progress]') ||
           t.includes('Document Shared') ||
           t.includes('[View Document]') ||
           t.includes('Site Visit') ||
           t.includes('[View Schedule]');
  };

  const refreshUnreadActivityCount = useCallback(async () => {
    let user = (global as any).currentUser;
    let userId = user?._id || currentUserId;
    if (!userId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/${userId}`);
      const data = await res.json();
      if (data.success && data.notifications) {
        const unreadJobs = data.notifications.filter((n: any) => {
          return isProjectRelated(n.text) && !n.isRead;
        });
        setUnreadActivityCount(unreadJobs.length);
        console.log('[UnreadActivityContext] Refreshed unread activities count:', unreadJobs.length);
      }
    } catch (err) {
      console.log('[UnreadActivityContext] Error refreshing unread activities count:', err);
    }
  }, [currentUserId]);

  const decrementUnreadActivityCount = useCallback((amount: number) => {
    setUnreadActivityCount(prev => Math.max(0, prev - amount));
  }, []);

  // Reload user and initial count when session boots or changes
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const userId = currentUserId || (global as any).currentUser?._id;
    if (userId) {
      refreshUnreadActivityCount();
    } else {
      setUnreadActivityCount(0);
    }
  }, [currentUserId, refreshUnreadActivityCount]);

  // Listen to Socket.IO events globally
  useEffect(() => {
    const userId = currentUserId || (global as any).currentUser?._id;
    if (!userId) return;

    const handleIncomingNotification = (data: any) => {
      if (!data) return;

      // Extract sender ID
      const sender = data.senderId;
      const senderId = sender && typeof sender === 'object' ? sender._id : sender;

      // 1. Skip if the notification was sent by the current user
      if (senderId === userId) {
        return;
      }

      // 2. Skip if the user is currently viewing the relevant workspace/project where the activity occurs
      const activeWorkspaceId = (global as any).activeWorkspaceId;
      if (activeWorkspaceId && data.text?.includes(activeWorkspaceId)) {
        return;
      }

      // 3. Only increment if it's a project/activity related notification
      if (isProjectRelated(data.text)) {
        console.log('[UnreadActivityContext] Incrementing global unread activity count by 1. Text:', data.text);
        setUnreadActivityCount(prev => prev + 1);
      }
    };

    // Listen on new_notification
    SocketService.on('new_notification', handleIncomingNotification);

    return () => {
      SocketService.off('new_notification', handleIncomingNotification);
    };
  }, [currentUserId]);

  return (
    <UnreadActivityContext.Provider value={{
      unreadActivityCount,
      setUnreadActivityCount,
      decrementUnreadActivityCount,
      refreshUnreadActivityCount
    }}>
      {children}
    </UnreadActivityContext.Provider>
  );
};

export const useUnreadActivities = () => {
  const context = useContext(UnreadActivityContext);
  if (context === undefined) {
    throw new Error('useUnreadActivities must be used within an UnreadActivityProvider');
  }
  return context;
};
