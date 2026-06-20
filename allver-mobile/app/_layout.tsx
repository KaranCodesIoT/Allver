import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { Video, ResizeMode } from 'expo-av';

// Keep the splash screen visible until we hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [stage, setStage] = useState<'splash' | 'video' | 'ready'>('splash');

  useEffect(() => {
    // Stage 1: Keep native splash screen visible for 500ms
    const splashTimer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      }
      setStage('video');
    }, 500);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (stage === 'video') {
      // Fallback timer: transition to ready in 6s if video fails to report completion
      const videoTimer = setTimeout(() => {
        setStage('ready');
      }, 6000);

      return () => clearTimeout(videoTimer);
    }
  }, [stage]);

  if (stage === 'splash') {
    return null; // Let the native splash screen show
  }

  if (stage === 'video') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <Video
          source={require('../assets/images/allver-animation.mp4')}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isMuted={true}
          isLooping={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status: any) => {
            if (status.didJustFinish) {
              setStage('ready');
            }
          }}
        />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="architect-profile" options={{ headerShown: false }} />
        <Stack.Screen name="contractor-profile" options={{ headerShown: false }} />
        <Stack.Screen name="chat-room" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="architects" options={{ headerShown: false }} />
        <Stack.Screen name="architect-detail" options={{ headerShown: false }} />
        <Stack.Screen name="design-detail" options={{ headerShown: false }} />
        <Stack.Screen name="contractors" options={{ headerShown: false }} />
        <Stack.Screen name="contractor-detail" options={{ headerShown: false }} />
        <Stack.Screen name="labour-detail" options={{ headerShown: false }} />
        <Stack.Screen name="project-detail" options={{ headerShown: false }} />
        <Stack.Screen name="project-applications" options={{ headerShown: false }} />
        <Stack.Screen name="project-compare" options={{ headerShown: false }} />
        <Stack.Screen name="project-progress" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
