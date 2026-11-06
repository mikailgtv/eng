import { View, Text, Pressable, Alert, Switch, ScrollView } from 'react-native';
import { useState } from 'react';
import { exportProgressToJson, clearAllProgress } from '../lib/db';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function Settings() {
  const [sound, setSound] = useState(true);
  const [dark, setDark] = useState(false);
  const [bigText, setBigText] = useState(false);

  const onExport = async () => {
    const json = await exportProgressToJson();
    const uri = FileSystem.documentDirectory + 'englishbridge-backup.json';
    await FileSystem.writeAsStringAsync(uri, json);
    Alert.alert('پشتیبان ساخته شد', uri + '\\nاین فایل فقط روی گوشی شما می‌ماند — بین دو گوشی همگام نمی‌شود.');
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const onDelete = () => {
    Alert.alert('حذف پیشرفت؟','این کار همه درس‌های کامل‌شده، نشان‌ها و واژگان ذخیره را پاک می‌کند و برگشت ندارد.',[
      {text:'انصراف', style:'cancel'},
      {text:'بله، پاک کن', style:'destructive', onPress: async()=>{ await clearAllProgress(); Alert.alert('پاک شد','پیشرفت شما حذف شد (آفلاین)'); }}
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:16 }}>
      <Text style={{ fontWeight:'800', fontSize:16 }}>تنظیمات — همه آفلاین، روی گوشی می‌ماند</Text>

      <View style={{ backgroundColor:'#fff', borderRadius:12, padding:14, borderWidth:1, borderColor:'#e2e8f0' }}>
        <Text style={{ fontWeight:'700' }}>زبان</Text>
        <Text style={{ color:'#64748b' }}>ناوبری فارسی (راست‌به‌چپ) + متن انگلیسی (چپ‌به‌راست) — در همین نسخه فعال</Text>
      </View>

      <View style={{ backgroundColor:'#fff', borderRadius:12, padding:14, borderWidth:1, borderColor:'#e2e8f0', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontWeight:'700' }}>صدا 🔊</Text>
        <Switch value={sound} onValueChange={setSound} />
      </View>

      <View style={{ backgroundColor:'#fff', borderRadius:12, padding:14, borderWidth:1, borderColor:'#e2e8f0', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontWeight:'700' }}>تم تیره 🌙</Text>
        <Switch value={dark} onValueChange={setDark} />
      </View>

      <View style={{ backgroundColor:'#fff', borderRadius:12, padding:14, borderWidth:1, borderColor:'#e2e8f0', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ fontWeight:'700' }}>متن بزرگتر 🔍</Text>
        <Switch value={bigText} onValueChange={setBigText} />
      </View>

      <View style={{ backgroundColor:'#FFF8E7', padding:14, borderRadius:12, borderWidth:1, borderColor:'#FDE68A' }}>
        <Text style={{ fontWeight:'700' }}>پشتیبان و انتقال</Text>
        <Text style={{ color:'#92400e', marginTop:6 }}>پیشرفت شما فقط روی همین گوشی است. اگر گوشی عوض شد، باید فایل پشتیبان را دستی منتقل کنید — همگام‌سازی ابری نداریم.</Text>
        <Pressable onPress={onExport} style={{ backgroundColor:'#0f172a', padding:12, borderRadius:12, alignItems:'center', marginTop:10 }}>
          <Text style={{ color:'#fff', fontWeight:'700' }}>خروجی پیشرفت (JSON) → اشتراک</Text>
        </Pressable>
      </View>

      <Pressable onPress={onDelete} style={{ backgroundColor:'#fee2e2', padding:16, borderRadius:12, borderWidth:1, borderColor:'#fecaca', alignItems:'center' }}>
        <Text style={{ color:'#991b1b', fontWeight:'800' }}>حذف کل پیشرفت 🗑️ (با تایید)</Text>
      </Pressable>

      <Text style={{ color:'#94a3b8', fontSize:12, textAlign:'center' }}>نسخه 1.0.0 • SQLite آفلاین • بدون نیاز به ثبت‌نام یا اینترنت</Text>
    </ScrollView>
  );
}
