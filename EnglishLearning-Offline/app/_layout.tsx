import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: scheme === 'dark' ? '#0f172a' : '#FFF8E7' },
          headerTintColor: scheme === 'dark' ? '#F4B63F' : '#0f172a',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: scheme === 'dark' ? '#0f172a' : '#f8fafc' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'EnglishBridge' }} />
        <Stack.Screen name="courses" options={{ title: 'دوره‌ها • Courses' }} />
        <Stack.Screen name="lesson/[id]" options={{ title: 'درس • Lesson' }} />
        <Stack.Screen name="vocab" options={{ title: 'واژگان ذخیره • Bookmarks' }} />
        <Stack.Screen name="progress" options={{ title: 'پیشرفت • Progress' }} />
        <Stack.Screen name="settings" options={{ title: 'تنظیمات • Settings' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
