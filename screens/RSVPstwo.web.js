import React, { useMemo, useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getDatabase, ref, onValue, get } from 'firebase/database';

// --- Firebase Config (נשאר כפי שהיה) ---
const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const normalizeThemeMode = (v) => {
  const s = String(v || '').toLowerCase().trim();
  if (s === 'dark' || s === 'light' || s === 'auto') return s;
  return 'auto';
};

const RSVPstwo = (props) => {
  const insets = useSafeAreaInsets();
  const id = props.route.params?.id;
  const screenWidth = Dimensions.get('window').width;

  const database = getDatabase();

  // ✅ user כ-state כדי שהליסנרים ירוצו רק אחרי שהיוזר נטען
  const [user, setUser] = useState(firebase.auth().currentUser);
  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  // ✅ Theme mode from Firebase: auto/light/dark
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('auto');

  // ✅ Resolver: מחפש איפה באמת נמצא ה-mode אצלך ואז מאזין רק לנתיב הזה
  useEffect(() => {
    if (!user?.uid || !id) return;

    let unsubscribe = null;
    let cancelled = false;

    const candidates = [
      `Events/${user.uid}/${id}/Table_RSVPs/__admin/audit/ui/theme/mode`, // כמו שביקשת
      `Events/${user.uid}/${id}/__admin/audit/ui/theme/mode`,            // לפעמים זה פה
      `Events/${user.uid}/${id}/__admin/ui/theme/mode`,                  // לפעמים בלי audit
      `Events/${user.uid}/${id}/admin/ui/theme/mode`,                    // אם יש "admin" בלי __
      `Events/${user.uid}/${id}/Table_RSVPs/__admin/ui/theme/mode`,      // Table_RSVPs בלי audit
      `Events/${user.uid}/${id}/__meta/ui/theme/mode`,                   // אם שמור במטא (רק ליתר בטחון)
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
          console.log('[RSVPstwo Theme] NOT FOUND -> auto', { uid: user.uid, id });
          setThemeMode('auto');
          return;
        }

        console.log('[RSVPstwo Theme] RESOLVED PATH:', foundPath, 'VALUE:', foundVal);
        setThemeMode(normalizeThemeMode(foundVal));

        // מאזין חי רק לנתיב שנמצא
        const r = ref(database, foundPath);
        unsubscribe = onValue(
          r,
          (snap) => {
            console.log('[RSVPstwo Theme] LIVE UPDATE:', foundPath, '=>', snap.val());
            if (snap.exists()) setThemeMode(normalizeThemeMode(snap.val()));
            else setThemeMode('auto');
          },
          (err) => console.log('[RSVPstwo Theme] listener error:', err)
        );
      } catch (e) {
        console.log('[RSVPstwo Theme] resolve error:', e);
        setThemeMode('auto');
      }
    };

    run();

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid, id]);

  // ✅ חישוב מצב כהה סופי (כולל auto)
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
    };
  }, [isDark]);

  const steps = useMemo(
    () => [
      { label: 'התחלה' },
      { label: 'ניסוח הודעה' },
      { label: 'תזמון הודעה' },
      { label: 'סיכום' },
    ],
    []
  );

  const currentStepIndex = 0; // מסך "התחלה"
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* רקע דקורטיבי עדין */}
      <View pointerEvents="none" style={[styles.bgBlobsWrap]}>
        <View style={[styles.blob, { backgroundColor: theme.primary, opacity: isDark ? 0.18 : 0.10, top: -60, right: -70 }]} />
        <View style={[styles.blob, { backgroundColor: '#22C55E', opacity: isDark ? 0.10 : 0.08, bottom: 80, left: -80 }]} />
      </View>

      {/* --- Header מודרני --- */}
<View
  style={[
    styles.header,
    {
      paddingTop: (Platform.OS === 'android' ? 8 : 4) + insets.top,
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
      flexDirection: 'row', // ✅ שמאל → ימין
    },
  ]}
>
  {/* ✅ כפתור חזור בצד שמאל */}
  <TouchableOpacity
    onPress={() => props.navigation.navigate('ListItem', { id })}
    style={[
      styles.backBtn,
      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,24,40,0.06)' },
    ]}
    activeOpacity={0.85}
  >
    <Text style={[styles.backTxt2, { color: theme.text }]}>חזור ←</Text>
  </TouchableOpacity>

  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={[styles.headerTitle, { color: theme.text }]}>אישורי הגעה</Text>
    <Text style={[styles.headerSub, { color: theme.subText }]}>התחלת תהליך שליחה</Text>
  </View>

  {/* ספייסר לאיזון */}
  <View style={{ width: 44 }} />
</View>


      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: 140 + insets.bottom,
            paddingHorizontal: screenWidth > 720 ? 24 : 18,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Stepper מודרני --- */}
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

          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF0F7' }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.primary }]} />
          </View>

          <Text style={[styles.stepHint, { color: theme.subText }]}>
            שלב {currentStepIndex + 1} מתוך {steps.length}
          </Text>
        </View>

        {/* --- כותרת --- */}
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          כדי ליצור תהליך חדש לשליחת הודעות — לחץ על <Text style={{ color: theme.primary, fontWeight: '900' }}>"התחל"</Text>
        </Text>

        {/* --- Cards --- */}
        <View style={[styles.grid, { maxWidth: 860, width: '100%' }]}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardTopRow, { flexDirection: 'row-reverse' }]}>
              <View style={[styles.iconBox, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
                <Text style={{ fontSize: 20 }}>💬</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>שליחה ב-WhatsApp</Text>
                <Text style={[styles.cardBody, { color: theme.subText }]}>
                  המוזמנים מקבלים הודעה עם תמונת ההזמנה ויכולים להגיב בלחיצה מהירה דרך הבוט.
                </Text>

                <View style={[styles.chip, { backgroundColor: theme.chipBg, alignSelf: 'flex-end' }]}>
                  <Text style={[styles.chipText, { color: theme.primary }]}>מלל ההודעה ניתן לעריכה מלאה</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.cardTopRow, { flexDirection: 'row-reverse' }]}>
              <View style={[styles.iconBox, { backgroundColor: theme.iconBg, borderColor: theme.border }]}>
                <Text style={{ fontSize: 20 }}>🕒</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>תזמון חכם</Text>
                <Text style={[styles.cardBody, { color: theme.subText }]}>
                  קבע תאריך ושעה לשליחה, או בחר מועדים מומלצים. זה עוזר לקבל תמונת מצב מסודרת יותר לקראת האירוע.
                </Text>

                <View style={[styles.chip, { backgroundColor: theme.chipBg, alignSelf: 'flex-end' }]}>
                  <Text style={[styles.chipText, { color: theme.primary }]}>המערכת תומכת גם בזמנים מומלצים</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>

      {/* --- CTA Bottom מודרני --- */}
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
            },
          ]}
          activeOpacity={0.9}
          onPress={() => props.navigation.navigate('RSVPsthree', { id })}
        >
          <Text style={styles.ctaText}>התחל</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>

        <Text style={[styles.footerHint, { color: theme.subText }]}>
          תוכל לחזור אחורה בכל שלב
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
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
        shadowOpacity: 0.10,
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

  pageTitle: {
    marginTop: 18,
    marginBottom: 14,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: 860,
    paddingHorizontal: 6,
    lineHeight: 24,
  },

  grid: {
    gap: 12,
  },

  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      web: { boxShadow: '0px 12px 30px rgba(0,0,0,0.08)' },
      default: {
        shadowOpacity: 0.10,
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
  chip: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
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
  backTxt2: {
  fontSize: 14,
  fontWeight: '900',
},
backBtn: {
  height: 44,
  minWidth: 92,          // ✅ יותר רחב
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14, // ✅ מרווח פנימי רחב יותר
},

});

export default RSVPstwo;
