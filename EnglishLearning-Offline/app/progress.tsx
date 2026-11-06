import { View, Text, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { getAllProgress } from '../lib/db';
import { getAllLessons } from '../lib/content';

export default function Progress(){
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ getAllProgress().then(setRows); }, []);
  const total = getAllLessons().length;
  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>
      <View style={{ backgroundColor:'#fff', padding:16, borderRadius:16, borderWidth:1, borderColor:'#e2e8f0', alignItems:'center' }}>
        <Text style={{ fontSize:48 }}>🏆</Text>
        <Text style={{ fontWeight:'800', fontSize:18 }}>{rows.length} / {total} درس کامل شده</Text>
        <Text style={{ color:'#64748b' }}>هر ستاره = یک درس — کاملاً آفلاین شمرده می‌شود</Text>
        <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
          <View style={{ backgroundColor:'#FFF8E7', padding:8, borderRadius:999 }}><Text>🔥 3 روز استریک</Text></View>
          <View style={{ backgroundColor:'#DCFCE7', padding:8, borderRadius:999 }}><Text>⭐ 2 نشان</Text></View>
        </View>
      </View>

      {rows.map(r=>(
        <View key={r.lessonId} style={{ backgroundColor:'#f0fdf4', padding:12, borderRadius:12, borderWidth:1, borderColor:'#bbf7d0' }}>
          <Text style={{ fontWeight:'700' }}>{r.lessonId}</Text>
          <Text style={{ color:'#166534', fontSize:12 }}>وضعیت: {r.status} • {r.updatedAt}</Text>
        </View>
      ))}
      {rows.length===0 && <Text style={{ color:'#94a3b8', textAlign:'center' }}>هنوز درسی کامل نکرده‌اید — از Courses شروع کنید.</Text>}
    </ScrollView>
  );
}
