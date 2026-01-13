// EditHome.js — Narrow Layout + Fancy Calendar (Web + iOS + Android FIX)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Pressable,
  useColorScheme,
  KeyboardAvoidingView,
  Easing,
  StatusBar,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, onValue, update, push } from 'firebase/database';

// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// ===== Helpers =====
function sanitizeDigits(s) { return String(s ?? '').replace(/[^\d]/g, ''); }
function formatCurrencyILS(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '₪0';
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}
function toYMD(dateObj) { try { return dateObj.toISOString().split('T')[0]; } catch { return ''; } }
function parseEventDateMaybe(dateValue) {
  if (!dateValue) return new Date();
  if (typeof dateValue === 'string') {
    // Accept "YYYY-MM-DD" or "DD/MM/YYYY"
    if (dateValue.includes('-')) {
      const parts = dateValue.split('-').map(Number);
      if (parts.length === 3 && parts.every(n => Number.isFinite(n))) return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    if (dateValue.includes('/')) {
      const parts = dateValue.split('/').map(Number);
      if (parts.length === 3 && parts.every(n => Number.isFinite(n))) return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function isValidTimeHHmm(t) { return /^(\d{2}):(\d{2})$/.test(t); }
function safeDate(d) {
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? new Date() : x;
}

// ===== Theme Engine =====
const useTheme = (mode, systemScheme) => {
  const isDark = mode === 'dark' || (mode === 'auto' && systemScheme === 'dark');
  return useMemo(() => ({
    isDark,
    bg: isDark ? '#0F1115' : '#F2F4F8',
    surface: isDark ? '#171A21' : '#FFFFFF',
    primary: '#6C63FF',
    text: isDark ? '#EAEAF0' : '#121318',
    subText: isDark ? '#A8ACB6' : '#6E6E73',
    border: isDark ? '#2A2E39' : '#E5E5EA',
    inputBg: isDark ? '#1F2430' : '#F9F9FC',
    danger: '#FF453A',
    success: '#32D74B',
    warn: '#FFD60A',
  }), [isDark, mode, systemScheme]);
};

// ===== UI Components =====

// 1. Fade In Animation
const FadeInView = ({ delay, children, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// 2. Animated Input
const AnimatedInput = ({ label, value, onChangeText, placeholder, keyboardType, multiline, theme, alignCenter }) => {
  const [isFocused, setIsFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, anim]);

  const labelStyle = {
    position: 'absolute',
    right: 16,
    top: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 7] }),
    fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
    color: anim.interpolate({ inputRange: [0, 1], outputRange: [theme.subText, theme.primary] }),
    zIndex: 1,
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder={isFocused ? placeholder : ''}
        placeholderTextColor={theme.subText}
        style={{
          borderWidth: 1,
          borderColor: isFocused ? theme.primary : theme.border,
          backgroundColor: theme.inputBg,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingTop: multiline ? 12 : 24,
          paddingBottom: multiline ? 12 : 8,
          height: multiline ? 110 : 60,
          fontSize: 16,
          fontWeight: '600',
          color: theme.text,
          textAlign: alignCenter ? 'center' : 'right',
          ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
        }}
      />
    </View>
  );
};

// 3. Switch
const ModernSwitch = ({ value, onValueChange, theme }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [theme.border, theme.primary] });
  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={10}>
      <Animated.View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: trackColor, justifyContent: 'center' }}>
        <Animated.View style={{
          width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF',
          transform: [{ translateX: thumbX }],
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 3, elevation: 2
        }} />
      </Animated.View>
    </Pressable>
  );
};

// 4. Budget Bar
const BudgetBar = ({ spend, budget, theme }) => {
  const pct = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0;
  const isOver = spend > budget;
  const barColor = isOver ? theme.danger : (pct > 85 ? theme.warn : theme.success);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: pct, duration: 700, useNativeDriver: false }).start();
  }, [pct, widthAnim]);

  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ height: 9, backgroundColor: theme.border, borderRadius: 6, overflow: 'hidden' }}>
        <Animated.View style={{
          height: '100%', backgroundColor: barColor,
          width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
        }} />
      </View>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 7 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.subText }}>{pct.toFixed(0)}% נוצל</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: isOver ? theme.danger : theme.subText }}>
          {isOver ? 'חריגה!' : 'במסגרת התקציב'}
        </Text>
      </View>
    </View>
  );
};

// 5. Toast
const Toast = ({ visible, text, type, onHide, theme, topInset }) => {
  const anim = useRef(new Animated.Value(-100)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: topInset + 10, useNativeDriver: true, tension: 55 }).start();
      const t = setTimeout(onHide, 2400);
      return () => clearTimeout(t);
    } else {
      Animated.timing(anim, { toValue: -100, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, onHide, topInset, anim]);

  const bg = type === 'success' ? theme.success : type === 'error' ? theme.danger : theme.primary;
  return (
    <Animated.View style={{
      position: 'absolute', top: 0, alignSelf: 'center', transform: [{ translateY: anim }],
      zIndex: 9999, backgroundColor: bg, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 30,
      shadowColor: "#000", shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.25, shadowRadius: 12
    }}>
      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>{text}</Text>
    </Animated.View>
  );
};

// ===== Main Screen =====
const EditHome = (props) => {
  const navigation = useNavigation();
  const database = getDatabase();
  const systemScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const id = props.route.params.id;
  const user = firebase.auth().currentUser;

  // --- State ---
  const [themeMode, setThemeMode] = useState('auto');
  const theme = useTheme(themeMode, systemScheme);
  const [eventDetails, setEventDetails] = useState(null);

  // Form Fields
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [Address, setAddress] = useState('');
  const [Phone_Number, setPhoneNumber] = useState('');
  const [Numberofguests, setNumberofguests] = useState('');
  const [budget, setBudget] = useState('');
  const [spend, setSpend] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [firstOwnerName, setFirstOwnerName] = useState('');
  const [secondOwnerName, setSecondOwnerName] = useState('');

  // Payments
  const [wantCardGifts, setWantCardGifts] = useState(false);
  const [bitEnabled, setBitEnabled] = useState(false);
  const [bitLink, setBitLink] = useState('');
  const [payboxEnabled, setPayboxEnabled] = useState(false);
  const [payboxLink, setPayboxLink] = useState('');

  // ✅ Date picker (fix for Web + iOS)
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: '', type: 'info' });

  // Calculated
  const ymd = toYMD(safeDate(eventDate));
  const budgetNum = Number(sanitizeDigits(budget)) || 0;
  const spendNum = Number(sanitizeDigits(spend)) || 0;
  const guestsNum = Number(sanitizeDigits(Numberofguests)) || 0;

  // Dirty Check
  const initialSnapshotRef = useRef(null);
  const currentSnapshot = JSON.stringify({
    eventName, eventCategory, ymd, eventTime, eventLocation, Address, Phone_Number,
    Numberofguests, budget, spend, eventDescription, firstOwnerName, secondOwnerName,
    payments: { wantCardGifts, bitEnabled, bitLink, payboxEnabled, payboxLink },
    themeMode,
  });
  const isDirty = initialSnapshotRef.current && initialSnapshotRef.current !== currentSnapshot;

  // --- Load Data ---
  useEffect(() => {
    if (!user || !id) return;
    const eventRef = ref(database, `Events/${user.uid}/${id}/`);
    const unsub = onValue(eventRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      setEventDetails(data);
      if (data?.ui?.theme?.mode) setThemeMode(data.ui.theme.mode);
    });
    return () => unsub();
  }, [user, id, database]);

  useEffect(() => {
    if (!eventDetails) return;

    const loadedDate = parseEventDateMaybe(eventDetails.eventDate);

    setEventName(eventDetails.eventName ?? id ?? '');
    setEventCategory(eventDetails.eventCategory ?? '');
    setEventDate(loadedDate);
    setTempDate(loadedDate);
    setEventTime(eventDetails.eventTime ?? '');
    setEventLocation(eventDetails.eventLocation ?? '');
    setAddress(eventDetails.Address ?? '');
    setPhoneNumber(eventDetails.Phone_Number ?? '');
    setNumberofguests(String(eventDetails.Numberofguests ?? ''));
    setBudget(String(eventDetails.budget ?? ''));
    setSpend(String(eventDetails.spend ?? ''));
    setEventDescription(eventDetails.eventDescription ?? '');
    setFirstOwnerName(eventDetails.firstOwnerName ?? '');
    setSecondOwnerName(eventDetails.secondOwnerName ?? '');

    const p = eventDetails.payments || {};
    setWantCardGifts(!!p.wantCardGifts);
    setBitEnabled(!!p.bit?.enabled);
    setBitLink(p.bit?.link ?? '');
    setPayboxEnabled(!!p.paybox?.enabled);
    setPayboxLink(p.paybox?.link ?? '');

    setTimeout(() => {
      initialSnapshotRef.current = JSON.stringify({
        eventName: eventDetails.eventName ?? id ?? '',
        eventCategory: eventDetails.eventCategory ?? '',
        ymd: toYMD(loadedDate),
        eventTime: eventDetails.eventTime ?? '',
        eventLocation: eventDetails.eventLocation ?? '',
        Address: eventDetails.Address ?? '',
        Phone_Number: eventDetails.Phone_Number ?? '',
        Numberofguests: String(eventDetails.Numberofguests ?? ''),
        budget: String(eventDetails.budget ?? ''),
        spend: String(eventDetails.spend ?? ''),
        eventDescription: eventDetails.eventDescription ?? '',
        firstOwnerName: eventDetails.firstOwnerName ?? '',
        secondOwnerName: eventDetails.secondOwnerName ?? '',
        payments: {
          wantCardGifts: !!(eventDetails.payments?.wantCardGifts),
          bitEnabled: !!(eventDetails.payments?.bit?.enabled),
          bitLink: eventDetails.payments?.bit?.link ?? '',
          payboxEnabled: !!(eventDetails.payments?.paybox?.enabled),
          payboxLink: eventDetails.payments?.paybox?.link ?? '',
        },
        themeMode: (eventDetails?.ui?.theme?.mode || 'auto'),
      });
    }, 150);
  }, [eventDetails, id]);

  // --- Handlers ---
  const handleTimeChange = (input) => {
    const s = input.replace(/[^0-9]/g, '');
    if (s.length <= 4) {
      setEventTime(s.length > 2 ? `${s.slice(0, 2)}:${s.slice(2)}` : s);
    }
  };

  // ✅ Open date picker (platform aware)
  const openDatePicker = () => {
    const d = safeDate(eventDate);
    setTempDate(d);

    if (Platform.OS === 'android') {
      setShowAndroidDatePicker(true);
      return;
    }

    // iOS + Web -> modal (inline on iOS, browser date input on Web)
    setDateModalOpen(true);
  };

  // ✅ Android onChange FIX (dismissed / set)
  const onAndroidDateChange = (event, selectedDate) => {
    // event.type: "dismissed" | "set" (on Android)
    if (event?.type === 'dismissed') {
      setShowAndroidDatePicker(false);
      return;
    }
    setShowAndroidDatePicker(false);
    if (selectedDate) setEventDate(selectedDate);
  };

  const handleSave = async () => {
    if (!isValidTimeHHmm(eventTime)) return setToast({ visible: true, text: 'שעה לא תקינה (19:30)', type: 'error' });
    if (!eventName || !budget) return setToast({ visible: true, text: 'יש להזין שם אירוע ותקציב', type: 'error' });

    setSaving(true);
    try {
      const updates = {
        eventName,
        eventCategory,
        eventDate: toYMD(safeDate(eventDate)),
        eventTime,
        eventLocation,
        Address,
        Phone_Number,
        Numberofguests: sanitizeDigits(Numberofguests),
        budget: sanitizeDigits(budget),
        spend: sanitizeDigits(spend),
        eventDescription,
        firstOwnerName,
        secondOwnerName,
        payments: {
          wantCardGifts,
          bit: { enabled: bitEnabled, link: bitLink },
          paybox: { enabled: payboxEnabled, link: payboxLink },
          updatedAt: Date.now()
        },
        ui: { theme: { mode: themeMode } },
        updatedAt: Date.now()
      };

      await update(ref(database, `Events/${user.uid}/${id}`), updates);
      await push(ref(database, `Events/${user.uid}/${id}/__admin/audit`), { action: 'Event Updated', ts: Date.now() });

      initialSnapshotRef.current = currentSnapshot;
      setToast({ visible: true, text: 'נשמר בהצלחה!', type: 'success' });
    } catch (e) {
      setToast({ visible: true, text: 'שגיאה בשמירה', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, delay, children }) => (
    <FadeInView delay={delay} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>{title}</Text>
      {children}
    </FadeInView>
  );

  // --- Render ---
  const d = safeDate(eventDate);
  const dayName = format(d, "EEEE", { locale: he });
  const dateStr = format(d, "dd/MM/yyyy");

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Toast {...toast} onHide={() => setToast(p => ({ ...p, visible: false }))} theme={theme} topInset={insets.top} />

      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 18),
        paddingBottom: 14,
        paddingHorizontal: 18,
        backgroundColor: theme.surface,
        borderBottomColor: theme.border
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
          <Text style={{ fontSize: 20, color: theme.text }}>➔</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>עריכת אירוע</Text>
          <Text style={[styles.headerSub, { color: theme.subText }]} numberOfLines={1}>
            {eventName || 'טוען...'}
          </Text>
        </View>

        <View style={styles.headerBtnPlaceholder} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.centerContainer}>

            {/* Hero Stats */}
            <FadeInView delay={0} style={[styles.heroCard, { backgroundColor: theme.primary }]}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: '700' }}>תקציב כולל</Text>
                  <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 0.2 }}>
                    {formatCurrencyILS(budgetNum)}
                  </Text>
                </View>

                <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>{guestsNum}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700' }}>מוזמנים</Text>
                </View>
              </View>

              <View style={{ height: 7, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 6, overflow: 'hidden' }}>
                <View style={{ width: `${budgetNum > 0 ? Math.min((spendNum / budgetNum) * 100, 100) : 0}%`, height: '100%', backgroundColor: '#FFF' }} />
              </View>

              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: '#FFF', fontSize: 12, opacity: 0.92, fontWeight: '700' }}>נוצל: {formatCurrencyILS(spendNum)}</Text>
                <Text style={{ color: '#FFF', fontSize: 12, opacity: 0.92, fontWeight: '700' }}>נותר: {formatCurrencyILS(Math.max(budgetNum - spendNum, 0))}</Text>
              </View>
            </FadeInView>

            {/* Details Section */}
            <Section title="פרטים כלליים" delay={100}>
              <AnimatedInput label="שם האירוע" value={eventName} onChangeText={setEventName} theme={theme} />

              <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ textAlign: 'right', color: theme.subText, fontSize: 12, marginBottom: 6, marginRight: 8, fontWeight: '700' }}>
                    תאריך האירוע
                  </Text>

                  <Pressable
                    onPress={openDatePicker}
                    android_ripple={{ color: 'rgba(108,99,255,0.18)' }}
                    style={({ pressed }) => ([
                      styles.dateCard,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        opacity: pressed ? 0.92 : 1,
                      }
                    ])}
                  >
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.iconBubble, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={{ fontSize: 18 }}>📅</Text>
                      </View>

                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: theme.text, textAlign: 'right' }}>
                          {dateStr}
                        </Text>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <View style={[styles.pill, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <Text style={{ fontSize: 12, color: theme.subText, fontWeight: '800' }}>{dayName}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: theme.subText, fontWeight: '700' }}>לחץ לשינוי</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontSize: 18, color: theme.subText }}>›</Text>
                  </Pressable>
                </View>

                <View style={{ flex: 0.8 }}>
                  <AnimatedInput
                    label="שעה"
                    value={eventTime}
                    onChangeText={handleTimeChange}
                    keyboardType="numeric"
                    placeholder="19:30"
                    theme={theme}
                    alignCenter
                  />
                </View>
              </View>

              {/* ✅ ANDROID DateTimePicker (fixed) */}
              {showAndroidDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={safeDate(eventDate)}
                  mode="date"
                  display="calendar"
                  onChange={onAndroidDateChange}
                />
              )}

              <AnimatedInput label="מיקום" value={eventLocation} onChangeText={setEventLocation} theme={theme} />
              <AnimatedInput label="כתובת" value={Address} onChangeText={setAddress} theme={theme} />

              <TouchableOpacity
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={[styles.pickerBtn, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
                activeOpacity={0.85}
              >
                <Text style={{ color: eventCategory ? theme.text : theme.subText, fontSize: 16, fontWeight: '800' }}>
                  {eventCategory || 'בחר קטגוריה'}
                </Text>
                <Text style={{ fontSize: 18 }}>📂</Text>
              </TouchableOpacity>

              {showCategoryPicker && (
                <View style={{ backgroundColor: theme.inputBg, borderRadius: 14, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                  <Picker
                    selectedValue={eventCategory}
                    onValueChange={(v) => { setEventCategory(v); setShowCategoryPicker(false); }}
                  >
                    <Picker.Item label="חתונה" value="חתונה" />
                    <Picker.Item label="בר/בת מצווה" value="בר מצווה" />
                    <Picker.Item label="ברית/ה" value="ברית" />
                    <Picker.Item label="אחר" value="אחר" />
                  </Picker>
                </View>
              )}
            </Section>

            {/* Financials Section */}
            <Section title="פיננסים" delay={200}>
              <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <AnimatedInput label="כמות אורחים" value={Numberofguests} onChangeText={(t) => setNumberofguests(sanitizeDigits(t))} keyboardType="numeric" theme={theme} />
                </View>
                <View style={{ flex: 1 }}>
                  <AnimatedInput label="תקציב" value={budget} onChangeText={(t) => setBudget(sanitizeDigits(t))} keyboardType="numeric" theme={theme} />
                </View>
              </View>
              <AnimatedInput label="הוצאות בפועל" value={spend} onChangeText={(t) => setSpend(sanitizeDigits(t))} keyboardType="numeric" theme={theme} />
              <BudgetBar spend={spendNum} budget={budgetNum} theme={theme} />
            </Section>

            {/* Contacts Section */}
            <Section title="אנשי קשר" delay={300}>
              <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <AnimatedInput label="בעלים 1" value={firstOwnerName} onChangeText={setFirstOwnerName} theme={theme} />
                </View>
                <View style={{ flex: 1 }}>
                  <AnimatedInput label="בעלים 2" value={secondOwnerName} onChangeText={setSecondOwnerName} theme={theme} />
                </View>
              </View>
              <AnimatedInput label="טלפון ראשי" value={Phone_Number} onChangeText={(t) => setPhoneNumber(sanitizeDigits(t))} keyboardType="phone-pad" theme={theme} />
            </Section>

            {/* Payments Section */}
            <Section title="מתנות ותשלומים" delay={400}>
              <View style={[styles.rowBetween, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>מתנות באשראי</Text>
                <ModernSwitch value={wantCardGifts} onValueChange={setWantCardGifts} theme={theme} />
              </View>

              <View style={[styles.rowBetween, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>תשלום ב-Bit</Text>
                <ModernSwitch value={bitEnabled} onValueChange={setBitEnabled} theme={theme} />
              </View>
              {bitEnabled && <AnimatedInput label="לינק ל-Bit" value={bitLink} onChangeText={setBitLink} theme={theme} />}

              <View style={[styles.rowBetween, { borderColor: theme.border, borderBottomWidth: 0 }]}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>תשלום ב-PayBox</Text>
                <ModernSwitch value={payboxEnabled} onValueChange={setPayboxEnabled} theme={theme} />
              </View>
              {payboxEnabled && <AnimatedInput label="לינק ל-PayBox" value={payboxLink} onChangeText={setPayboxLink} theme={theme} />}
            </Section>

            {/* Theme Section */}
            <Section title="ערכת נושא" delay={500}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-evenly', marginVertical: 8 }}>
                {['auto', 'light', 'dark'].map(mode => (
                  <TouchableOpacity key={mode} onPress={() => setThemeMode(mode)} style={{ alignItems: 'center' }} activeOpacity={0.85}>
                    <View style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: theme.inputBg,
                      borderWidth: themeMode === mode ? 2 : 1,
                      borderColor: themeMode === mode ? theme.primary : theme.border,
                      justifyContent: 'center', alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 20 }}>{mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '⚙️'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, marginTop: 6, color: theme.subText, fontWeight: '800' }}>
                      {mode === 'auto' ? 'אוטו' : mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ Date Modal (iOS + Web) */}
      <Modal visible={dateModalOpen} transparent animationType="fade" onRequestClose={() => setDateModalOpen(false)}>
        <Pressable style={[styles.modalOverlay]} onPress={() => setDateModalOpen(false)}>
<Pressable
  style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
  onPress={(e) => e?.stopPropagation?.()}
>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>בחר תאריך</Text>
              <TouchableOpacity onPress={() => setDateModalOpen(false)} style={[styles.closeX, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' && (
              <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                <DateTimePicker
                  value={safeDate(tempDate)}
                  mode="date"
                  display="inline"
                  onChange={(_, selectedDate) => selectedDate && setTempDate(selectedDate)}
                  style={{ backgroundColor: theme.surface }}
                />
              </View>
            )}

              {Platform.OS === 'web' && (
  <View style={{ marginTop: 8 }}>
    <Text
      style={{
        textAlign: 'right',
        color: theme.subText,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
      }}
    >
      בחר תאריך (יפתח לוח שנה בכרום)
    </Text>

    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.inputBg,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <input
        type="date"
        value={toYMD(safeDate(tempDate))}
        onChange={(e) => setTempDate(parseEventDateMaybe(e.target.value))}
        onClick={(e) => e.stopPropagation()} // כדי שלא יסגור את המודל בלחיצה
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: theme.text,
          fontSize: 16,
          fontWeight: 800,
          direction: 'rtl',
          textAlign: 'right',
          padding: '10px 6px',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      />
    </View>
  </View>
)}


            <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setDateModalOpen(false)}
                style={[styles.modalBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                activeOpacity={0.85}
              >
                <Text style={{ color: theme.text, fontWeight: '900' }}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setEventDate(safeDate(tempDate)); setDateModalOpen(false); }}
                style={[styles.modalBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#FFF', fontWeight: '900' }}>שמירה</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Bottom Bar */}
      <View style={[styles.bottomBar, {
        backgroundColor: theme.surface,
        borderTopColor: theme.border,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 18
      }]}>
        <View>
          <Text style={{ fontSize: 12, color: theme.subText, textAlign: 'left', fontWeight: '800' }}>סטטוס שמירה</Text>
          <Text style={{ fontSize: 14, fontWeight: '900', color: isDirty ? theme.warn : theme.success }}>
            {isDirty ? 'יש שינויים • לא שמור' : 'הכל מעודכן ✓'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: saving ? '#9CA3AF' : theme.primary }]}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    zIndex: 10
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  headerBtnPlaceholder: { width: 42 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSub: { fontSize: 12, marginTop: 2, maxWidth: 220 },

  scrollContent: { paddingTop: 18, width: '100%' },

  centerContainer: {
    width: '88%',
    maxWidth: 620,
    alignSelf: 'center',
  },

  heroCard: {
    borderRadius: 26, padding: 22, marginBottom: 22,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 10
  },

  card: {
    borderRadius: 22, padding: 18, marginBottom: 18,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3
  },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 14, textAlign: 'right', letterSpacing: 0.4 },

  dateCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
    height: 64,
    marginBottom: 16,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  pickerBtn: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderWidth: 1, borderRadius: 16, marginBottom: 16
  },

  rowBetween: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 14, borderTopWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 20
  },
  saveBtn: {
    paddingVertical: 14, paddingHorizontal: 26, borderRadius: 999,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 5
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  closeX: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  }
});

export default EditHome;
