import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, useIsFocused, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useType } from '../design/fonts';
import { colors } from '../design/theme';
import { ChatScreen } from '../screens/ChatScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';

export type RootTabParamList = {
  Home: undefined;
  Goals: undefined;
  Journal: undefined;
  Schedule: undefined;
  Chat: undefined;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

// [focused, unfocused]
const TAB_ICONS: Record<keyof RootTabParamList, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Goals: ['flag', 'flag-outline'],
  Journal: ['book', 'book-outline'],
  Schedule: ['calendar', 'calendar-outline'],
  Chat: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accentStrong,
  },
};

// Tabs stay mounted, so only the focused screen renders the status bar.
function FocusAwareStatusBar() {
  return useIsFocused() ? <StatusBar style="light" /> : null;
}

function HomeTab() {
  return (
    <>
      <FocusAwareStatusBar />
      <HomeScreen />
    </>
  );
}

function GoalsTab() {
  return (
    <>
      <FocusAwareStatusBar />
      <GoalsScreen />
    </>
  );
}

function JournalTab() {
  return (
    <>
      <FocusAwareStatusBar />
      <JournalScreen />
    </>
  );
}

function ScheduleTab() {
  return (
    <>
      <FocusAwareStatusBar />
      <ScheduleScreen />
    </>
  );
}

// ChatScreen pads its composer for the home indicator itself. Inside the tab
// navigator the tab bar already covers that, so give it a zero bottom inset.
function ChatTab() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: 0 }}>
      <FocusAwareStatusBar />
      <ChatScreen />
    </SafeAreaInsetsContext.Provider>
  );
}

export function RootNavigator() {
  const type = useType();

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: [type.label, { fontSize: 10, letterSpacing: 0.8, color: undefined }],
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size - 2} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeTab} />
        <Tab.Screen name="Goals" component={GoalsTab} />
        <Tab.Screen name="Journal" component={JournalTab} />
        <Tab.Screen name="Schedule" component={ScheduleTab} />
        <Tab.Screen name="Chat" component={ChatTab} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
