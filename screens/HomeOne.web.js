import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  TextInput,
  useWindowDimensions,
} from 'react-native';

import { Calendar, LocaleConfig } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ===== Firebase Setup =====
const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7.firebaseapp.com",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// ===== Locale Setup =====
LocaleConfig.locales['he'] = {
  monthNames: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
  monthNamesShort: ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'],
  dayNames: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],
  dayNamesShort: ['א','ב','ג','ד','ה','ו','ש'],
  today: 'היום'
};
LocaleConfig.defaultLocale = 'he';

// ===== Utils & Formatters =====
const pad2 = (n) => String(n).padStart(2, '0');

const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const addDays = (yyyyMmDd, daysToAdd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};

const formatSimpleDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

const formatTimeHHmm = (dateObj) => {
  if (!dateObj) return '';
  return `${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`;
};

const hebrewDays = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

const formatHebrewDatePretty = (yyyyMmDd) => {
  if (!yyyyMmDd) return '';
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayName = hebrewDays[dt.getDay()];
  return `יום ${dayName}, ${d}.${m}.${y}`;
};

// ===== Components =====

const SelectionCard = ({ label, value, placeholder, icon, onPress, active }) => (
  <TouchableOpacity 
    style={[styles.card, active && styles.cardActive]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.chevron}>‹</Text> 
    <View style={{flex: 1, alignItems: 'flex-end'}}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, !value && styles.cardPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
    </View>
    <View style={styles.cardIconBox}>{icon}</View>
  </TouchableOpacity>
);

const BottomSheet = ({ visible, onClose, title, children }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>סגור</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{title}</Text>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
};

// רכיב צ'יפ לשעות
const TimeChip = ({ label, selected, onPress }) => (
  <TouchableOpacity 
    style={[styles.timeChip, selected && styles.timeChipSelected]} 
    onPress={onPress}
  >
    <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

export default function HomeOne({ route }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;
  const isWeb = Platform.OS === 'web';

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState(null);
  
  const [webHour, setWebHour] = useState(19);
  const [webMinute, setWebMinute] = useState(30);

  const [calendarCurrent, setCalendarCurrent] = useState(() => `${getTodayLocal().slice(0, 7)}-01`);

  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {toValue: 1, duration: 600, useNativeDriver: true}).start();
  }, []);

  const effectiveTimeLabel = useMemo(() => {
    if (isWeb) return `${pad2(webHour)}:${pad2(webMinute)}`;
    return selectedTime ? formatTimeHHmm(selectedTime) : '';
  }, [isWeb, webHour, webMinute, selectedTime]);

  const canProceed = !!(selectedDate && effectiveTimeLabel);

  // --- Handlers ---
  const changeYear = (increment) => {
    const [y, m] = calendarCurrent.split('-').map(Number);
    const newY = y + increment;
    setCalendarCurrent(`${newY}-${pad2(m)}-01`);
  };

  const onWebDateSelect = (day) => {
    if (day.dateString < getTodayLocal()) {
      Alert.alert('שגיאה', 'יש לבחור תאריך עתידי');
      return;
    }
    setSelectedDate(day.dateString);
    setShowDateModal(false);
  };

  const saveMobileDate = () => {
    const y = tempDate.getFullYear();
    const m = tempDate.getMonth() + 1;
    const d = tempDate.getDate();
    const dateStr = `${y}-${pad2(m)}-${pad2(d)}`;
    
    if (dateStr < getTodayLocal()) {
      Alert.alert('שגיאה', 'יש לבחור תאריך עתידי');
      return;
    }
    setSelectedDate(dateStr);
    setCalendarCurrent(`${y}-${pad2(m)}-01`);
    setShowDateModal(false);
  };

  const saveWebTime = () => setShowTimeModal(false);
  const saveMobileTime = () => { setSelectedTime(tempTime); setShowTimeModal(false); };

  // פונקציה לבחירת שעה מהירה מהצ'יפים
  const applyWebPreset = (h, m) => {
    setWebHour(h);
    setWebMinute(m);
  };

  const handleSave = async () => {
    if (!canProceed) return;

    try {
      const formattedDate = selectedDate;
      const formattedTime = effectiveTimeLabel;
      const nextDay = addDays(formattedDate, 1);

      await set(ref(database, `Events/${user.uid}/${finalEventName}/eventDate/`), formattedDate);
      await set(ref(database, `Events/${user.uid}/${finalEventName}/eventTime/`), formattedTime);

      const defaultTableData = [
        { id: '1', col1: '00.00.0000', col2: '300', col3: '0', col4: 'הזמנות', col5: '1' },
        { id: '2', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תזכורת', col5: '2' },
        { id: '3', col1: formattedDate, col2: '300', col3: '0', col4: 'יום אירוע', col5: '3' },
        { id: '4', col1: nextDay, col2: '300', col3: '0', col4: 'תודה רבה', col5: '4' },
      ];

      await set(ref(database, `Events/${user.uid}/${finalEventName}/Table_RSVPs/`), defaultTableData);
      navigation.navigate('HomeTwo', { finalEventName });
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן לשמור את הנתונים כרגע');
    }
  };

  // רשימת שעות מומלצות לאירועים
  const timePresets = [
    { label: '18:30', h: 18, m: 30 },
    { label: '19:00', h: 19, m: 0 },
    { label: '19:30', h: 19, m: 30 },
    { label: '20:00', h: 20, m: 0 },
    { label: '20:30', h: 20, m: 30 },
    { label: '21:00', h: 21, m: 0 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bgGraphic} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={{flex: 1, opacity: fadeAnim}}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>פרטי האירוע</Text>
              <Text style={styles.subtitle}>מתי חוגגים את "{finalEventName}"?</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.centerContainer}>
              <Text style={styles.sectionLabel}>בחר מועד ושעה</Text>
              
              <SelectionCard 
                label="תאריך האירוע"
                placeholder="בחר תאריך..."
                value={selectedDate ? formatSimpleDate(selectedDate) : ''}
                icon={<Text style={{fontSize: 20}}>📅</Text>}
                active={!!selectedDate}
                onPress={() => setShowDateModal(true)}
              />

              <View style={{height: 16}} />

              <SelectionCard 
                label="שעת התחלה"
                placeholder="בחר שעה..."
                value={effectiveTimeLabel ? effectiveTimeLabel : ''}
                icon={<Text style={{fontSize: 20}}>⏰</Text>}
                active={!!effectiveTimeLabel}
                onPress={() => setShowTimeModal(true)}
              />
            </View>
          </ScrollView>

          <View style={styles.bottomDockWrapper}>
            <View style={[styles.bottomDock, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
              
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryLabel}>סיכום בחירה:</Text>
                <Text style={styles.summaryValue}>
                  {selectedDate ? formatHebrewDatePretty(selectedDate) : '...'}
                  {effectiveTimeLabel ? ` • שעה ${effectiveTimeLabel}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.mainBtn, !canProceed && styles.mainBtnDisabled]}
                disabled={!canProceed}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.mainBtnText}>שמור והמשך</Text>
              </TouchableOpacity>
            </View>
          </View>

        </Animated.View>
      </SafeAreaView>

      {/* --- DATE MODAL --- */}
      <BottomSheet visible={showDateModal} onClose={() => setShowDateModal(false)} title="בחירת תאריך">
        <View style={{ maxWidth: 500, alignSelf: 'center', width: '100%' }}>
          
          {!isWeb && (
            <View style={{ alignItems: 'center' }}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(e, d) => {
                  if (Platform.OS === 'android') {
                    if (d) {
                      setTempDate(d);
                      const y = d.getFullYear(); const m = d.getMonth()+1; const da = d.getDate();
                      setSelectedDate(`${y}-${pad2(m)}-${pad2(da)}`);
                      setShowDateModal(false);
                    } else setShowDateModal(false);
                  } else if (d) setTempDate(d);
                }}
                style={{ width: '100%', height: 180 }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={saveMobileDate} style={styles.modalSaveBtn}>
                  <Text style={styles.modalSaveBtnText}>אישור תאריך</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isWeb && (
            <View>
              <View style={styles.webYearNav}>
                <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearBtn}>
                  <Text style={styles.yearBtnText}>שנה קודמת</Text>
                </TouchableOpacity>
                <Text style={styles.yearText}>{calendarCurrent.split('-')[0]}</Text>
                <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearBtn}>
                  <Text style={styles.yearBtnText}>שנה הבאה</Text>
                </TouchableOpacity>
              </View>

              <Calendar
                current={calendarCurrent}
                minDate={getTodayLocal()}
                onMonthChange={(m) => setCalendarCurrent(`${m.year}-${pad2(m.month)}-01`)}
                onDayPress={onWebDateSelect}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: '#4F46E5' } }}
                theme={{
                  arrowColor: '#4F46E5',
                  todayTextColor: '#4F46E5',
                  selectedDayBackgroundColor: '#4F46E5',
                  textDayFontWeight: '500',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                  'stylesheet.calendar.header': {
                     header: {
                       flexDirection: 'row',
                       justifyContent: 'space-between',
                       paddingLeft: 10, paddingRight: 10,
                       marginTop: 6,
                       alignItems: 'center',
                       marginBottom: 6
                     }
                  }
                }}
              />
            </View>
          )}
        </View>
      </BottomSheet>

      {/* --- TIME MODAL --- */}
      <BottomSheet visible={showTimeModal} onClose={() => setShowTimeModal(false)} title="בחירת שעה">
        <View style={{ maxWidth: 500, alignSelf: 'center', width: '100%' }}>
          {!isWeb ? (
            <View style={{alignItems: 'center'}}>
              <DateTimePicker
                value={selectedTime ? new Date(selectedTime) : tempTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={true}
                onChange={(e, d) => {
                  if (Platform.OS === 'android') {
                    if (d) { setSelectedTime(d); setShowTimeModal(false); }
                    else setShowTimeModal(false);
                  } else if (d) { setTempTime(d); }
                }}
                style={{ width: '100%', height: 180 }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={saveMobileTime} style={styles.modalSaveBtn}>
                  <Text style={styles.modalSaveBtnText}>אישור שעה</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
              {/* --- צ'יפים לשעות מומלצות --- */}
              <Text style={styles.chipsLabel}>שעות פופולריות:</Text>
              <View style={styles.chipsContainer}>
                {timePresets.map((t) => (
                   <TimeChip 
                      key={t.label} 
                      label={t.label} 
                      selected={webHour === t.h && webMinute === t.m}
                      onPress={() => applyWebPreset(t.h, t.m)} 
                   />
                ))}
              </View>

              {/* --- קלט ידני (מתוקן) --- */}
              <View style={styles.webTimeRow}>
                 {/* HOURS (Left) */}
                 <View style={styles.webInputGroup}>
                    <Text style={styles.webLabel}>שעות</Text>
                    <TextInput 
                      style={styles.webInput}
                      value={String(webHour)}
                      onChangeText={(t) => setWebHour(Math.min(23, Number(t.replace(/\D/g,''))))}
                      keyboardType="number-pad"
                    />
                 </View>
                 <Text style={styles.webColon}>:</Text>
                 {/* MINUTES (Right) */}
                 <View style={styles.webInputGroup}>
                    <Text style={styles.webLabel}>דקות</Text>
                    <TextInput 
                      style={styles.webInput}
                      value={String(webMinute)}
                      onChangeText={(t) => setWebMinute(Math.min(59, Number(t.replace(/\D/g,''))))}
                      keyboardType="number-pad"
                    />
                 </View>
              </View>

              <TouchableOpacity onPress={saveWebTime} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveBtnText}>שמור שעה</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  bgGraphic: { position: 'absolute', top: -150, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(79, 70, 229, 0.05)' },
  safeArea: { flex: 1 },
  
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  backArrow: { fontSize: 24, marginTop: -4, color: '#374151' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'right' },

  scrollContent: { paddingBottom: 140 },
  centerContainer: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 20, marginTop: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12, textAlign: 'right' },
  
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
    width: '100%',
  },
  cardActive: { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },
  cardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  cardLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textAlign: 'right', marginBottom: 2 },
  cardValue: { fontSize: 16, color: '#111827', fontWeight: '700', textAlign: 'right' },
  cardPlaceholder: { color: '#9CA3AF', fontWeight: '500' },
  chevron: { fontSize: 24, color: '#9CA3AF', paddingRight: 10 },

  bottomDockWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  bottomDock: {
    width: '100%', maxWidth: 600, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24,
    shadowColor: '#000', shadowOffset: {width:0, height:-4}, shadowOpacity: 0.08, shadowRadius: 15, elevation: 20,
  },
  summaryContainer: { marginBottom: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 16, color: '#111827', fontWeight: '800' },
  
  mainBtn: { backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6, width: '100%' },
  mainBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  mainBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  closeText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  
  modalSaveBtn: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  modalSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Web Year Nav
  webYearNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10, gap: 15 },
  yearBtn: { backgroundColor: '#EEF2FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  yearBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },
  yearText: { fontSize: 18, fontWeight: '900', color: '#111827' },

  // Web Time Chips Styles
  chipsLabel: { textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  chipsContainer: { 
    flexDirection: 'row-reverse', // כדי שהצ'יפים יהיו מימין לשמאל
    flexWrap: 'wrap', 
    gap: 8, 
    marginBottom: 20 
  },
  timeChip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, 
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB'
  },
  timeChipSelected: {
    backgroundColor: '#4F46E5', borderColor: '#4F46E5'
  },
  timeChipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  timeChipTextSelected: { color: '#FFFFFF' },

  // Web Inputs - FIXED DIRECTION
  webTimeRow: { 
    flexDirection: 'row', // LTR: Hours Left, Minutes Right
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10 
  },
  webInputGroup: { alignItems: 'center' },
  webLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  webInput: { width: 60, height: 50, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#111827' },
  webColon: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
});