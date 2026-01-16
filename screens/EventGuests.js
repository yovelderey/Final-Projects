// EventGuests.js — PRO (Narrow List + Better Profile + Call Button + Sync to responses + numberOfGuests)
// ✅ Reads guests from: Events/{uid}/{eventId}/contacts  (fallback: guests)
// ✅ Reads web/manual responses from: Events/{uid}/{eventId}/responses
// ✅ Manual status writes back to contacts + statusHistory + numberOfGuests
// ✅ Also upserts: responses/{rid}: { guestName, response, timestamp(ISO), numberOfGuests }
// ✅ Recomputes event counters + coming_people
// ✅ Works Web + Native, Dark/Light auto
// ✅ List is narrower (maxWidth) but Header stays full width

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==== Firebase init (אותו קונפיג שלך) ====
const firebaseConfig = {
  apiKey: 'AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag',
  authDomain: 'final-project-d6ce7.firebaseapp.com',
  projectId: 'final-project-d6ce7',
  storageBucket: 'final-project-d6ce7.appspot.com',
  messagingSenderId: '1056060530572',
  appId: '1:1056060530572:web:d08d859ca2d25c46d340a9',
  measurementId: 'G-LD61QH3VVP',
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// ==== Utils ====
const safeMs = (v) => {
  if (!v) return 0;
  const n = Number(v);
  if (Number.isFinite(n) && n > 1e10) return n;
  if (Number.isFinite(n) && n > 1e9) return n * 1000;
  const p = Date.parse(String(v));
  return Number.isFinite(p) ? p : 0;
};

const fmtHebDateTime = (ts) =>
  ts
    ? new Date(ts).toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const fmtISODateTime = (iso) => {
  if (!iso) return '—';
  const t = safeMs(iso);
  if (!t) return String(iso);
  return fmtHebDateTime(t);
};

const normStatus = (s) => {
  const x = String(s || '').trim().toLowerCase();

  // ✅ חובה: "לא מגיע" קודם, כי הוא מכיל "מגיע"
  if (x.includes('לא מגיע') || x === 'no' || x === 'לא' || x.startsWith('לא')) return 'לא מגיע';

  if (x.includes('מגיע') || x === 'yes' || x.includes('coming')) return 'מגיע';
  if (x.includes('אולי') || x === 'maybe') return 'אולי';

  // גם אם כתבו "ממתין" / "pending"
  if (x.includes('ממתין') || x.includes('pending') || x.includes('wait')) return 'ממתין';

  return 'ממתין';
};


const pickPhone = (g) =>
  String(g?.phone || g?.phoneNumber || g?.phoneNumbers || g?.tel || g?.formattedContacts || '').trim();

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => (p[0] || '').toUpperCase()).join('') || '?';
};

const normalizePhoneForDial = (s) => {
  if (!s) return '';
  let t = String(s).trim();
  // משאיר + וספרות בלבד
  t = t.replace(/[^\d+]/g, '');
  t = t.replace(/(?!^)\+/g, '');
  return t;
};

// ==== Theme System ====
const COLORS = {
  primary: '#6366F1', // Indigo 500
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  neutral: '#64748B', // Slate 500
};

const makeTheme = (isDark) => ({
  isDark,
  bg: isDark ? '#0F172A' : '#F8FAFC', // Slate 900 / Slate 50
  card: isDark ? '#1E293B' : '#FFFFFF',
  cardHeader: isDark ? '#334155' : '#F1F5F9',
  text: isDark ? '#F8FAFC' : '#0F172A',
  sub: isDark ? '#94A3B8' : '#64748B',
  border: isDark ? '#334155' : '#E2E8F0',
  inputBg: isDark ? '#020617' : '#FFFFFF',
  primary: '#6366F1',
  activeTab: isDark ? '#312E81' : '#E0E7FF',
  activeTabText: isDark ? '#E0E7FF' : '#3730A3',
});

// Helper to get color by status
const getStatusColor = (s) => {
  const st = normStatus(s);
  if (st === 'מגיע') return COLORS.success;
  if (st === 'אולי') return COLORS.warning;
  if (st === 'לא מגיע') return COLORS.danger;
  return null; // ✅ ממתין = בלי צבע
};


// ==== Styles ====
const createStyles = (t) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: t.bg },

    // Header (אל תקטין)
    headerContainer: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
      paddingBottom: 16,
      backgroundColor: t.card,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      zIndex: 10,
    },
    headerRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitleBlock: { flex: 1, alignItems: 'flex-end', paddingRight: 10 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: t.text },
    headerSub: { fontSize: 13, fontWeight: '600', color: t.sub, marginTop: 2 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: t.cardHeader,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Dashboard Stats
    statsGrid: {
      flexDirection: 'row-reverse',
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: t.inputBg,
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    statNum: { fontSize: 18, fontWeight: '900', color: t.text },
    statLabel: { fontSize: 11, fontWeight: '700', color: t.sub, marginTop: 2 },

    // Search & Filter
    searchBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: t.inputBg,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 14,
      height: 48,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      textAlign: 'right',
      color: t.text,
      fontSize: 15,
      fontWeight: '600',
      marginRight: 8,
    },
    filterScrollContent: { flexDirection: 'row-reverse', gap: 8 },
    filterChip: {
      paddingHorizontal: 14,
      height: 32,
      borderRadius: 100,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.cardHeader,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    filterChipActive: {
      backgroundColor: t.activeTab,
      borderColor: t.primary,
    },
    filterText: { fontSize: 12, fontWeight: '700', color: t.sub },
    filterTextActive: { color: t.activeTabText },

    // Narrow list wrapper
    listWrap: {
      flex: 1,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 640, // ✅ יותר צרה
    },

    // Guest Card
    card: {
      backgroundColor: t.card,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: '#000',
      shadowOpacity: t.isDark ? 0.3 : 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      overflow: 'hidden',
    },
    cardMain: {
      flexDirection: 'row-reverse',
      padding: 14,
      alignItems: 'center',
    },
    // Status Ring Avatar
    avatarContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      marginLeft: 14,
      backgroundColor: t.cardHeader,
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: t.text },

    infoCol: { flex: 1, alignItems: 'flex-end' },
    nameText: { fontSize: 16, fontWeight: '800', color: t.text, textAlign: 'right' },
    phoneText: { fontSize: 13, fontWeight: '600', color: t.sub, marginTop: 2 },
    sourceText: { fontSize: 11, fontWeight: '700', color: t.primary, marginTop: 6 },

    // Footer actions
    cardFooter: {
      flexDirection: 'row-reverse',
      backgroundColor: t.cardHeader,
      paddingVertical: 10,
      paddingHorizontal: 14,
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    footerTime: { fontSize: 11, color: t.sub, fontWeight: '700' },
    actionsRow: { flexDirection: 'row-reverse', gap: 10 },
    actionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
    },
    actionText: { fontSize: 12, fontWeight: '800', color: t.text },
    primaryAction: { backgroundColor: t.primary, borderColor: t.primary },
    primaryActionText: { color: '#fff' },

    // Floating sync
    fab: {
      position: 'absolute',
      bottom: 30,
      left: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: t.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      maxHeight: '82%',
    },
    modalHandle: {
      width: 44,
      height: 5,
      borderRadius: 10,
      backgroundColor: t.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: t.text,
      textAlign: 'center',
      marginBottom: 14,
    },

    // Status options
    statusOpt: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
    },
    statusOptText: { fontSize: 16, fontWeight: '900' },

    // Profile design
    profileHero: {
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.inputBg,
      marginBottom: 12,
    },
    profileTopRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    profileAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      backgroundColor: t.cardHeader,
    },
    profileName: { fontSize: 18, fontWeight: '900', color: t.text, textAlign: 'right' },
    profileSubLine: { marginTop: 4, fontSize: 13, fontWeight: '700', color: t.sub, textAlign: 'right' },

    pill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      marginTop: 10,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
    },
    pillText: { fontWeight: '900', fontSize: 12 },

    quickActionsRow: {
      marginTop: 12,
      flexDirection: 'row-reverse',
      gap: 10,
    },
    quickBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.card,
      flexDirection: 'row-reverse',
      gap: 8,
    },
    quickBtnText: { fontWeight: '900', fontSize: 13 },

    sectionCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.card,
      overflow: 'hidden',
      marginBottom: 12,
    },
    sectionHeader: {
      backgroundColor: t.cardHeader,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionHeaderTitle: { fontWeight: '900', color: t.text, fontSize: 13 },
    sectionBody: { padding: 14 },
    kvRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    kvLabel: { color: t.sub, fontWeight: '800', fontSize: 12 },
    kvValue: { color: t.text, fontWeight: '900', fontSize: 13, textAlign: 'right', maxWidth: '68%' },

    historyRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      gap: 10,
    },
    historyLeft: { alignItems: 'flex-start' },
    historyRight: { alignItems: 'flex-end', flex: 1 },
    historyStatus: { fontWeight: '900', fontSize: 13 },
    historyMeta: { marginTop: 3, fontWeight: '700', fontSize: 11, color: t.sub },

    closeWideBtn: {
      marginTop: 8,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.cardHeader,
      borderWidth: 1,
      borderColor: t.border,
    },
    closeWideText: { fontWeight: '900', color: t.text, fontSize: 14 },
  });

// ==== Small Components ====
const StatCard = ({ label, num, color, t }) => {
  const S = createStyles(t);
  return (
    <View style={[S.statCard, { borderTopWidth: 3, borderTopColor: color }]}>
      <Text style={[S.statNum, { color }]}>{num}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
};

const FilterChip = ({ label, active, onPress, t }) => {
  const S = createStyles(t);
  return (
    <TouchableOpacity onPress={onPress} style={[S.filterChip, active && S.filterChipActive]}>
      <Text style={[S.filterText, active && S.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function EventGuests() {
  const nav = useNavigation();
  const route = useRoute();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = useMemo(() => makeTheme(isDark), [isDark]);
  const S = useMemo(() => createStyles(theme), [theme]);

  const { uid, eventId, eventName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [baseNode, setBaseNode] = useState('contacts');

  const basePath = useMemo(() => {
    if (!uid || !eventId) return '';
    return `Events/${uid}/${eventId}/${baseNode}`;
  }, [uid, eventId, baseNode]);

  const [contactsMap, setContactsMap] = useState({});
  const [responsesMap, setResponsesMap] = useState({});
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const [picked, setPicked] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'status' | 'profile' | null

  // "כמה מגיעים" (מלווים) — מופיע רק כשבוחרים "מגיע"
  const [numGuests, setNumGuests] = useState('0');
  const [pendingPickStatus, setPendingPickStatus] = useState(null);

  // ---- Subscriptions ----
  useEffect(() => {
    if (!uid || !eventId) return;

    const db = firebase.database();
    const refContacts = db.ref(`Events/${uid}/${eventId}/contacts`);
    const refGuests = db.ref(`Events/${uid}/${eventId}/guests`);
    const refResp = db.ref(`Events/${uid}/${eventId}/responses`);

    setLoading(true);

    const onContacts = refContacts.on('value', (s) => {
      if (s.val()) {
        setBaseNode('contacts');
        setContactsMap(s.val() || {});
        setLoading(false);
      } else {
        refGuests
          .once('value')
          .then((s2) => {
            setBaseNode('guests');
            setContactsMap(s2.val() || {});
            setLoading(false);
          })
          .catch(() => {
            setBaseNode('contacts');
            setContactsMap({});
            setLoading(false);
          });
      }
    });

    const onResp = refResp.on('value', (s) => setResponsesMap(s.val() || {}));

    return () => {
      refContacts.off('value', onContacts);
      refResp.off('value', onResp);
    };
  }, [uid, eventId]);

  // Latest response by guest name (לרמיזה "עדכון חדש")
  const latestRespByName = useMemo(() => {
    const acc = {};
    Object.entries(responsesMap || {}).forEach(([rid, r]) => {
      const name = String(r?.guestName || '').trim();
      if (!name) return;
      const ts = safeMs(r?.timestamp);
      if (!acc[name] || ts > acc[name].ts) {
        acc[name] = { ts, status: normStatus(r?.response), rid, raw: r };
      }
    });
    return acc;
  }, [responsesMap]);

  // Build list
  const list = useMemo(() => {
    let arr = Object.entries(contactsMap || {}).map(([key, g]) => {
      const name = String(g?.displayName || g?.name || g?.guestName || '').trim();
      const phone = pickPhone(g);
      const resp = name ? latestRespByName[name] : null;

      const stUpdate = safeMs(g?.statusUpdatedAt);
      const respTs = resp?.ts || 0;

      const effectiveStatus = normStatus(g?.status || g?.rsvpStatus || 'ממתין');

      return {
        key,
        raw: g,
        name: name || 'ללא שם',
        phone,
        status: effectiveStatus,
        lastChangeTs: Math.max(stUpdate, respTs),
        isWebNewer: respTs > stUpdate,
        webStatus: resp?.status,
        webRid: resp?.rid,
        webRaw: resp?.raw,
      };
    });

    if (q) {
      const term = q.toLowerCase();
      arr = arr.filter((x) => x.name.toLowerCase().includes(term) || (x.phone || '').includes(term));
    }
    if (filter !== 'all') {
      arr = arr.filter((x) => x.status === filter);
    }

    return arr.sort((a, b) => b.lastChangeTs - a.lastChangeTs);
  }, [contactsMap, latestRespByName, q, filter]);

  // Statistics
  const stats = useMemo(() => {
    let y = 0,
      m = 0,
      n = 0,
      p = 0;
    const all = Object.values(contactsMap || {});
    all.forEach((g) => {
      const s = normStatus(g?.status || g?.rsvpStatus || 'ממתין');
      if (s === 'מגיע') y++;
      else if (s === 'אולי') m++;
      else if (s === 'לא מגיע') n++;
      else p++;
    });
    return { total: all.length, yes: y, maybe: m, no: n, pending: p };
  }, [contactsMap]);

  const callPhone = useCallback(async (rawPhone) => {
    const phone = normalizePhoneForDial(rawPhone);
    if (!phone) return Alert.alert('אין טלפון', 'לא נמצא מספר טלפון למוזמן הזה.');

    // Web: נעתיק ללוח + נציג הודעה
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(phone);
        Alert.alert('הועתק', `המספר הועתק ללוח:\n${phone}`);
      } catch {
        Alert.alert('טלפון', phone);
      }
      return;
    }

    // Native:
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('שגיאה', 'לא ניתן לפתוח חיוג במכשיר זה.');
      return;
    }
    Linking.openURL(url);
  }, []);

  // ===== Responses upsert (כמו שביקשת) =====
  const findResponseIdForGuest = useCallback((guest, responsesObj) => {
    if (!guest) return null;

    const gId = String(guest.key || guest.raw?.recordID || '').trim();
    const gName = String(guest.name || '').trim();
    const gPhone = String(guest.phone || '').trim();

    for (const [rid, r] of Object.entries(responsesObj || {})) {
      const rId = String(r?.guestId || r?.recordID || r?.contactId || '').trim();
      const rName = String(r?.guestName || r?.displayName || r?.name || '').trim();
      const rPhone = String(r?.phone || r?.phoneNumbers || r?.formattedContacts || '').trim();

      if (gId && rId && gId === rId) return rid;
      if (gPhone && rPhone && gPhone === rPhone) return rid;
      if (gName && rName && gName === rName) return rid;
    }
    return null;
  }, []);

  const upsertResponseForGuest = useCallback(
    async (guest, finalSt, extraGuestsInt) => {
      if (!uid || !eventId || !guest) return;

      const db = firebase.database();
      const iso = new Date().toISOString();

      const rid = findResponseIdForGuest(guest, responsesMap) || db.ref().push().key;

      const payload = {
        guestName: guest.name || 'ללא שם',
        response: finalSt,
        timestamp: iso, // ✅ בדיוק כמו בדוגמה שלך
        numberOfGuests: finalSt === 'מגיע' ? extraGuestsInt : 0, // ✅
      };

      if (guest.phone) payload.phone = guest.phone;

      const gId = String(guest.key || guest.raw?.recordID || '').trim();
      if (gId) payload.guestId = gId;

      await db.ref(`Events/${uid}/${eventId}/responses/${rid}`).update(payload);
    },
    [uid, eventId, responsesMap, findResponseIdForGuest]
  );

  // Recompute counts + coming_people
  const recomputeCounts = useCallback(async () => {
    if (!uid || !eventId || !basePath) return;
    const db = firebase.database();
    const s = await db.ref(basePath).once('value');

    let y = 0,
      m = 0,
      n = 0,
      p = 0;
    let comingPeople = 0;

    s.forEach((c) => {
      const val = c.val() || {};
      const st = normStatus(val.status || val.rsvpStatus || 'ממתין');

      if (st === 'מגיע') {
        y++;
        const extra = Number(val.numberOfGuests ?? val.extraGuests ?? 0);
        const safeExtra = Number.isFinite(extra) && extra > 0 ? extra : 0;
        comingPeople += 1 + safeExtra;
      } else if (st === 'אולי') m++;
      else if (st === 'לא מגיע') n++;
      else p++;
    });

    await db.ref(`Events/${uid}/${eventId}`).update({
      yes_caming: y,
      maybe: m,
      no_cuming: n,
      no_answear: p,
      coming_people: comingPeople,
      '__metrics/lastUpdated': Date.now(),
    });
  }, [uid, eventId, basePath]);

  const updateStatus = useCallback(
    async (key, st, extraGuestsInt = 0) => {
      if (!key || !basePath) return;

      const db = firebase.database();
      const now = Date.now();
      const finalSt = normStatus(st);
      const hKey = db.ref().push().key;

      // מוצא את האורח מתוך הרשימה
      const guest = list.find((x) => x.key === key) || picked;

      const u = {};
      u[`${basePath}/${key}/status`] = finalSt;
      u[`${basePath}/${key}/statusUpdatedAt`] = now;
      u[`${basePath}/${key}/statusUpdatedBy`] = 'owner';
      u[`${basePath}/${key}/statusHistory/${hKey}`] = {
        status: finalSt,
        ts: now,
        by: 'owner',
        channel: 'manual',
      };

      // ✅ כמה מלווים/נוספים
      u[`${basePath}/${key}/numberOfGuests`] = finalSt === 'מגיע' ? extraGuestsInt : 0;

      await db.ref().update(u);

      // ✅ upsert ל-responses (עם guestName/response/timestamp/numberOfGuests)
      await upsertResponseForGuest(
        guest || { key, name: guest?.name || picked?.name, phone: guest?.phone || picked?.phone },
        finalSt,
        extraGuestsInt
      );

      await recomputeCounts();

      setModalMode(null);
      setPendingPickStatus(null);
    },
    [basePath, list, picked, upsertResponseForGuest, recomputeCounts]
  );

  // Sync button (שומר מקום — אם תרצה לוגיקת סנכרון מלאה, תגיד לי)
  const syncResponses = useCallback(() => {
    Alert.alert('סנכרון', 'כרגע הכפתור מיועד להרחבה (סנכרון מלא לפי הלוגיקה שלך).');
  }, []);

  // ===== Profile helpers =====
const pickedStatusColor = useMemo(() => getStatusColor(picked?.status), [picked?.status]); // יכול להיות null
  const pickedPhone = useMemo(() => normalizePhoneForDial(picked?.phone), [picked?.phone]);

  const pickedHistory = useMemo(() => {
    const h = picked?.raw?.statusHistory || {};
    const arr = Object.entries(h).map(([hid, v]) => ({
      _id: hid,
      status: normStatus(v?.status),
      ts: safeMs(v?.ts),
      by: String(v?.by || '').trim() || '—',
      channel: String(v?.channel || '').trim() || '—',
    }));
    arr.sort((a, b) => b.ts - a.ts);
    return arr.slice(0, 12);
  }, [picked]);

  // ---- Render Item ----
  const renderItem = ({ item }) => {
const color = getStatusColor(item.status);
const ringColor = color || theme.border; 


    return (
      <View style={S.card}>
        <View style={S.cardMain}>
          <View style={[S.avatarContainer, { borderColor: color }]}>
            <Text style={S.avatarText}>{getInitials(item.name)}</Text>
          </View>

          <View style={S.infoCol}>
            <Text style={S.nameText}>{item.name}</Text>
            <Text style={S.phoneText}>{item.phone || 'אין טלפון'}</Text>
            {item.isWebNewer && (
              <Text style={S.sourceText}>🔔 עדכון חדש באתר: {item.webStatus}</Text>
            )}
          </View>
        </View>

        <View style={S.cardFooter}>
          <View style={S.actionsRow}>
            {/* סטטוס */}
            <TouchableOpacity
              style={[S.actionBtn, S.primaryAction]}
              onPress={() => {
                setPicked(item);
                setModalMode('status');
                setPendingPickStatus(null);
                const cur = Number(item.raw?.numberOfGuests ?? 0);
                setNumGuests(String(Number.isFinite(cur) && cur >= 0 ? cur : 0));
              }}
            >
              <Text style={[S.actionText, S.primaryActionText]}>סטטוס</Text>
            </TouchableOpacity>

            {/* ✅ התקשר */}
            <TouchableOpacity
              style={S.actionBtn}
              onPress={() => callPhone(item.phone)}
            >
              <Text style={S.actionText}>📞</Text>
              <Text style={S.actionText}>התקשר</Text>
            </TouchableOpacity>

            {/* פרופיל */}
            <TouchableOpacity
              style={S.actionBtn}
              onPress={() => {
                setPicked(item);
                setModalMode('profile');
              }}
            >
              <Text style={S.actionText}>👤</Text>
              <Text style={S.actionText}>פרופיל</Text>
            </TouchableOpacity>
          </View>

          <Text style={S.footerTime}>{fmtHebDateTime(item.lastChangeTs)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={S.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Header (לא להקטין) */}
      <View style={S.headerContainer}>
        <View style={S.headerRow}>
          <View style={S.headerTitleBlock}>
            <Text style={S.headerTitle}>ניהול מוזמנים</Text>
            <Text style={S.headerSub}>{eventName || 'אירוע ללא שם'}</Text>
          </View>
          <TouchableOpacity onPress={() => nav.goBack()} style={S.backBtn}>
            <Text style={{ fontSize: 20, color: theme.text }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Stats */}
        <View style={S.statsGrid}>
          <StatCard t={theme} label="סה״כ" num={stats.total} color={COLORS.neutral} />
          <StatCard t={theme} label="מגיעים" num={stats.yes} color={COLORS.success} />
          <StatCard t={theme} label="אולי" num={stats.maybe} color={COLORS.warning} />
          <StatCard t={theme} label="לא" num={stats.no} color={COLORS.danger} />
        </View>

        {/* Search */}
        <View style={S.searchBox}>
          <Text style={{ fontSize: 16, marginLeft: 8 }}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="חיפוש אורח..."
            placeholderTextColor={theme.sub}
            value={q}
            onChangeText={(txt) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setQ(txt);
            }}
          />
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.filterScrollContent}
        >
          <FilterChip t={theme} label="הכל" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip t={theme} label="מגיע" active={filter === 'מגיע'} onPress={() => setFilter('מגיע')} />
          <FilterChip t={theme} label="אולי" active={filter === 'אולי'} onPress={() => setFilter('אולי')} />
          <FilterChip t={theme} label="ממתין" active={filter === 'ממתין'} onPress={() => setFilter('ממתין')} />
          <FilterChip t={theme} label="לא מגיע" active={filter === 'לא מגיע'} onPress={() => setFilter('לא מגיע')} />
        </ScrollView>
      </View>

      {/* List (narrow) */}
      <View style={S.listWrap}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            initialNumToRender={10}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 50, color: theme.sub, fontWeight: '800' }}>
                לא נמצאו אורחים
              </Text>
            }
          />
        )}
      </View>

      {/* Sync Button Floating */}
      <TouchableOpacity style={[S.fab, { backgroundColor: theme.text }]} onPress={syncResponses}>
        <Text style={{ fontSize: 22 }}>🔄</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={!!modalMode}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalMode(null);
          setPendingPickStatus(null);
        }}
      >
        <TouchableOpacity
          style={S.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setModalMode(null);
            setPendingPickStatus(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} style={S.modalContent}>
            <View style={S.modalHandle} />

            {/* ===== STATUS MODAL ===== */}
            {modalMode === 'status' && picked && (
              <>
                <Text style={S.modalTitle}>עדכון סטטוס ל־{picked.name}</Text>

                {[
                  { l: 'מגיע', c: COLORS.success, bg: isDark ? '#064E3B' : '#ECFDF5', bd: '#10B981' },
                  { l: 'אולי', c: COLORS.warning, bg: isDark ? '#451A03' : '#FFFBEB', bd: '#F59E0B' },
                  { l: 'ממתין', c: COLORS.neutral, bg: isDark ? '#1E293B' : '#F1F5F9', bd: '#94A3B8' },
                  { l: 'לא מגיע', c: COLORS.danger, bg: isDark ? '#450a0a' : '#FEF2F2', bd: '#EF4444' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.l}
                    style={[S.statusOpt, { backgroundColor: opt.bg, borderColor: opt.bd }]}
                    onPress={() => {
                      if (opt.l === 'מגיע') {
                        setPendingPickStatus('מגיע'); // קודם בוחרים "מגיע" ואז מזינים כמות
                        return;
                      }
                      updateStatus(picked.key, opt.l, 0);
                    }}
                  >
                    <Text style={[S.statusOptText, { color: opt.c }]}>{opt.l}</Text>
                  </TouchableOpacity>
                ))}

                {/* אם נבחר "מגיע" — שדה להזנת כמות */}
                {pendingPickStatus === 'מגיע' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ textAlign: 'right', color: theme.sub, fontWeight: '900', marginBottom: 8 }}>
                      כמה מלווים מגיעים איתו? (0 = רק הוא)
                    </Text>

                    <View
                      style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        gap: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.inputBg,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        height: 52,
                      }}
                    >
                      <Text style={{ color: theme.sub, fontWeight: '900' }}>👥</Text>
                      <TextInput
                        value={numGuests}
                        onChangeText={(v) => setNumGuests(String(v).replace(/[^\d]/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.sub}
                        style={{ flex: 1, textAlign: 'right', color: theme.text, fontSize: 16, fontWeight: '900' }}
                      />
                    </View>

                    <TouchableOpacity
                      style={{
                        marginTop: 12,
                        height: 52,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: COLORS.success,
                      }}
                      onPress={() => {
                        const n = Number(numGuests);
                        const safe = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
                        updateStatus(picked.key, 'מגיע', safe);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
                        שמור (מגיע + {numGuests || '0'} מלווים)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        height: 48,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.cardHeader,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => setPendingPickStatus(null)}
                    >
                      <Text style={{ color: theme.text, fontWeight: '900' }}>ביטול</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* ===== PROFILE MODAL (Better Design) ===== */}
            {modalMode === 'profile' && picked && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={S.modalTitle}>פרופיל מוזמן</Text>

                {/* Hero */}
                <View style={S.profileHero}>
                  <View style={S.profileTopRow}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={S.profileName}>{picked.name}</Text>
                      <Text style={S.profileSubLine}>📞 {picked.phone || 'אין טלפון'}</Text>
                      <Text style={S.profileSubLine}>
                        🕒 עדכון אחרון: {fmtHebDateTime(picked.lastChangeTs)}
                      </Text>
                    </View>

                    <View style={[S.profileAvatar, { borderColor: pickedStatusColor }]}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>
                        {getInitials(picked.name)}
                      </Text>
                    </View>
                  </View>

                  {/* Status pill */}
                  <View
                    style={[
                      S.pill,
                      { borderColor: pickedStatusColor, backgroundColor: theme.card },
                    ]}
                  >
                    <Text style={[S.pillText, { color: pickedStatusColor }]}>●</Text>
                    <Text style={[S.pillText, { color: theme.text }]}>
                      סטטוס: {picked.status}
                    </Text>
                    {picked.raw?.numberOfGuests !== undefined && normStatus(picked.status) === 'מגיע' && (
                      <Text style={[S.pillText, { color: theme.sub }]}>
                        · מלווים: {Number(picked.raw?.numberOfGuests ?? 0) || 0}
                      </Text>
                    )}
                  </View>

                  {/* Web newer */}
                  {picked.isWebNewer && (
                    <View
                      style={[
                        S.pill,
                        {
                          borderColor: theme.primary,
                          backgroundColor: theme.isDark ? '#111827' : '#EEF2FF',
                        },
                      ]}
                    >
                      <Text style={[S.pillText, { color: theme.primary }]}>🔔</Text>
                      <Text style={[S.pillText, { color: theme.text }]}>
                        יש עדכון באתר: {picked.webStatus}
                      </Text>
                      <Text style={[S.pillText, { color: theme.sub }]}>
                        · {fmtISODateTime(picked.webRaw?.timestamp)}
                      </Text>
                    </View>
                  )}

                  {/* Quick Actions */}
                  <View style={S.quickActionsRow}>
                    <TouchableOpacity
                      style={[S.quickBtn, { borderColor: theme.border }]}
                      onPress={() => callPhone(pickedPhone)}
                    >
                      <Text style={{ fontWeight: '900' }}>📞</Text>
                      <Text style={[S.quickBtnText, { color: theme.text }]}>התקשר</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[S.quickBtn, { borderColor: theme.primary, backgroundColor: theme.primary }]}
                      onPress={() => {
                        setModalMode('status');
                        setPendingPickStatus(null);
                        const cur = Number(picked.raw?.numberOfGuests ?? 0);
                        setNumGuests(String(Number.isFinite(cur) && cur >= 0 ? cur : 0));
                      }}
                    >
                      <Text style={{ fontWeight: '900', color: '#fff' }}>✍️</Text>
                      <Text style={[S.quickBtnText, { color: '#fff' }]}>שנה סטטוס</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Details */}
                <View style={S.sectionCard}>
                  <View style={S.sectionHeader}>
                    <Text style={S.sectionHeaderTitle}>פרטים</Text>
                    <Text style={{ color: theme.sub, fontWeight: '900', fontSize: 12 }}>
                      {baseNode === 'contacts' ? 'contacts' : 'guests'}
                    </Text>
                  </View>
                  <View style={S.sectionBody}>
                    <View style={S.kvRow}>
                      <Text style={S.kvLabel}>מזהה</Text>
                      <Text style={S.kvValue}>{picked.key}</Text>
                    </View>
                    <View style={S.kvRow}>
                      <Text style={S.kvLabel}>סטטוס DB</Text>
                      <Text style={S.kvValue}>{String(picked.raw?.status || picked.raw?.rsvpStatus || '—')}</Text>
                    </View>
                    <View style={S.kvRow}>
                      <Text style={S.kvLabel}>עודכן ע״י</Text>
                      <Text style={S.kvValue}>{String(picked.raw?.statusUpdatedBy || '—')}</Text>
                    </View>
                    <View style={S.kvRow}>
                      <Text style={S.kvLabel}>עודכן ב</Text>
                      <Text style={S.kvValue}>{fmtHebDateTime(safeMs(picked.raw?.statusUpdatedAt))}</Text>
                    </View>
                  </View>
                </View>

                {/* History */}
                <View style={S.sectionCard}>
                  <View style={S.sectionHeader}>
                    <Text style={S.sectionHeaderTitle}>היסטוריית סטטוס (אחרון)</Text>
                    <Text style={{ color: theme.sub, fontWeight: '900', fontSize: 12 }}>
                      {pickedHistory.length}
                    </Text>
                  </View>

                  <View style={S.sectionBody}>
                    {!pickedHistory.length ? (
                      <Text style={{ textAlign: 'right', color: theme.sub, fontWeight: '800' }}>
                        אין היסטוריה עדיין
                      </Text>
                    ) : (
                      pickedHistory.map((h) => {
                        const c = getStatusColor(h.status);
                        return (
                          <View key={h._id} style={S.historyRow}>
                            <View style={S.historyLeft}>
                              <Text style={[S.historyMeta, { color: theme.sub }]}>
                                {fmtHebDateTime(h.ts)}
                              </Text>
                              <Text style={[S.historyMeta, { color: theme.sub }]}>
                                {h.by} · {h.channel}
                              </Text>
                            </View>

                            <View style={S.historyRight}>
                              <Text style={[S.historyStatus, { color: c }]}>{h.status}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={S.closeWideBtn}
                  onPress={() => setModalMode(null)}
                >
                  <Text style={S.closeWideText}>סגור</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
