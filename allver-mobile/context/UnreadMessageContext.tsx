import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import SocketService from '../utils/SocketService';
import { BACKEND_URL } from '../constants/Config';

interface UnreadMessageContextType {
  unreadMsgCount: number;
  setUnreadMsgCount: (count: number) => void;
  decrementUnreadMsgCount: (amount: number) => void;
  refreshUnreadMsgCount: () => Promise<void>;
}

const UnreadMessageContext = createContext<UnreadMessageContextType | undefined>(undefined);

export const UnreadMessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user from local storage / global state
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

  const refreshUnreadMsgCount = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/unread-total/${currentUserId}`);
      const data = await res.json();
      if (data.success) {
        setUnreadMsgCount(data.totalUnread || 0);
        console.log('[UnreadMessageContext] Refreshed total unread message count:', data.totalUnread);
      }
    } catch (err) {
      console.log('[UnreadMessageContext] Error refreshing unread count:', err);
    }
  }, [currentUserId]);

  const decrementUnreadMsgCount = useCallback((amount: number) => {
    setUnreadMsgCount(prev => Math.max(0, prev - amount));
  }, []);

  // Reload user and initial count when session boots or changes
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (currentUserId) {
      refreshUnreadMsgCount();
    } else {
      setUnreadMsgCount(0);
    }
  }, [currentUserId, refreshUnreadMsgCount]);

  // Listen to Socket.IO events globally
  useEffect(() => {
    if (!currentUserId) return;

    // Track recently processed message IDs to prevent double-counting
    // (backend emits to both conversation room and personal user rooms)
    const processedMessageIds = new Set<string>();

    const handleIncomingMessage = (data: any) => {
      const workspaceId = data.workspaceId || data.conversationId;
      const message = data.message;
      if (!message) return;

      // Deduplicate: skip if we already processed this message
      const msgId = message._id || `${workspaceId}-${message.createdAt}`;
      if (processedMessageIds.has(msgId)) {
        return;
      }
      processedMessageIds.add(msgId);
      // Auto-expire after 5 seconds to prevent memory leak
      setTimeout(() => processedMessageIds.delete(msgId), 5000);

      // Extract sender ID
      const sender = message.sender;
      const senderId = sender && typeof sender === 'object' ? sender._id : sender;

      // 1. Skip if the message was sent by the current user
      if (senderId === currentUserId) {
        return;
      }

      // 2. Skip if the current user is active inside the chat room
      const activeChatRoomId = (global as any).activeChatRoomId;
      if (activeChatRoomId && activeChatRoomId.toString() === workspaceId?.toString()) {
        return;
      }

      // Increment unread count instantly
      console.log('[UnreadMessageContext] Incrementing global unread message count by 1');
      setUnreadMsgCount(prev => prev + 1);
    };

    // Listen on receive_message and new_dm_notification
    SocketService.on('receive_message', handleIncomingMessage);
    SocketService.on('new_dm_notification', handleIncomingMessage);

    return () => {
      SocketService.off('receive_message', handleIncomingMessage);
      SocketService.off('new_dm_notification', handleIncomingMessage);
    };
  }, [currentUserId]);

  return (
    <UnreadMessageContext.Provider value={{
      unreadMsgCount,
      setUnreadMsgCount,
      decrementUnreadMsgCount,
      refreshUnreadMsgCount
    }}>
      {children}
    </UnreadMessageContext.Provider>
  );
};

export const useUnreadMessages = () => {
  const context = useContext(UnreadMessageContext);
  if (context === undefined) {
    throw new Error('useUnreadMessages must be used within an UnreadMessageProvider');
  }
  return context;
};
