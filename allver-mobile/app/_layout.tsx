import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
