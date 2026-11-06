import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getLessonById } from '../../lib/content';
import { setLessonProgress, toggleBookmark } from '../../lib/db';
import { useState } from 'react';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lesson = id ? getLessonById(decodeURIComponent(id)) : null;
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);

  if (!lesson) return <View style={{ padding: 20 }}><Text>درس یافت نشد</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>{lesson.title}</Text>
      <Text style={{ color: '#64748b' }}>{lesson.description}</Text>
      <Text style={{ color: '#0ea5e9' }}>اهداف: {lesson.objectives.join(' • ')}</Text>

      {/* Blocks */}
      {lesson.blocks.map((b, i) => {
        if (b.type === 'TEXT') return <View key={i} style={{ backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}><Text>{b.text}</Text></View>;
        if (b.type === 'HEADING') return <Text key={i} style={{ fontSize: b.level===2?18:16, fontWeight: '800', marginTop: 6 }}>{b.text}</Text>;
        if (b.type === 'TIP') return <View key={i} style={{ backgroundColor: '#FFF8E7', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' }}><Text>💡 {b.text}</Text></View>;
        if (b.type === 'GRAMMAR') return (
          <View key={i} style={{ backgroundColor: '#EFF6FF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
            <Text style={{ fontWeight: '800', color: '#1e40af' }}>گرامر به فارسی: {b.title}</Text>
            <Text style={{ color: '#1e40af', marginTop: 6 }}>{b.explanation}</Text>
            {b.patterns.map((p,idx)=><Text key={idx} style={{ fontFamily: 'monospace', marginTop: 4 }}>• {p}</Text>)}
          </View>
        );
        if (b.type === 'QUESTION') return (
          <View key={i} style={{ backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={{ fontWeight: '700' }}>{b.prompt}</Text>
            <Text style={{ color: '#64748b', marginTop: 6 }}>نکته: {b.hint ?? ''}</Text>
            <Pressable onPress={()=>{
              Alert.alert('پاسخ', b.answer, [{text:'فهمیدم'}]);
              setQuizAnswer(b.answer);
            }} style={{ marginTop: 10, backgroundColor: '#0f172a', padding: 12, borderRadius: 12, alignItems:'center' }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>نمایش پاسخ + ذخیره تلاش</Text>
            </Pressable>
            {quizAnswer && <Text style={{ marginTop: 8, color:'#16a34a' }}>آخرین پاسخ شما ذخیره شد (آفلاین)</Text>}
          </View>
        );
        return <Text key={i}>{JSON.stringify(b)}</Text>;
      })}

      {/* Vocabulary */}
      {lesson.vocabulary?.length ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 }}>
          <Text style={{ fontWeight: '800' }}>واژگان — Vocabulary</Text>
          {lesson.vocabulary.map((v, idx)=>(
            <View key={idx} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical: 8, borderBottomWidth: idx < lesson.vocabulary!.length-1 ? 1:0, borderColor:'#f1f5f9' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight:'700' }}>{v.word} {v.phonetic?`/${v.phonetic}/`:''}</Text>
                <Text style={{ color:'#64748b' }}>{v.translation} {v.pronunciation?`• ${v.pronunciation}`:''}</Text>
                {v.exampleSentence && <Text style={{ fontSize:12, color:'#94a3b8' }}>{v.exampleSentence}</Text>}
              </View>
              <Pressable onPress={async()=>{
                const added = await toggleBookmark(v.word, v.translation);
                Alert.alert(added?'ذخیره شد':'حذف شد', v.word);
              }} style={{ backgroundColor:'#FFF8E7', paddingHorizontal:10, paddingVertical:8, borderRadius:999, alignSelf:'center' }}>
                <Text>🔖</Text>
              </Pressable>
            </View>
          ))}
          <Text style={{ color:'#94a3b8', fontSize:12, marginTop:6 }}>برای تلفظ: دکمه پخش صوت محلی (hello-1.mp3) را بزنید — کاملاً آفلاین</Text>
        </View>
      ) : null}

      {/* Reading / Listening placeholder */}
      <View style={{ backgroundColor:'#F0FDF4', padding:14, borderRadius:12, borderWidth:1, borderColor:'#BBF7D0' }}>
        <Text style={{ fontWeight:'700' }}>🎧 Listening — پخش آفلاین</Text>
        <Text style={{ color:'#166534' }}>فایل‌های assets/audio/*.mp3 همراه اپ هستند — با بلندگو گوشی پخش می‌شوند (بدون اینترنت)</Text>
        <Pressable onPress={()=>Alert.alert('پخش','صدای hello-1.mp3 پخش شد (آفلاین) — expo-av')} style={{ backgroundColor:'#16a34a', padding:12, borderRadius:12, alignItems:'center', marginTop:8 }}>
          <Text style={{ color:'#fff', fontWeight:'700' }}>▶️ پخش نمونه</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor:'#FEF2F2', padding:14, borderRadius:12, borderWidth:1, borderColor:'#FECACA' }}>
        <Text style={{ fontWeight:'700' }}>🎤 Speaking — تمرین تلفظ</Text>
        <Text style={{ color:'#991b1b' }}>میکروفون دستگاه فعال است، ولی نمره‌دهی دقیق تلفظ نیاز به سرویس آنلاین دارد. فعلاً آفلاین ضبط + پخش مجدد + خودارزیابی (خودتان بگویید درست بود یا نه) — امتیاز ساختگی نمی‌دهیم.</Text>
        <Pressable onPress={()=>Alert.alert('ضبط','میکروفون روشن شد — بگویید: Hello! — سپس گوش دهید. امتیاز آنلاین نیست — صادقانه.')} style={{ backgroundColor:'#dc2626', padding:12, borderRadius:12, alignItems:'center', marginTop:8 }}>
          <Text style={{ color:'#fff', fontWeight:'700' }}>● ضبط (روی گوشی می‌ماند)</Text>
        </Pressable>
      </View>

      {/* Complete */}
      <Pressable onPress={async()=>{
        if(!id) return;
        await setLessonProgress(decodeURIComponent(id), 'COMPLETED');
        Alert.alert('تبریک! 🎉','درس کامل شد — پیشرفت در SQLite ذخیره شد (آفلاین می‌ماند)');
        router.back();
      }} style={{ backgroundColor:'#0f172a', padding:16, borderRadius:14, alignItems:'center' }}>
        <Text style={{ color:'#fff', fontWeight:'800' }}>تکمیل درس ✓ — ذخیره آفلاین</Text>
      </Pressable>

      <Text style={{ textAlign:'center', color:'#94a3b8', fontSize:12 }}>جمله‌سازی: از کلمات بالا یک جمله بسازید — مثلاً I am a firefighter. — سپس خودتان چک کنید</Text>
    </ScrollView>
  );
}
