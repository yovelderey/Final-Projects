// RSVPsthree.js — Modern UI + ✅ Step 2/4 + ✅ Calendar Dark/Light + ✅ Wheel (Hour/Minute) + ✅ TextInput (Hour/Minute)

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';

import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, set, onValue, get } from 'firebase/database';

// --- Firebase Config (כמו אצלך) ---
const firebaseConfig = {
  apiKey: 'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain: 'final-project-d6ce7.firebaseapp.com',
  projectId: 'final-project-d6ce7',
  storageBucket: 'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId: '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId: 'G-LD61QH3VVP',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const normalizeThemeMode = (v) => {
  const s = String(v || '').toLowerCase().trim();
  if (s === 'dark' || s === 'light' || s === 'auto') return s;
  return 'auto';
};

const pad2 = (n) => String(n).padStart(2, '0');
const ymdToHeb = (ymd) => {
  if (!ymd || typeof ymd !== 'string' || ymd.length < 10) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

const isValidTimeHHMM = (t) => {
  if (!/^\d{2}:\d{2}$/.test(String(t || ''))) return false;
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
};

const onlyDigits = (s) => String(s || '').replace(/[^\d]/g, '');
const clampInt = (v, min, max) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
};

// ===== Wheel consts =====
const WHEEL_ITEM_H = 44;
const WHEEL_VISIBLE = 5;
const WHEEL_PAD = (WHEEL_VISIBLE * WHEEL_ITEM_H - WHEEL_ITEM_H) / 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const idxFromOffset = (y) => Math.round((y || 0) / WHEEL_ITEM_H);

const RSVPsthree = (props) => {
  const insets = useSafeAreaInsets();
  const id = props.route.params?.id;
  const screenWidth = Dimensions.get('window').width;
  const database = getDatabase();

  // ✅ user כ-state
  const [user, setUser] = useState(firebase.auth().currentUser);
  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  // ✅ Theme mode from Firebase: auto/light/dark
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('auto');

  useEffect(() => {
    if (!user?.uid || !id) return;

    let unsubscribe = null;
    let cancelled = false;

    const candidates = [
      `Events/${user.uid}/${id}/Table_RSVPs/__admin/audit/ui/theme/mode`,
      `Events/${user.uid}/${id}/__admin/audit/ui/theme/mode`,
      `Events/${user.uid}/${id}/__admin/ui/theme/mode`,
      `Events/${user.uid}/${id}/admin/ui/theme/mode`,
      `Events/${user.uid}/${id}/Table_RSVPs/__admin/ui/theme/mode`,
      `Events/${user.uid}/${id}/__meta/ui/theme/mode`,
    ];

    const run = async () => {
      try {
        let foundPath = null;
        let foundVal = null;

        for (const p of candidates) {
          const s = await get(ref(database, p));
          if (s.exists()) {
            foundPath = p;
            foundVal = s.val();
            break;
          }
        }

        if (cancelled) return;

        if (!foundPath) {
          setThemeMode('auto');
          return;
        }

        setThemeMode(normalizeThemeMode(foundVal));

        const r = ref(database, foundPath);
        unsubscribe = onValue(
          r,
          (snap) => {
            if (snap.exists()) setThemeMode(normalizeThemeMode(snap.val()));
            else setThemeMode('auto');
          },
          () => {}
        );
      } catch {
        setThemeMode('auto');
      }
    };

    run();

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid, id]);

  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark');

  const theme = useMemo(() => {
    const primary = '#6C63FF';
    return {
      isDark,
      primary,
      bg: isDark ? '#0B0F1A' : '#F6F7FB',
      card: isDark ? '#11182A' : '#FFFFFF',
      text: isDark ? '#F3F6FF' : '#101828',
      subText: isDark ? '#B8C0D9' : '#667085',
      border: isDark ? 'rgba(255,255,255,0.08)' : '#E8EAF2',
      chipBg: isDark ? 'rgba(108,99,255,0.18)' : '#F0EFFF',
      iconBg: isDark ? 'rgba(255,255,255,0.06)' : '#F6F7FF',
      shadow: isDark ? '#000' : '#0B0F1A',
      trackBg: isDark ? 'rgba(255,255,255,0.06)' : '#EEF0F7',
      inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#F7F8FC',

      // ✅ Calendar follows dark/light
      calBg: isDark ? '#0F172A' : '#FFFFFF',
      calText: isDark ? '#E5E7EB' : '#101828',
      calSubText: isDark ? 'rgba(229,231,235,0.75)' : '#667085',
      calBorder: isDark ? 'rgba(255,255,255,0.10)' : '#E8EAF2',
      calDisabled: isDark ? 'rgba(229,231,235,0.25)' : 'rgba(16,24,40,0.30)',
      calWeekBg: isDark ? '#11182A' : '#FFFFFF', // אופציונלי (עוד אחידות)

    };
  }, [isDark]);

  // --- Stepper (✅ שלב 2 מתוך 4) ---
  const steps = useMemo(
    () => [
      { label: 'התחלה' },
      { label: 'ניסוח הודעה' },
      { label: 'תזמון הודעה' },
      { label: 'סיכום' },
    ],
    []
  );

  const currentStepIndex = 1; // ✅ שלב 2
  const progressPct = (currentStepIndex / (steps.length - 1)) * 100;

  const renderStepPill = (label, index) => {
    const active = index === currentStepIndex;
    const done = index < currentStepIndex;

    return (
      <View
        key={`${label}-${index}`}
        style={[
          styles.stepPill,
          {
            backgroundColor: active ? theme.primary : 'transparent',
            borderColor: active ? 'transparent' : theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.stepDot,
            {
              backgroundColor: active ? 'rgba(255,255,255,0.95)' : done ? theme.primary : theme.border,
            },
          ]}
        />
        <Text
          style={[
            styles.stepPillText,
            { color: active ? '#FFFFFF' : theme.subText, fontWeight: active ? '900' : '800' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    );
  };

  // ======== LOGIC ========
  const [selectedDate1, setSelectedDate1] = useState('');
  const [maxEventDate, setMaxEventDate] = useState('');

  // ✅ Time
  const now = new Date();
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());

  // ✅ Inputs for hour/minute
  const [hourInput, setHourInput] = useState(pad2(now.getHours()));
  const [minuteInput, setMinuteInput] = useState(pad2(now.getMinutes()));

  const timeText = useMemo(() => `${pad2(hour)}:${pad2(minute)}`, [hour, minute]);
  const canProceed = selectedDate1 !== '' && isValidTimeHHMM(timeText);

  // keep inputs synced when wheel changes
  useEffect(() => {
    setHourInput(pad2(hour));
  }, [hour]);
  useEffect(() => {
    setMinuteInput(pad2(minute));
  }, [minute]);

  useEffect(() => {
    if (!user?.uid || !id) return;

    const databaseRef = ref(database, `Events/${user.uid}/${id}/eventDate`);
    const unsub = onValue(databaseRef, (snapshot) => {
      const fetchedDate = snapshot.val();
      if (fetchedDate) {
        const eventDate = new Date(fetchedDate);
        eventDate.setDate(eventDate.getDate() - 2);
        setMaxEventDate(eventDate.toISOString().split('T')[0]);
      }
    });

    return () => typeof unsub === 'function' && unsub();
  }, [user?.uid, id]);

  const handleDayPress = (day) => {
    const today = new Date().toISOString().split('T')[0];

    if (day.dateString < today) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תאריך שהוא בעבר');
    } else if (maxEventDate && day.dateString > maxEventDate) {
      Alert.alert('שגיאה', `לא ניתן לבחור תאריך אחרי ${maxEventDate}`);
    } else {
      setSelectedDate1(day.dateString);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    if (!selectedDate1) {
      Alert.alert('שגיאה', 'בחר תאריך');
      return;
    }

    if (!isValidTimeHHMM(timeText)) {
      Alert.alert('שגיאה', 'שעה לא תקינה');
      return;
    }

    try {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/message_date_hour`);
      const messageData = {
        date: selectedDate1,
        time: timeText,
      };

      await set(databaseRef, messageData);
      props.navigation.navigate('RSVPsfour', { id });
    } catch (error) {
      console.error('Error saving message to Firebase: ', error);
      Alert.alert('שגיאה', 'שגיאה בשמירת ההודעה. נסה שוב.');
    }
  };

  const markedDates = useMemo(() => {
    if (!selectedDate1) return {};
    return { [selectedDate1]: { selected: true, selectedColor: theme.primary } };
  }, [selectedDate1, theme.primary]);

  // ===== Wheel data + refs =====
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  // initial wheel position
  useEffect(() => {
    const t = setTimeout(() => {
      hourRef.current?.scrollToOffset?.({ offset: hour * WHEEL_ITEM_H, animated: false });
      minuteRef.current?.scrollToOffset?.({ offset: minute * WHEEL_ITEM_H, animated: false });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onWheelEnd = (e, maxIdx, setter) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const idx = clamp(idxFromOffset(y), 0, maxIdx);
    setter(idx);
  };

  const renderWheelItem = (selectedValue) => ({ item }) => {
    const active = item === selectedValue;
    return (
      <View style={[styles.wheelItem, { height: WHEEL_ITEM_H }]}>
        <Text
          style={[
            styles.wheelText,
            {
              color: active ? theme.text : theme.subText,
              opacity: active ? 1 : 0.55,
              transform: [{ scale: active ? 1.06 : 1 }],
            },
          ]}
        >
          {pad2(item)}
        </Text>
      </View>
    );
  };

  // ✅ TextInput handlers (Hour/Minute)
  const commitHour = (raw) => {
    const v = onlyDigits(raw);
    const hh = clampInt(v === '' ? hour : v, 0, 23);
    setHour(hh);
    setHourInput(pad2(hh));
    hourRef.current?.scrollToOffset?.({ offset: hh * WHEEL_ITEM_H, animated: true });
  };

  const commitMinute = (raw) => {
    const v = onlyDigits(raw);
    const mm = clampInt(v === '' ? minute : v, 0, 59);
    setMinute(mm);
    setMinuteInput(pad2(mm));
    minuteRef.current?.scrollToOffset?.({ offset: mm * WHEEL_ITEM_H, animated: true });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />

      {/* blobs */}
      <View pointerEvents="none" style={styles.bgBlobsWrap}>
        <View
          style={[
            styles.blob,
            { backgroundColor: theme.primary, opacity: isDark ? 0.18 : 0.10, top: -60, right: -70 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: '#22C55E', opacity: isDark ? 0.10 : 0.08, bottom: 80, left: -80 },
          ]}
        />
      </View>

      {/* ✅ HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === 'android' ? 8 : 4) + insets.top,
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => props.navigation.navigate('RSVPstwo', { id })}
          style={[
            styles.backBtnWide,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,24,40,0.06)' },
          ]}
          activeOpacity={0.85}
        >
          <Text style={[styles.backTxt2, { color: theme.text }]}>חזור ←</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>תזמון הזמנות</Text>
        </View>

        <View style={{ width: 92 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: 170 + insets.bottom,
            paddingHorizontal: screenWidth > 720 ? 24 : 18,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stepper */}
        <View style={[styles.stepperCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.stepperRow}>
            {steps
              .map((s) => s.label)
              .reverse()
              .map((label, i) => {
                const originalIndex = steps.length - 1 - i;
                return renderStepPill(label, originalIndex);
              })}
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.trackBg }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.primary }]} />
          </View>

          <Text style={[styles.stepHint, { color: theme.subText }]}>
            שלב {currentStepIndex + 1} מתוך {steps.length}
          </Text>
        </View>

        {/* Texts */}
        <Text style={[styles.text1, { color: theme.text }]}>
          בחר תאריך ושעה כדי לקבוע תזמון אוטומטי לשליחת ההזמנות לנמענים.
        </Text>
        <Text style={[styles.text2, { color: theme.subText }]}>
          (מומלץ לתזמן לפחות עד 10 ימים לפני האירוע)
        </Text>

        {/* Card: Calendar + Time */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Calendar */}
          <View style={[styles.cardTopRow, { flexDirection: 'row-reverse' }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>בחירת תאריך</Text>
              <Text style={[styles.cardBody, { color: theme.subText }]}>
                לא ניתן לבחור תאריך בעבר. {maxEventDate ? `וגם לא אחרי ${maxEventDate}.` : ''}
              </Text>
            </View>
          </View>

          <View style={{ height: 12 }} />

          {/* ✅ Calendar dark/light */}
<View style={[styles.lightCalendarWrap, { backgroundColor: theme.calBg, borderColor: theme.calBorder }]}>
  <Calendar
    key={isDark ? 'cal-dark' : 'cal-light'}   // ✅ הכי חשוב: מכריח רינדור מחדש כשמשנים מצב
    onDayPress={handleDayPress}
    markedDates={markedDates}
    minDate={new Date().toISOString().split('T')[0]}
    maxDate={maxEventDate || undefined}
    enableSwipeMonths
    firstDay={0}
    theme={{
      backgroundColor: theme.calBg,
      calendarBackground: theme.calBg,
      textSectionTitleColor: theme.calSubText,
      dayTextColor: theme.calText,
      monthTextColor: theme.calText,
      arrowColor: theme.primary,
      todayTextColor: theme.primary,
      textDisabledColor: theme.calDisabled,
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: '#FFFFFF',
      textDayFontWeight: '800',
      textMonthFontWeight: '900',
      textDayHeaderFontWeight: '800',
    }}
  />
</View>


          {/* Time */}
          <View style={{ height: 14 }} />

          <View style={[styles.cardTopRow, { flexDirection: 'row-reverse', alignItems: 'center' }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
              <Text style={{ fontSize: 20 }}>🕒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>בחר שעה ודקה</Text>
              <Text style={[styles.cardBody, { color: theme.subText }]}>
                אפשר לבחור בקרוסלה או להקליד ידנית
              </Text>
            </View>
          </View>

          <View style={{ height: 10 }} />

          {/* ✅ WHEEL */}


          {/* ✅ Manual Inputs */}
          <View style={[styles.timeInputsRow, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
            <Text style={[styles.timeInputsLabel, { color: theme.subText }]}>הקלדה ידנית:</Text>

            <View style={styles.timeInputsInline}>
              <TextInput
                value={hourInput}
                onChangeText={(t) => setHourInput(onlyDigits(t).slice(0, 2))}
                onBlur={() => commitHour(hourInput)}
                onSubmitEditing={() => commitHour(hourInput)}
                placeholder="HH"
                placeholderTextColor={isDark ? 'rgba(229,231,235,0.35)' : 'rgba(16,24,40,0.35)'}
                keyboardType="numeric"
                inputMode="numeric"
                maxLength={2}
                style={[
                  styles.timeInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
                ]}
                textAlign="center"
              />

              <Text style={[styles.timeColon, { color: theme.subText }]}>:</Text>

              <TextInput
                value={minuteInput}
                onChangeText={(t) => setMinuteInput(onlyDigits(t).slice(0, 2))}
                onBlur={() => commitMinute(minuteInput)}
                onSubmitEditing={() => commitMinute(minuteInput)}
                placeholder="MM"
                placeholderTextColor={isDark ? 'rgba(229,231,235,0.35)' : 'rgba(16,24,40,0.35)'}
                keyboardType="numeric"
                inputMode="numeric"
                maxLength={2}
                style={[
                  styles.timeInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
                ]}
                textAlign="center"
              />
            </View>

            <Text style={[styles.timeInputsHint, { color: theme.subText }]}>טווח: 00–23 / 00–59</Text>
          </View>

          {/* Summary */}
          <View style={[styles.summary, { backgroundColor: theme.chipBg, alignSelf: 'flex-end' }]}>
            <Text style={[styles.summaryText, { color: theme.primary }]}>
              נבחר: {selectedDate1 ? ymdToHeb(selectedDate1) : '—'} · {isValidTimeHHMM(timeText) ? timeText : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(14, insets.bottom + 10),
            borderTopColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.cta,
            {
              width: screenWidth > 800 ? 420 : '92%',
              backgroundColor: theme.primary,
              shadowColor: theme.shadow,
              opacity: canProceed ? 1 : 0.55,
            },
          ]}
          activeOpacity={0.9}
          onPress={handleSave}
          disabled={!canProceed}
        >
          <Text style={styles.ctaText}>הבא</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>

        <Text style={[styles.footerHint, { color: theme.subText }]}>
          {selectedDate1 ? `תאריך: ${ymdToHeb(selectedDate1)}` : 'בחר תאריך'} ·{' '}
          {isValidTimeHHMM(timeText) ? `שעה: ${timeText}` : 'בחר/הקלד שעה'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },

  bgBlobsWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnWide: {
    height: 44,
    minWidth: 92,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  backTxt2: {
    fontSize: 14,
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  scroll: {
    paddingTop: 16,
    alignItems: 'center',
  },

  stepperCard: {
    width: '100%',
    maxWidth: 860,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0px 12px 30px rgba(0,0,0,0.08)' },
      default: {
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      },
    }),
  },
  stepperRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  stepPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 110,
    justifyContent: 'center',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginLeft: 8,
  },
  stepPillText: {
    fontSize: 12,
    textAlign: 'right',
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: 8,
    borderRadius: 99,
  },
  stepHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  text1: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: 860,
    lineHeight: 24,
  },
  text2: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 860,
    lineHeight: 20,
    marginBottom: 6,
  },

  card: {
    width: '100%',
    maxWidth: 860,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    ...Platform.select({
      web: { boxShadow: '0px 12px 30px rgba(0,0,0,0.08)' },
      default: {
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      },
    }),
  },
  cardTopRow: {
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'right',
  },

  calendarWrap: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },

  // ✅ Wheel styles
  wheelRow: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wheelBox: {
    width: 120,
    borderWidth: 1,
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  wheelWrap: {
    width: '100%',
    height: WHEEL_VISIBLE * WHEEL_ITEM_H,
    borderRadius: 14,
    overflow: 'hidden',
  },
  wheelItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  wheelHighlight: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: (WHEEL_VISIBLE * WHEEL_ITEM_H - WHEEL_ITEM_H) / 2,
    height: WHEEL_ITEM_H,
    borderWidth: 2,
    borderRadius: 12,
    opacity: 0.9,
  },
  wheelColon: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 10,
  },

  // ✅ Manual time inputs
  timeInputsRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  timeInputsLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  timeInputsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  timeInput: {
    width: 78,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 22,
    fontWeight: '900',
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: Platform.OS === 'web' ? 0 : -1,
  },
  timeInputsHint: {
    fontSize: 12,
    fontWeight: '800',
  },

  summary: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  summaryText: {
    fontSize: 12.5,
    fontWeight: '900',
    textAlign: 'right',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0px 16px 30px rgba(0,0,0,0.18)' },
      default: {
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      },
    }),
  },
  ctaText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  ctaArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: Platform.OS === 'web' ? 0 : 1,
  },
  footerHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  timeInput: {
  width: 78,
  height: 50,
  borderRadius: 14,
  borderWidth: 1,
  fontSize: 22,
  fontWeight: '900',

  // ✅ זה מה שמיישר למרכז
  textAlign: 'center',

  // ✅ מומלץ ב-RTL כדי שמספרים לא "יברחו"
  writingDirection: 'ltr',
  direction: 'ltr', // חשוב ל-Web
},

});

export default RSVPsthree;
