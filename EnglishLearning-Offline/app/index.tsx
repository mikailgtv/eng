import { View, Text, Pressable, ScrollView, Image, Switch } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAllProgress } from '../lib/db';
import { courses } from '../lib/content';

export default function Home() {
  const router = useRouter();
  const [completed, setCompleted] = useState(0);
  const [streak, setStreak] = useState(3); // demo streak

  useEffect(() => {
    getAllProgress().then(rows => setCompleted(rows.length)).catch(()=>{});
  }, []);

  const totalLessons = courses[0]?.modules.reduce((a,m)=>a+m.lessons.length,0) ?? 25;
  const pct = Math.round((completed/totalLessons)*100);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Mascot hero */}
      <View style={{ backgroundColor: '#FFF8E7', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Image source={require('../assets/mascot.png')} style={{ width: 96, height: 96, borderRadius: 22 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>سلام! من لئو — آتش‌نشان شما</Text>
          <Text style={{ color: '#475569', marginTop: 4 }}>هر روز یک درس کوتاه — کاملاً آفلاین، بدون اینترنت</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: '#F4B63F', fontWeight: '700' }}>{streak} روز 🔥 استریک</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ fontWeight: '700' }}>{pct}% پیشرفت</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress card */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>برنامه امروز • Today's Goal</Text>
        <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: 10, backgroundColor: '#F4B63F' }} />
        </View>
        <Text style={{ color: '#64748b', marginTop: 8 }}>{completed} از {totalLessons} درس کامل شده — همه روی گوشی ذخیره است (offline)</Text>
      </View>

      {/* Quick actions — large touch targets */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          { title: 'دوره‌ها', sub: 'Courses', href: '/courses', color: '#FFE4B5' },
          { title: 'واژگان', sub: 'Vocabulary', href: '/vocab', color: '#DCFCE7' },
          { title: 'پیشرفت', sub: 'History', href: '/progress', color: '#DBEAFE' },
          { title: 'تنظیمات', sub: 'Settings', href: '/settings', color: '#F3E8FF' },
        ].map(c => (
          <Link key={c.href} href={c.href as any} asChild>
            <Pressable style={{ width: '48%', backgroundColor: c.color, borderRadius: 16, padding: 16, minHeight: 96 }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{c.title}</Text>
              <Text style={{ color: '#475569' }}>{c.sub}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Pressable onPress={() => router.push('/courses')} style={{ backgroundColor: '#0f172a', padding: 18, borderRadius: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>شروع یادگیری → Start Learning</Text>
      </Pressable>

      <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 8 }}>کاملاً آفلاین — airplane mode را روشن کنید، همه چیز کار می‌کند ✈️</Text>
    </ScrollView>
  );
}
