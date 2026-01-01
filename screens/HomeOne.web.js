import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';

import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { getDatabase, ref, set } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

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

const hebrewMonths = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
];

const pad2 = (n) => String(n).padStart(2, '0');

const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const formatTimeHHmm = (dateObj) => {
  if (!dateObj) return '';
  return `${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`;
};

const addDays = (yyyyMmDd, daysToAdd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

// מונע “קפיצת scroll/focus” ב-Web כשבוחרים יום
const NoJumpWrapper = ({ children }) => {
  if (Platform.OS !== 'web') return children;
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        try { e?.preventDefault?.(); } catch {}
      }}
    >
      {children}
    </View>
  );
};

/**
 * WheelList (קרוסלה) – בלי כפתור אישור:
 * לחיצה על פריט => onPick(value)
 */
const WheelList = ({ items, value, onPick, height = 230, itemHeight = 46 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const idx = Math.max(0, items.findIndex((x) => x.value === value));
    const y = idx * itemHeight;
    setTimeout(() => {
      try { ref.current?.scrollTo({ y, animated: false }); } catch {}
    }, 0);
  }, [items, value, itemHeight]);

  return (
    <View style={[styles.wheelContainer, { height }]}>
      <View
        pointerEvents="none"
        style={[
          styles.wheelCenterHighlight,
          { top: (height - itemHeight) / 2, height: itemHeight }
        ]}
      />

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: (height - itemHeight) / 2,
        }}
      >
        {items.map((it) => {
          const active = it.value === value;
          const disabled = !!it.disabled;

          return (
            <Pressable
              key={String(it.value)}
              onPress={() => !disabled && onPick(it.value)}
              style={({ pressed }) => [
                styles.wheelItem,
                { height: itemHeight },
                disabled && styles.wheelItemDisabled,
                pressed && !disabled && { opacity: 0.85 }
              ]}
            >
              <Text
                style={[
                  styles.wheelItemText,
                  active && styles.wheelItemTextActive,
                  disabled && styles.wheelItemTextDisabled,
                ]}
              >
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default function HomeOne({ route }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();

  const user = firebase.auth().currentUser;
  const database = getDatabase();
  const { finalEventName } = route.params;

  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  // אנימציות
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  // בחירות
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState(null); // מובייל

  // חודש/שנה מוצגים בלוח
  const [calendarCurrent, setCalendarCurrent] = useState(() => `${getTodayLocal().slice(0, 7)}-01`);

  // מודלים (יום / חודש / שנה)
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [yearModalOpen, setYearModalOpen] = useState(false);

  // מודל שעה
  const [timeModalOpen, setTimeModalOpen] = useState(false);

  // זמניים
  const now = new Date();
  const [tempDay, setTempDay] = useState(now.getDate());
  const [tempMonth, setTempMonth] = useState(now.getMonth() + 1);
  const [tempYear, setTempYear] = useState(now.getFullYear());
  const [tempTime, setTempTime] = useState(() => new Date()); // מובייל iOS spinner

  // Web time
  const [webTimeModalOpen, setWebTimeModalOpen] = useState(false);
  const [webHour, setWebHour] = useState('19');
  const [webMinute, setWebMinute] = useState('30');

  const effectiveTimeLabel = useMemo(() => {
    if (isWeb) return `${webHour}:${webMinute}`;
    return selectedTime ? formatTimeHHmm(selectedTime) : '';
  }, [isWeb, webHour, webMinute, selectedTime]);

  const canProceed = !!(selectedDate && effectiveTimeLabel);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.spring(ctaScale, {
      toValue: canProceed ? 1.05 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [canProceed]);

  useEffect(() => {
    const anyOpen = dayModalOpen || monthModalOpen || yearModalOpen || timeModalOpen || webTimeModalOpen;
    if (anyOpen) {
      modalAnim.setValue(0);
      Animated.spring(modalAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [dayModalOpen, monthModalOpen, yearModalOpen, timeModalOpen, webTimeModalOpen]);

  const modalCardAnimStyle = {
    opacity: modalAnim,
    transform: [
      {
        translateY: modalAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: modalAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  const getYM = (currentStr) => {
    const [yy, mm] = currentStr.split('-');
    return { y: Number(yy), m: Number(mm) };
  };

  const setMonthYear = (year, month) => {
    setCalendarCurrent(`${year}-${pad2(month)}-01`);
  };

  const jumpToDateYM = (yyyyMmDd) => {
    const [y, m] = yyyyMmDd.split('-');
    setCalendarCurrent(`${y}-${m}-01`);
  };

  const onDayPressCalendar = (day) => {
    const today = getTodayLocal();
    if (day.dateString < today) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תאריך שהוא בעבר');
      return;
    }
    setSelectedDate(day.dateString);
    jumpToDateYM(day.dateString);
  };

  const openMonthModal = () => {
    const { y, m } = getYM(calendarCurrent);
    setTempYear(y);
    setTempMonth(m);
    setMonthModalOpen(true);
  };

  const openYearModal = () => {
    const { y, m } = getYM(calendarCurrent);
    setTempYear(y);
    setTempMonth(m);
    setYearModalOpen(true);
  };

  const openDayModal = () => {
    const { y, m } = getYM(calendarCurrent);
    let initialDay = 1;

    if (selectedDate?.startsWith(`${y}-${pad2(m)}`)) {
      initialDay = Number(selectedDate.split('-')[2]);
    } else {
      const t = new Date();
      if (t.getFullYear() === y && (t.getMonth() + 1) === m) initialDay = t.getDate();
      else initialDay = 1;
    }

    setTempYear(y);
    setTempMonth(m);
    setTempDay(initialDay);
    setDayModalOpen(true);
  };

  const openTimePicker = () => {
    if (isWeb) {
      setWebTimeModalOpen(true);
      return;
    }
    const base = selectedTime ? new Date(selectedTime) : new Date();
    setTempTime(base);
    setTimeModalOpen(true);
  };

  const monthItems = useMemo(
    () => hebrewMonths.map((name, idx) => ({ label: name, value: idx + 1 })),
    []
  );

  const yearItems = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 35 }, (_, i) => (base - 2 + i)).map((y) => ({
      label: String(y),
      value: y,
    }));
  }, []);

  const dayItems = useMemo(() => {
    const max = daysInMonth(tempYear, tempMonth);
    const today = getTodayLocal();

    return Array.from({ length: max }, (_, i) => {
      const day = i + 1;
      const dateStr = `${tempYear}-${pad2(tempMonth)}-${pad2(day)}`;
      const disabled = dateStr < today;
      return { label: String(day), value: day, disabled };
    });
  }, [tempYear, tempMonth]);

  const calendarHeader = useMemo(() => {
    const { y, m } = getYM(calendarCurrent);
    const monthName = hebrewMonths[m - 1];
    const shownDay = selectedDate?.startsWith(`${y}-${pad2(m)}`)
      ? Number(selectedDate.split('-')[2])
      : null;

    return (
      <View>
        <View style={styles.calHeader}>
          <TouchableOpacity style={styles.pill} activeOpacity={0.9} onPress={openDayModal}>
            <Text style={styles.pillLabel}>יום</Text>
            <Text style={styles.pillValue}>{shownDay ? shownDay : '—'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pill} activeOpacity={0.9} onPress={openMonthModal}>
            <Text style={styles.pillLabel}>חודש</Text>
            <Text style={styles.pillValue}>{monthName}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pill} activeOpacity={0.9} onPress={openYearModal}>
            <Text style={styles.pillLabel}>שנה</Text>
            <Text style={styles.pillValue}>{y}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBadgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedDate ? selectedDate : 'לא נבחר'}</Text>
          </View>
        </View>
      </View>
    );
  }, [calendarCurrent, selectedDate]);

  const calendarHeight = Math.max(
    320,
    Math.min(isTablet ? 440 : 380, Math.floor(height * (isTablet ? 0.46 : 0.42)))
  );

  const handleSave = async () => {
    if (!selectedDate) {
      Alert.alert('שגיאה', 'בחר תאריך.');
      return;
    }

    const timeStr = effectiveTimeLabel;
    if (!timeStr) {
      Alert.alert('שגיאה', 'בחר שעה.');
      return;
    }

    const formattedDate = selectedDate;
    const formattedTime = timeStr;
    const nextDayFormatted = addDays(formattedDate, 1);

    try {
      await set(ref(database, `Events/${user.uid}/${finalEventName}/eventDate/`), formattedDate);
      await set(ref(database, `Events/${user.uid}/${finalEventName}/eventTime/`), formattedTime);

      const defaultTableData = [
        { id: '1', col1: '00.00.0000', col2: '300', col3: '0', col4: 'הזמנות',  col5: '1' },
        { id: '2', col1: '00.00.0000', col2: '300', col3: '0', col4: 'תזכורת', col5: '2' },
        { id: '3', col1: formattedDate, col2: '300', col3: '0', col4: 'יום חתונה', col5: '3' },
        { id: '4', col1: nextDayFormatted, col2: '300', col3: '0', col4: 'תודה רבה', col5: '4' },
      ];

      await set(ref(database, `Events/${user.uid}/${finalEventName}/Table_RSVPs/`), defaultTableData);
      navigation.navigate('HomeTwo', { finalEventName });
    } catch {
      Alert.alert('שגיאה', 'נכשל בשמירה, נסה שוב.');
    }
  };

  const QuickPickModal = ({ visible, onClose, title, subtitle, children }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.modalCard, isTablet && { maxWidth: 620 }, modalCardAnimStyle]}>
          <View style={styles.modalTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{title}</Text>
              {!!subtitle && <Text style={styles.modalSub}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {children}

          <Text style={styles.modalHint}>טיפ: לחיצה על ערך תבחר ותסגור מיד.</Text>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <ImageBackground
      source={require('../assets/Home_two2.png')}
      style={styles.bg}
      imageStyle={{ resizeMode: 'cover' }}
    >
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 18 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Text style={styles.title}>מתי אנחנו חוגגים?</Text>
              <Text style={styles.subtitle}>בחר יום, חודש, שנה ושעה — וממשיכים.</Text>
            </View>

            {/* Calendar Card */}
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              {/* ✅ שכבת "זכוכית" פנימית שנותנת קריאות אבל לא חוסמת את הרקע */}
              <View style={styles.glassInner}>
                <NoJumpWrapper>
                  <Calendar
                    style={{ height: calendarHeight, borderRadius: 16, overflow: 'hidden' }}
                    current={calendarCurrent}
                    enableSwipeMonths={true}
                    hideArrows={true}
                    onMonthChange={(m) => setCalendarCurrent(`${m.year}-${pad2(m.month)}-01`)}
                    onDayPress={onDayPressCalendar}
                    minDate={getTodayLocal()}
                    showSixWeeks={true}
                    hideExtraDays={false}
                    disableAllTouchEventsForDisabledDays={true}
                    renderHeader={() => calendarHeader}
                    markedDates={{
                      ...(selectedDate
                        ? { [selectedDate]: { selected: true, selectedColor: 'rgba(108, 99, 255, 0.95)' } }
                        : {}),
                    }}
                    theme={{
                      calendarBackground: 'transparent',
                      todayTextColor: 'rgba(108, 99, 255, 0.95)',
                      dayTextColor: '#222',
                      textDisabledColor: '#cfcfcf',
                      textDayFontSize: 15,
                      textDayHeaderFontSize: 12,
                      textDayFontFamily: Platform.select({ ios: 'System', android: 'System' }),
                      textMonthFontFamily: Platform.select({ ios: 'System', android: 'System' }),
                      textDayHeaderFontFamily: Platform.select({ ios: 'System', android: 'System' }),
                    }}
                  />
                </NoJumpWrapper>
              </View>
            </View>

            {/* Time Card */}
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              <View style={styles.glassInner}>
                <View style={styles.cardHeaderRowCenter}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{effectiveTimeLabel ? effectiveTimeLabel : 'לא נבחר'}</Text>
                  </View>
                </View>

                <Text style={styles.hint}>בחר שעה בצורה נוחה.</Text>

                <TouchableOpacity style={styles.timeBtn} activeOpacity={0.9} onPress={openTimePicker}>
                  <View style={styles.timeBtnIcon}>
                    <Text style={styles.timeBtnIconText}>🕒</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeBtnTitle}>{effectiveTimeLabel ? 'שנה שעה' : 'בחר שעה'}</Text>
                    <Text style={styles.timeBtnSub}>
                      {effectiveTimeLabel ? `השעה שנבחרה: ${effectiveTimeLabel}` : 'בחר שעה ודקות'}
                    </Text>
                  </View>
                  <Text style={styles.timeBtnChevron}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CTA */}
            <Animated.View style={{ transform: [{ scale: ctaScale }], alignSelf: 'center', marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.cta, !canProceed && styles.ctaDisabled]}
                activeOpacity={0.9}
                disabled={!canProceed}
                onPress={handleSave}
              >
                <Text style={styles.ctaText}>המשך</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={{ height: 12 }} />
          </ScrollView>
        </Animated.View>

        {/* ===== מודל יום ===== */}
        <QuickPickModal
          visible={dayModalOpen}
          onClose={() => setDayModalOpen(false)}
          title="בחירת יום"
          subtitle="לחץ על יום — זה ייבחר ויסגור."
        >
          <WheelList
            items={dayItems}
            value={tempDay}
            onPick={(day) => {
              setTempDay(day);

              const dateStr = `${tempYear}-${pad2(tempMonth)}-${pad2(day)}`;
              const today = getTodayLocal();
              if (dateStr < today) return;

              setSelectedDate(dateStr);
              setMonthYear(tempYear, tempMonth);
              setDayModalOpen(false);
            }}
          />
        </QuickPickModal>

        {/* ===== מודל חודש ===== */}
        <QuickPickModal
          visible={monthModalOpen}
          onClose={() => setMonthModalOpen(false)}
          title="בחירת חודש"
          subtitle="לחץ על חודש — זה ייבחר ויסגור."
        >
          <WheelList
            items={monthItems}
            value={tempMonth}
            onPick={(m) => {
              setTempMonth(m);
              const max = daysInMonth(tempYear, m);
              if (tempDay > max) setTempDay(max);
              setMonthYear(tempYear, m);
              setMonthModalOpen(false);
            }}
          />
        </QuickPickModal>

        {/* ===== מודל שנה ===== */}
        <QuickPickModal
          visible={yearModalOpen}
          onClose={() => setYearModalOpen(false)}
          title="בחירת שנה"
          subtitle="לחץ על שנה — זה ייבחר ויסגור."
        >
          <WheelList
            items={yearItems}
            value={tempYear}
            onPick={(y) => {
              setTempYear(y);
              const max = daysInMonth(y, tempMonth);
              if (tempDay > max) setTempDay(max);
              setMonthYear(y, tempMonth);
              setYearModalOpen(false);
            }}
          />
        </QuickPickModal>

        {/* ===== מודל שעה (מובייל) ===== */}
        {!isWeb && (
          <Modal visible={timeModalOpen} transparent animationType="fade" onRequestClose={() => setTimeModalOpen(false)}>
            <View style={styles.modalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setTimeModalOpen(false)} />
              <Animated.View style={[styles.modalCard, isTablet && { maxWidth: 620 }, modalCardAnimStyle]}>
                <View style={styles.modalTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>בחירת שעה</Text>
                    <Text style={styles.modalSub}>בחר שעה ודקות ואז סגור עם X.</Text>
                  </View>
                  <Pressable onPress={() => setTimeModalOpen(false)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    is24Hour={true}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') {
                        if (event?.type === 'dismissed') return;
                        if (date) {
                          setSelectedTime(date);
                          setTimeModalOpen(false);
                        }
                        return;
                      }
                      if (date) setTempTime(date);
                    }}
                  />
                </View>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.cta, { width: '100%', marginTop: 12 }]}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedTime(tempTime);
                      setTimeModalOpen(false);
                    }}
                  >
                    <Text style={styles.ctaText}>סגור ושמור שעה</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* ===== מודל שעה (Web) ===== */}
        {isWeb && (
          <Modal visible={webTimeModalOpen} transparent animationType="fade" onRequestClose={() => setWebTimeModalOpen(false)}>
            <View style={styles.modalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setWebTimeModalOpen(false)} />
              <Animated.View style={[styles.modalCard, { width: Math.min(width - 28, 620) }, modalCardAnimStyle]}>
                <View style={styles.modalTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>בחירת שעה</Text>
                    <Text style={styles.modalSub}>בחר שעה ואז דקות (סגירה אחרי דקות).</Text>
                  </View>
                  <Pressable onPress={() => setWebTimeModalOpen(false)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: width < 420 ? 'column' : 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.webLabel}>שעה</Text>
                    <WheelList
                      items={Array.from({ length: 24 }, (_, i) => ({ label: pad2(i), value: pad2(i) }))}
                      value={webHour}
                      onPick={(h) => {
                        setWebHour(h);
                      }}
                      height={210}
                      itemHeight={44}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.webLabel}>דקות</Text>
                    <WheelList
                      items={Array.from({ length: 60 }, (_, i) => ({ label: pad2(i), value: pad2(i) }))}
                      value={webMinute}
                      onPick={(m) => {
                        setWebMinute(m);
                        setWebTimeModalOpen(false);
                      }}
                      height={210}
                      itemHeight={44}
                    />
                  </View>
                </View>
              </Animated.View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bg: { flex: 1, width: '100%', justifyContent: 'flex-start' },

  hero: { paddingHorizontal: 16, paddingBottom: 8, marginTop: 18 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: 'rgba(108, 99, 255, 0.98)',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 42,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(20,20,20,0.70)',
    textAlign: 'center',
  },

  // ✅ שינוי מרכזי: card שקוף יותר כדי לראות את התמונה מאחורה
  card: {
    marginTop: 14,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.28)', // היה 0.92
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTablet: { marginHorizontal: 24, padding: 14 },

  // ✅ שכבת "glass" פנימית לקריאות (אבל עדיין שקופה)
  glassInner: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  cardHeaderRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(108,99,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.18)',
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(108, 99, 255, 0.95)',
    textAlign: 'center',
  },

  headerBadgeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 6,
  },

  calHeader: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  pill: {
    flexGrow: 1,
    minWidth: 92,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(108,99,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(108,99,255,0.65)',
    marginBottom: 2,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(108,99,255,0.98)',
  },

  hint: { fontSize: 12, fontWeight: '700', color: 'rgba(20,20,20,0.65)', marginBottom: 10 },

  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  timeBtnIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(108,99,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnIconText: { fontSize: 18 },
  timeBtnTitle: { fontSize: 14, fontWeight: '900', color: '#141414' },
  timeBtnSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: 'rgba(20,20,20,0.60)' },
  timeBtnChevron: { fontSize: 22, fontWeight: '900', color: 'rgba(108,99,255,0.60)', marginLeft: 6 },

  cta: {
    marginTop: 14,
    width: 260,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(108, 99, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  ctaDisabled: { backgroundColor: 'rgba(170,170,170,0.95)' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  modalCard: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#111', textAlign: 'right' },
  modalSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#666', textAlign: 'right' },
  modalHint: { marginTop: 10, fontSize: 11, fontWeight: '700', color: 'rgba(0,0,0,0.45)', textAlign: 'center' },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, fontWeight: '900', color: '#333' },

  pickerWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    paddingVertical: Platform.OS === 'ios' ? 6 : 0,
  },

  wheelContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  wheelCenterHighlight: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(108,99,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.16)',
    zIndex: 2,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  wheelItemDisabled: { opacity: 0.45 },
  wheelItemText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
  },
  wheelItemTextActive: {
    color: 'rgba(108,99,255,0.98)',
    fontWeight: '900',
    fontSize: 17,
  },
  wheelItemTextDisabled: { color: '#999' },

  webLabel: { fontSize: 12, fontWeight: '900', color: '#333', marginBottom: 8, textAlign: 'center' },
});
