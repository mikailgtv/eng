import { View, Text, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { getBookmarks } from '../lib/db';

export default function VocabBookmarks(){
  const [items, setItems] = useState<any[]>([]);
  useEffect(()=>{ getBookmarks().then(setItems).catch(()=>{}); }, []);
  if(items.length===0) return <View style={{ padding:20 }}><Text>هنوز واژگانی ذخیره نکرده‌اید — داخل هر درس روی 🔖 بزنید.</Text></View>;
  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:10 }}>
      <Text style={{ fontWeight:'800' }}>واژگان ذخیره — آفلاین می‌ماند</Text>
      {items.map(it=>(
        <View key={it.word} style={{ backgroundColor:'#fff', padding:12, borderRadius:12, borderWidth:1, borderColor:'#e2e8f0' }}>
          <Text style={{ fontWeight:'700' }}>{it.word}</Text>
          <Text style={{ color:'#64748b' }}>{it.translation}</Text>
          <Text style={{ color:'#94a3b8', fontSize:12 }}>{it.savedAt}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
