import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AIService, ChatMessage } from '../ai/AIService';
import { ActionRouter } from '../ai/ActionRouter';
import { VoiceService } from '../ai/VoiceService';
import { AIAnalytics } from '../ai/AIAnalytics';
import { PlannerSessionState } from '../ai/planners/AgentPlanner';
import { LabourPlanner, ContractorPlanner, ClientPlanner, ArchitectPlanner } from '../ai/planners/RolePlanners';
import { AgentExecutor } from '../ai/planners/AgentExecutor';

const getPlannerForRole = (role: string) => {
  switch (role) {
    case 'Labour':
      return new LabourPlanner();
    case 'Contractor':
      return new ContractorPlanner();
    case 'Client':
      return new ClientPlanner();
    case 'Architect':
      return new ArchitectPlanner();
    default:
      return new ClientPlanner();
  }
};

const isPlannerGoal = (goal: any, role: string) => {
  return (goal === 'MARK_ATTENDANCE' && (role === 'Labour' || role === 'Contractor')) ||
         (goal === 'SEND_MESSAGE_TO_WORKER') ||
         (goal === 'GET_DAILY_PROGRESS') ||
         (goal === 'SEARCH_WORKERS');
};

const { width, height } = Dimensions.get('window');

interface Props {
  userRole?: string;
  userName?: string;
  userId?: string;
}

export default function AIAssistantFloatingButton({ userRole = 'Client', userName = 'User', userId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Agent Planner Session State
  const [plannerSession, setPlannerSession] = useState<PlannerSessionState | null>(null);
  const [progressLogs, setProgressLogs] = useState<Array<{ text: string, status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'WAITING' }>>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(height)).current; // starts offscreen
  const floatAnim = useRef(new Animated.Value(0)).current; // floating idle animation

  // Idle floating animation for the button
  useEffect(() => {
    const floatUp = Animated.timing(floatAnim, {
      toValue: -6,
      duration: 1500,
      useNativeDriver: true,
    });
    const floatDown = Animated.timing(floatAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    });
    
    Animated.loop(Animated.sequence([floatUp, floatDown])).start();
  }, []);

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assist-msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content,
        timestamp: new Date()
      }
    ]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };





  // Initialize with a welcome message based on role
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello ${userName}! I am your Allver AI Assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [userName]);

  // Open/Close Bottom Sheet Animation
  const toggleAssistant = (open: boolean) => {
    if (open) {
      setIsOpen(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
      VoiceService.stopListening();
      setIsListening(false);
    }
  };

  // Get dynamic suggestions depending on user role
  const getSuggestions = () => {
    switch (userRole) {
      case 'Client':
        return [
          { text: '🔍 Find contractors near me', query: 'find contractors' },
          { text: '📊 Compare estimates', query: 'compare estimates' },
          { text: '🏡 Show modern designs', query: 'show modern designs' },
        ];
      case 'Contractor':
        return [
          { text: '💼 View new projects', query: 'view active projects' },
          { text: '👷 Check my team status', query: 'check my team' },
          { text: '✏️ Update my portfolio', query: 'update my portfolio' },
        ];
      case 'Labour':
        return [
          { text: '🔨 Find jobs near me', query: 'find construction jobs' },
          { text: '📸 Show my portfolio highlights', query: 'show my portfolio highlights' },
        ];
      case 'Architect':
        return [
          { text: '📐 Show similar designs', query: 'show similar designs' },
          { text: '✨ Manage portfolio uploads', query: 'manage portfolio highlights' },
        ];
      default:
        return [
          { text: '🔍 Find contractors', query: 'find contractors' },
          { text: '🏡 Explore designs', query: 'show designs' },
        ];
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    const startTime = Date.now();

    // Agent Planner Multi-step Turn execution loop
    if (plannerSession) {
      try {
        setProgressLogs([]);
        const usePlanner = isPlannerGoal(plannerSession.currentGoal!, userRole);
        let result;
        if (usePlanner) {
          result = await AgentExecutor.execute(
            plannerSession.currentGoal!,
            plannerSession.params,
            textToSend,
            plannerSession,
            { userId: userId || '', userName, userRole },
            (stepText, status) => {
              setProgressLogs(prev => {
                const existingIdx = prev.findIndex(item => item.text.replace(/^[🤖✅❌]/, '').trim() === stepText.replace(/^[🤖✅❌]/, '').trim());
                if (existingIdx > -1) {
                  const updated = [...prev];
                  updated[existingIdx] = { text: stepText, status };
                  return updated;
                } else {
                  return [...prev, { text: stepText, status }];
                }
              });
            }
          );
        } else {
          const planner = getPlannerForRole(userRole);
          result = await planner.execute(
            plannerSession.currentGoal!,
            plannerSession.params,
            textToSend,
            plannerSession,
            { userId: userId || '', userName, userRole }
          );
        }

        if (result.isComplete) {
          setProgressLogs(prev => [...prev, { text: 'Done.', status: 'SUCCESS' }]);
          setTimeout(() => setProgressLogs([]), 4000);
        }

        const responseTime = Date.now() - startTime;

        const replyMsg: ChatMessage = {
          id: `assist-msg-${Date.now()}`,
          role: 'assistant',
          content: result.responseText,
          timestamp: new Date(),
          action: result.suggestions ? { type: 'AMBIGUOUS' as any, suggestions: result.suggestions } : result.action,
          attendanceSuccessCard: result.attendanceSuccessCard,
          contractorAttendanceSuccessCard: result.contractorAttendanceSuccessCard,
          jobPostSuccessCard: result.jobPostSuccessCard,
          messageSuccessCard: result.messageSuccessCard,
        };

        setMessages((prev) => [...prev, replyMsg]);
        setIsTyping(false);
        VoiceService.speak(result.responseText);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        if (result.isComplete) {
          setPlannerSession(null);
          AIAnalytics.logAction(userName, userRole, textToSend, plannerSession.currentGoal, 1.0, responseTime, true);
        } else {
          setPlannerSession({ ...plannerSession }); // update session state reference
        }
      } catch (err: any) {
        console.error('[AgentPlanner] Execution Error:', err);
        setIsTyping(false);
        appendAssistantMessage(`Sorry, I encountered an error during task planning: ${err.message || err}`);
      }
      return;
    }



    // Secret developer analytics display command
    if (textToSend.toLowerCase().trim() === 'analytics') {
      const stats = AIAnalytics.getStats();
      const statsText = `📊 *Allver AI Assistant Analytics*\n\n• *Total Queries*: ${stats.totalCount}\n• *Success Rate*: ${stats.successRate}%\n• *Avg Latency*: ${stats.averageResponseTimeMs}ms\n• *Most Used Command*: ${stats.mostUsedAction}\n• *Failed/Low Confidence Intents*: ${stats.failedIntentsCount}`;
      
      setTimeout(() => {
        const analyticsReply: ChatMessage = {
          id: `analytics-${Date.now()}`,
          role: 'assistant',
          content: statsText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, analyticsReply]);
        setIsTyping(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }, 350);
      return;
    }

    try {
      // Get AI reply & classified action from Gemini
      const reply = await AIService.sendMessage(
        [...messages, userMsg],
        textToSend,
        {
          fullName: userName,
          role: userRole,
          city: 'Not Specified',
          language: (global as any).localLanguage || 'English',
          timestamp: new Date().toISOString()
        }
      );

      const responseTime = Date.now() - startTime;

      if (reply.action && reply.action.type !== 'AMBIGUOUS' as any) {
        setProgressLogs([]);
        // Instantiate the Agent Planner/Executor for the role
        const usePlanner = isPlannerGoal(reply.action.type, userRole);
        const newSession: PlannerSessionState = {
          currentGoal: reply.action.type,
          stepIndex: 0,
          params: reply.action.parameters || {},
        };

        console.log(`[AgentExecutor] Running execution for goal ${reply.action.type}...`);
        let result;
        if (usePlanner) {
          result = await AgentExecutor.execute(
            reply.action.type,
            reply.action.parameters || {},
            null,
            newSession,
            { userId: userId || '', userName, userRole },
            (stepText, status) => {
              setProgressLogs(prev => {
                const existingIdx = prev.findIndex(item => item.text.replace(/^[🤖✅❌]/, '').trim() === stepText.replace(/^[🤖✅❌]/, '').trim());
                if (existingIdx > -1) {
                  const updated = [...prev];
                  updated[existingIdx] = { text: stepText, status };
                  return updated;
                } else {
                  return [...prev, { text: stepText, status }];
                }
              });
            }
          );
        } else {
          const planner = getPlannerForRole(userRole);
          result = await planner.execute(
            reply.action.type,
            reply.action.parameters || {},
            null,
            newSession,
            { userId: userId || '', userName, userRole }
          );
        }

        if (result.isComplete) {
          setProgressLogs(prev => [...prev, { text: 'Done.', status: 'SUCCESS' }]);
          setTimeout(() => setProgressLogs([]), 4000);
        }

        const replyMsg: ChatMessage = {
          id: `assist-msg-${Date.now()}`,
          role: 'assistant',
          content: result.responseText,
          timestamp: new Date(),
          action: result.suggestions ? { type: 'AMBIGUOUS' as any, suggestions: result.suggestions } : (result.action || reply.action),
          attendanceSuccessCard: result.attendanceSuccessCard,
          contractorAttendanceSuccessCard: result.contractorAttendanceSuccessCard,
          jobPostSuccessCard: result.jobPostSuccessCard,
          messageSuccessCard: result.messageSuccessCard,
        };

        setMessages((prev) => [...prev, replyMsg]);
        setIsTyping(false);
        VoiceService.speak(result.responseText);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        if (!result.isComplete) {
          setPlannerSession(newSession);
        } else {
          AIAnalytics.logAction(
            userName,
            userRole,
            textToSend,
            reply.action.type,
            reply.action.confidence || 1.0,
            responseTime,
            true
          );
        }
      } else {
        // Conversational/Ambiguous responses fallback
        setMessages((prev) => [...prev, reply]);
        setIsTyping(false);
        VoiceService.speak(reply.content);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        AIAnalytics.logAction(
          userName,
          userRole,
          textToSend,
          null,
          0.0,
          responseTime,
          false
        );
      }
    } catch (err) {
      console.error('[AgentPlanner] Classification execution error:', err);
      setIsTyping(false);
      
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error executing task planning. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

      const responseTime = Date.now() - startTime;
      AIAnalytics.logAction(
        userName,
        userRole,
        textToSend,
        null,
        0.0,
        responseTime,
        false
      );
    }
  };

  const handleMicPress = () => {
    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      VoiceService.startListening((resultText) => {
        setIsListening(false);
        handleSendMessage(resultText);
      });
    }
  };

  return (
    <>
      {/* Floating Sparkle Button */}
      <Animated.View
        style={[
          styles.floatingBtnWrap,
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.floatingBtn}
          activeOpacity={0.8}
          onPress={() => toggleAssistant(true)}
        >
          <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Sheet Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => toggleAssistant(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Tap outside area */}
          <TouchableOpacity
            style={styles.dismissArea}
            activeOpacity={1}
            onPress={() => toggleAssistant(false)}
          />

          <Animated.View
            style={[
              styles.sheetContainer,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Grabber indicator */}
            <View style={styles.grabber} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.aiIconBadge}>
                  <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Allver AI Assistant</Text>
                  <Text style={styles.headerSubtitle}>Provider-agnostic AI Framework</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleAssistant(false)}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
              {/* Message scroll view */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.msgRow,
                      item.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant,
                    ]}
                  >
                    {item.role === 'assistant' && (
                      <View style={styles.msgAvatar}>
                        <MaterialCommunityIcons name="robot" size={12} color="#FFFFFF" />
                      </View>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                      ]}
                    >
                      <Text
                        style={[
                          styles.msgText,
                          item.role === 'user' ? styles.msgTextUser : styles.msgTextAssistant,
                        ]}
                      >
                        {item.content}
                      </Text>

                      {/* Display alternative option suggestions inside the message bubble */}
                      {item.role === 'assistant' && item.action?.suggestions && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {item.action.suggestions.map((suggestion, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={{
                                backgroundColor: '#EEF2F6',
                                borderColor: '#CBD5E1',
                                borderWidth: 1,
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                              }}
                              onPress={() => handleSendMessage(suggestion)}
                              activeOpacity={0.7}
                            >
                              <Text style={{ fontSize: 10, color: '#334155', fontWeight: '700' }}>
                                {suggestion}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Attendance Success Card */}
                      {item.attendanceSuccessCard && (
                        <View style={{
                          backgroundColor: '#F0FDF4',
                          borderColor: '#DCFCE7',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 10,
                          marginTop: 8,
                          minWidth: width * 0.65,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#14532D' }}>
                              {item.attendanceSuccessCard.checkType.toUpperCase()} SUCCESSFUL
                            </Text>
                          </View>
                          
                          <View style={{ gap: 4 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Site:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.attendanceSuccessCard.projectName}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Time:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.attendanceSuccessCard.time}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Coordinates:</Text>
                              <Text style={{ fontSize: 9, color: '#14532D', fontWeight: '700' }}>
                                {item.attendanceSuccessCard.lat.toFixed(4)}, {item.attendanceSuccessCard.lng.toFixed(4)}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Address:</Text>
                              <Text style={{ fontSize: 9, color: '#14532D', fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 8 }} numberOfLines={1}>
                                {item.attendanceSuccessCard.address}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Contractor Attendance Success Card */}
                      {item.contractorAttendanceSuccessCard && (
                        <View style={{
                          backgroundColor: '#F0FDF4',
                          borderColor: '#DCFCE7',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 10,
                          marginTop: 8,
                          minWidth: width * 0.65,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#14532D' }}>
                              ATTENDANCE LOGGED
                            </Text>
                          </View>
                          
                          <View style={{ gap: 4 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Worker:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.contractorAttendanceSuccessCard.workerName}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Site:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.contractorAttendanceSuccessCard.projectName}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Type:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.contractorAttendanceSuccessCard.dayType}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Status:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.contractorAttendanceSuccessCard.status}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '500' }}>Hours Logged:</Text>
                              <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>{item.contractorAttendanceSuccessCard.hours} hrs</Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Job Post Success Card */}
                      {item.jobPostSuccessCard && (
                        <View style={{
                          backgroundColor: '#EFF6FF',
                          borderColor: '#DBEAFE',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 10,
                          marginTop: 8,
                          minWidth: width * 0.65,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF' }}>
                              JOB POSTING CREATED
                            </Text>
                          </View>
                          
                          <View style={{ gap: 4 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Title:</Text>
                              <Text style={{ fontSize: 10, color: '#1E3A8A', fontWeight: '700' }}>{item.jobPostSuccessCard.title}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Profession:</Text>
                              <Text style={{ fontSize: 10, color: '#1E3A8A', fontWeight: '700' }}>{item.jobPostSuccessCard.projectType}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Location:</Text>
                              <Text style={{ fontSize: 10, color: '#1E3A8A', fontWeight: '700' }}>{item.jobPostSuccessCard.location}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Budget:</Text>
                              <Text style={{ fontSize: 10, color: '#1E3A8A', fontWeight: '700' }}>{item.jobPostSuccessCard.budget}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Description:</Text>
                              <Text style={{ fontSize: 9, color: '#1E3A8A', fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 8 }} numberOfLines={2}>
                                {item.jobPostSuccessCard.description}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                      {/* Message Success Card */}
                      {item.messageSuccessCard && (
                        <View style={{
                          backgroundColor: '#F5F3FF',
                          borderColor: '#DDD6FE',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 10,
                          marginTop: 8,
                          minWidth: width * 0.65,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Ionicons name="chatbubble-ellipses" size={18} color="#7C3AED" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6D28D9' }}>
                              MESSAGE SENT SUCCESSFULLY
                            </Text>
                          </View>
                          
                          <View style={{ gap: 4 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '500' }}>To Worker:</Text>
                              <Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '700' }}>{item.messageSuccessCard.workerName}</Text>
                            </View>
                            {item.messageSuccessCard.projectName && (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '500' }}>Project Site:</Text>
                                <Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '700' }}>{item.messageSuccessCard.projectName}</Text>
                              </View>
                            )}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '500' }}>Time Sent:</Text>
                              <Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '700' }}>{item.messageSuccessCard.timestamp}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '500' }}>Message Text:</Text>
                              <Text style={{ fontSize: 9, color: '#5B21B6', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 }} numberOfLines={2}>
                                "{item.messageSuccessCard.text}"
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <View style={[styles.msgRow, styles.msgRowAssistant]}>
                    <View style={styles.msgAvatar}>
                      <MaterialCommunityIcons name="robot" size={12} color="#FFFFFF" />
                    </View>
                    <View style={[styles.bubble, styles.bubbleAssistant, { paddingHorizontal: 16 }]}>
                      <ActivityIndicator size="small" color="#4F46E5" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Suggestion Chips */}
              <View style={styles.suggestionsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                  {getSuggestions().map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSendMessage(item.query)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Task Monitor UI */}
              {progressLogs.length > 0 && (
                <View style={{
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  gap: 6
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 2 }}>
                    AGENT TASK MONITOR
                  </Text>
                  {progressLogs.map((log, index) => {
                    const isPending = log.status === 'RUNNING';
                    const isFailed = log.status === 'FAILED';
                    const isDone = log.status === 'SUCCESS';
                    
                    let iconColor = '#64748B';
                    if (isPending) iconColor = '#3B82F6';
                    if (isFailed) iconColor = '#EF4444';
                    if (isDone) iconColor = '#10B981';

                    return (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {isPending ? (
                          <ActivityIndicator size="small" color="#3B82F6" style={{ width: 14, height: 14 }} />
                        ) : (
                          <Ionicons 
                            name={isFailed ? "close-circle" : (isDone ? "checkmark-circle" : "alert-circle")} 
                            size={14} 
                            color={iconColor} 
                          />
                        )}
                        <Text style={{
                          fontSize: 11,
                          color: isFailed ? '#EF4444' : (isDone ? '#0F172A' : '#475569'),
                          fontWeight: isDone ? '600' : '400'
                        }}>
                          {log.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Input box */}
              <View style={styles.inputContainer}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={isListening ? 'Listening...' : 'Type a query...'}
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  onSubmitEditing={() => handleSendMessage(inputText)}
                  editable={!isListening}
                />
                
                {/* Voice Record Toggle Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtnCircle,
                    isListening && { backgroundColor: '#EF4444' },
                  ]}
                  onPress={handleMicPress}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={isListening ? 'square' : 'mic'}
                    size={16}
                    color={isListening ? '#FFFFFF' : '#475569'}
                  />
                </TouchableOpacity>

                {/* Send Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtnCircle,
                    { backgroundColor: inputText.trim() ? '#4F46E5' : '#F1F5F9' },
                  ]}
                  onPress={() => handleSendMessage(inputText)}
                  disabled={!inputText.trim()}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="send"
                    size={16}
                    color={inputText.trim() ? '#FFFFFF' : '#94A3B8'}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingBtnWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    right: 16,
    zIndex: 9999,
  },
  floatingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5', // premium indigo for AI assistant
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E', // green online dot
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // glassmorphism overlay background
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    height: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  msgRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    maxWidth: '85%',
  },
  msgRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgRowAssistant: {
    alignSelf: 'flex-start',
  },
  msgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#4F46E5',
    borderTopRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  msgTextAssistant: {
    color: '#1E293B',
  },
  suggestionsContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    backgroundColor: '#FFFFFF',
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  suggestionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#1E293B',
  },
  actionBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
