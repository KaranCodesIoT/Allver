import { Tabs } from 'expo-router';
import React from 'react';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  green: '#16A34A',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

const CustomPostButton = ({ onPress, accessibilityState, style }: any) => {
  const isFocused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[style, { overflow: 'visible', justifyContent: 'center', alignItems: 'center' }]}
    >
      <View style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#FBBF24', // Lighter Yellow/Gold matching the mockup
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        position: 'absolute',
        top: -14, // Elevate above the tab bar top border
        ...Platform.select({
          ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
          },
          android: {
            elevation: 4,
          },
          web: {
            boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.16)',
          }
        }),
      }}>
        <Feather name="plus" size={24} color="#FFFFFF" />
      </View>
      <Text style={{
        fontSize: 10,
        fontWeight: '600',
        color: isFocused ? COLORS.green : COLORS.textMuted,
        position: 'absolute',
        bottom: 2, // Horizontally align with default tab labels
      }}>
        Post Project
      </Text>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic bottom padding and height based on system safe area bottom insets
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingHorizontal: 2,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Feather name="compass" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post-project"
        options={{
          title: 'Post Project',
          tabBarButton: (props) => <CustomPostButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Feather name="globe" size={22} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="design"
        options={{
          title: 'Design',
          tabBarIcon: ({ color }) => <FontAwesome5 name="pencil-ruler" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <FontAwesome5 name="comment-dots" size={22} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
