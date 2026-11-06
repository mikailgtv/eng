import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { courses, getAllLessons } from '../lib/content';

export default function Courses() {
  const lessons = getAllLessons();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>English Starter — Pre-A1 (۶ ماژول، ۲۵ درس)</Text>
      <Text style={{ color: '#64748b' }}>آموزش از صفر: الفبا، سلام، معرفی، اعداد، خانواده، رنگ‌ها — با ترجمه فارسی و صوت آفلاین</Text>

      {courses[0].modules.map((mod, mi) => (
        <View key={mi} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontWeight: '800', color: '#0f172a' }}>{mi+1}. {mod.title}</Text>
          <Text style={{ color: '#64748b', marginTop: 4 }}>{mod.description}</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {mod.lessons.map((lesson, li) => {
              const id = `${courses[0].code}-${mi}-${li}`;
              return (
                <Link key={id} href={`/lesson/${encodeURIComponent(id)}` as any} asChild>
                  <Pressable style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700' }}>{lesson.title}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>{lesson.durationMin} دقیقه • {lesson.blocks.length} بخش</Text>
                    </View>
                    <Text style={{ color: '#F4B63F', fontWeight: '800' }}>باز کن →</Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>
      ))}

      <View style={{ backgroundColor: '#FFF8E7', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
        <Text style={{ fontWeight: '700' }}>🔊 صوت آفلاین: ۸ فایل در assets/audio همراه اپ (hello, numbers, colors...)</Text>
      </View>
    </ScrollView>
  );
}
