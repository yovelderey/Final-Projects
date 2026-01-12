// Gift.js — Firebase Theme (global) + Dynamic Dark/Light UI + Existing Gifts logic
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
  Animated,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Dimensions,
  ScrollView,
  useColorScheme,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';

import { ref, set, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../firebase';

// הפעלת אנימציות באנדרואיד
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Gift = (props) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = Dimensions.get('window');
  const id = props.route.params.id;

  // ===== Theme from Firebase =====
  const systemScheme = useColorScheme(); // "dark" | "light" | null
  const [themeMode, setThemeMode] = useState('auto'); // "auto" | "dark" | "light"

  const isDark = useMemo(() => {
    return themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark');
  }, [themeMode, systemScheme]);

  const C = useMemo(() => {
    if (isDark) {
      return {
        screen: '#0F172A',
        header: '#1E293B',
        body: '#0F172A',
        card: '#1E293B',
        input: '#1E293B',
        inputInner: '#0F172A',
        border: '#334155',
        borderSoft: '#475569',
        text: '#FFFFFF',
        subText: '#94A3B8',
        muted: '#64748B',
        kpiCard: '#334155',
        modalOverlay: 'rgba(0,0,0,0.7)',
        modalCard: '#1E293B',
        modalNoteBox: '#0F172A',
        accent: '#6366F1',
        success: '#10B981',
      };
    }

    return {
      screen: '#F8FAFC',
      header: '#FFFFFF',
      body: '#F8FAFC',
      card: '#FFFFFF',
      input: '#FFFFFF',
      inputInner: '#F1F5F9',
      border: '#E2E8F0',
      borderSoft: '#CBD5E1',
      text: '#0F172A',
      subText: '#475569',
      muted: '#64748B',
      kpiCard: '#FFFFFF',
      modalOverlay: 'rgba(15,23,42,0.45)',
      modalCard: '#FFFFFF',
      modalNoteBox: '#F1F5F9',
      accent: '#4F46E5',
      success: '#16A34A',
    };
  }, [isDark]);

  // ===== Data =====
  const [contacts, setContacts] = useState([]);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // סטטיסטיקות
// סטטיסטיקות
const [computedTotal, setComputedTotal] = useState(0);   // ✅ חישוב אוטומטי מהאורחים
const [totalPrice, setTotalPrice] = useState(0);         // ✅ מה שמוצג בפועל (manual או computed)

const [manualTotalText, setManualTotalText] = useState(''); // ✅ טקסט לעריכה ידנית
const [manualTotalActive, setManualTotalActive] = useState(false); // ✅ האם יש override ידני
  const [averagePrice, setAveragePrice] = useState(0);
  const [paidGuestsCount, setPaidGuestsCount] = useState(0);

  // ברכות והערות
  const [giftNotes, setGiftNotes] = useState({});
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState('');
  const [selectedGuestName, setSelectedGuestName] = useState('');

  // מיון
  const [sortOrder, setSortOrder] = useState('desc');

  // אנימציה לכניסה
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // אנימציית כניסה
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        } catch {}
      }
    };

const calculateTotalPrice = (contactsArray) => {
  const total = contactsArray.reduce((sum, contact) => sum + (parseFloat(contact.newPrice) || 0), 0);

  setComputedTotal(total);

  // אם אין סכום ידני פעיל – נציג את האוטומטי
  if (!manualTotalActive) {
    setTotalPrice(total);
  }

  const validPrices = contactsArray.filter((contact) => parseFloat(contact.newPrice));
  setAveragePrice(validPrices.length > 0 ? Math.round(total / validPrices.length) : 0);
  setPaidGuestsCount(contactsArray.filter((contact) => (parseFloat(contact.newPrice) || 0) > 0).length);
};


    let unsubContacts = null;
    let unsubGifts = null;
    let unsubTheme = null;
    let unsubAuth = null;

    unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // ✅ Theme listener (global setting for all screens)
        const themeModeRef = ref(database, `Events/${currentUser.uid}/${id}/__admin/ui/theme/mode`);
        unsubTheme = onValue(themeModeRef, (snap) => {
          const m = snap.val();
          if (m === 'dark' || m === 'light' || m === 'auto') setThemeMode(m);
          else setThemeMode('auto');
        });

        // אנשי קשר
        const contactsRef = ref(database, `Events/${currentUser.uid}/${id}/contacts`);
        unsubContacts = onValue(contactsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const contactsArray = Object.values(data);
            setContacts(contactsArray);
            calculateTotalPrice(contactsArray);
          } else {
            setContacts([]);
            setTotalPrice(0);
            setAveragePrice(0);
            setPaidGuestsCount(0);
          }
        });
// ✅ Manual Total listener
const manualTotalRef = ref(database, `Events/${currentUser.uid}/${id}/payments/giftsSummary/manualTotal`);

const unsubManualTotal = onValue(manualTotalRef, (snap) => {
  const v = snap.val();

  if (v === null || v === undefined || v === '') {
    // אין ידני -> אוטומטי
    setManualTotalActive(false);
    setManualTotalText('');
    // נציג את המחושב
    setTotalPrice((prev) => computedTotal); // computedTotal יתעדכן מהחישוב
  } else {
    const n = Number(v);
    if (!Number.isNaN(n)) {
      setManualTotalActive(true);
      setManualTotalText(String(n));
      setTotalPrice(n);
    }
  }
});

        // מתנות / ברכות
        const giftsRef = ref(database, `Events/${currentUser.uid}/${id}/payments/gifts`);
        unsubGifts = onValue(giftsRef, (snapshot) => {
          const data = snapshot.val();
          const map = {};
          if (data) {
            Object.entries(data).forEach(([key, gift]) => {
              if (gift && typeof gift === 'object') {
                const guestKey = gift.guestId || key;
                map[guestKey] = (gift.note ?? '').toString();
              }
            });
          }
          setGiftNotes(map);
        });
      } else {
        setUser(null);
        setContacts([]);
        setGiftNotes({});
      }
    });

    requestPermissions();

    return () => {
      try {
        if (unsubContacts) unsubContacts();
        if (unsubGifts) unsubGifts();
        if (unsubTheme) unsubTheme();
        if (unsubAuth) unsubAuth();
        if (unsubManualTotal) unsubManualTotal();

      } catch {}
    };
  }, [fadeAnim, slideAnim, id]);

  // --- Excel Export ---
  const exportToExcel = async () => {
  try {
    const data = contacts.map((contact) => ({
      שם: contact.displayName,
      טלפון: contact.phoneNumbers,
      מחיר: Number(contact.newPrice || 0),
      ברכה: giftNotes[contact.recordID] || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מוזמנים');

    const fileName = `Gifts_Summary_${id}.xlsx`;

    // ✅ WEB: הורדה ישירה לדפדפן
    if (Platform.OS === 'web') {
      const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return;
    }

    // ✅ NATIVE: שמירה לקובץ + שיתוף
    const wbBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, wbBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('שגיאה', 'שיתוף לא נתמך במכשיר זה');
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'ייצוא לאקסל',
      UTI: 'com.microsoft.excel.xlsx', // iOS (לא חובה, אבל עוזר)
    });
  } catch (e) {
    console.log('❌ exportToExcel error:', e);
    Alert.alert('שגיאה', `ייצוא נכשל: ${String(e?.message || e)}`);
  }
};


  const updatePrice = useCallback(
    (recordID, price) => {
      // עדכון מקומי מהיר
      const updatedContacts = contacts.map((c) =>
        c.recordID === recordID ? { ...c, newPrice: price } : c
      );
      setContacts(updatedContacts);

      // עדכון סכומים
      const total = updatedContacts.reduce((sum, c) => sum + (parseFloat(c.newPrice) || 0), 0);
      setTotalPrice(total);

      // שמירה לפיירבייס
      if (user?.uid) {
        const dbRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordID}`);
        const existing = contacts.find((c) => c.recordID === recordID) || {};
        set(dbRef, { ...existing, newPrice: price });
      }
    },
    [contacts, user?.uid, id]
  );

  const toggleSort = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

const saveManualTotal = async (text) => {
  if (!user?.uid) return;

  const cleaned = String(text || '').replace(/[^\d.]/g, '');
  const n = Number(cleaned);

  const manualTotalRef = ref(database, `Events/${user.uid}/${id}/payments/giftsSummary/manualTotal`);

  if (!cleaned || Number.isNaN(n)) {
    // אם ריק/לא תקין -> מחזיר לאוטומטי (מוחק)
    await set(manualTotalRef, null);
    setManualTotalActive(false);
    setManualTotalText('');
    setTotalPrice(computedTotal);
    return;
  }

  await set(manualTotalRef, n);
  setManualTotalActive(true);
  setManualTotalText(String(n));
  setTotalPrice(n);
};

const resetManualTotal = async () => {
  if (!user?.uid) return;
  const manualTotalRef = ref(database, `Events/${user.uid}/${id}/payments/giftsSummary/manualTotal`);
  await set(manualTotalRef, null);
  setManualTotalActive(false);
  setManualTotalText('');
  setTotalPrice(computedTotal);
};


  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => {
      const q = searchQuery.toLowerCase();
      const name = (c.displayName || '').toLowerCase();
      const phone = (c.phoneNumbers || '').toLowerCase();
      const note = (giftNotes[c.recordID] || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || note.includes(q);
    });

    result.sort((a, b) => {
      const pA = parseFloat(a.newPrice) || 0;
      const pB = parseFloat(b.newPrice) || 0;
      return sortOrder === 'desc' ? pB - pA : pA - pB;
    });

    return result;
  }, [contacts, searchQuery, giftNotes, sortOrder]);

  const openNote = (guestName, note) => {
    setSelectedGuestName(guestName || '');
    setSelectedNote(note || '');
    setNoteModalVisible(true);
  };

  const renderItem = ({ item }) => {
    const note = giftNotes[item.recordID] || '';

    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.cardRow}>
          {/* מחיר (צד שמאל) */}
          <View style={styles.priceSection}>
            <TextInput
              style={[
                styles.priceInput,
                {
                  backgroundColor: C.inputInner,
                  borderColor: C.border,
                  color: isDark ? '#4ADE80' : '#16A34A',
                },
              ]}
              placeholder="₪"
              placeholderTextColor={C.subText}
              keyboardType="numeric"
              value={String(item.newPrice || '')}
              onChangeText={(text) => updatePrice(item.recordID, text)}
            />
          </View>

          {/* כפתור ברכה (אמצע) */}
          <TouchableOpacity
            onPress={() => openNote(item.displayName, note)}
            style={[
              styles.iconBtn,
              { backgroundColor: note ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)') : 'transparent' },
              !note ? { opacity: 0.3 } : null,
            ]}
            disabled={!note && !item.newPrice}
          >
            <Text style={{ fontSize: 18 }}>💌</Text>
          </TouchableOpacity>

          {/* פרטים (צד ימין) */}
          <View style={styles.infoSection}>
            <Text style={[styles.nameText, { color: C.text }]} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={[styles.phoneText, { color: C.subText }]}>{item.phoneNumbers}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.screen }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.screen}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: C.header }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)' },
            ]}
          >
            <Text style={[styles.backBtnText, { color: C.subText }]}>חזור ←</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: C.text }]}>ניהול מתנות</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* KPI Cards */}
        <Animated.View style={[styles.kpiContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View
            style={[
              styles.kpiCard,
              { backgroundColor: C.kpiCard, borderColor: C.borderSoft },
            ]}
          >
            <Text style={[styles.kpiValue, { color: C.text }]}>₪{totalPrice.toLocaleString()}</Text>
            <Text style={[styles.kpiLabel, { color: C.subText }]}>סה"כ מתנות</Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: C.kpiCard, borderColor: isDark ? '#6366F1' : '#A5B4FC' },
            ]}
          >
            <Text style={[styles.kpiValue, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
              ₪{averagePrice.toLocaleString()}
            </Text>
            <Text style={[styles.kpiLabel, { color: C.subText }]}>ממוצע לאדם</Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: C.kpiCard, borderColor: isDark ? '#10B981' : '#86EFAC' },
            ]}
          >
            <Text style={[styles.kpiValue, { color: isDark ? '#34D399' : '#16A34A' }]}>
              {paidGuestsCount} / {contacts.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: C.subText }]}>אורחים ששילמו</Text>
          </View>
        </Animated.View>
        
      </View>

{/* Body */}
<View style={[styles.body, { backgroundColor: C.body }]}>
  <View style={styles.centerWrap}>
    {/* Search & Sort */}
    <View style={styles.toolbar}>
      <TouchableOpacity
        onPress={toggleSort}
        style={[styles.sortBtn, { backgroundColor: C.input, borderColor: C.border }]}
      >
        <Text style={[styles.sortBtnText, { color: C.subText }]}>
          {sortOrder === 'desc' ? '▼' : '▲'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: C.input, borderColor: C.border, color: C.text },
        ]}
        placeholder="חיפוש לפי שם / ברכה..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={C.muted}
        textAlign="right"
      />
    </View>

    {contacts.length === 0 ? (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: C.muted }]}>אין מוזמנים ברשימה</Text>
      </View>
    ) : (
      <FlatList
        data={filteredContacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.recordID}
        style={styles.list}                 // ✅ חדש
        contentContainerStyle={styles.listContent} // ✅ חדש
        showsVerticalScrollIndicator={false}
      />
    )}
  </View>
</View>


      {/* Export Button (Floating) */}
      <Animated.View style={[styles.fabContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={exportToExcel}
          style={[styles.fab, { backgroundColor: C.success }]}
          activeOpacity={0.85}
        >
          <Image
            source={require('../assets/excel.png')}
            style={[styles.fabIcon, { tintColor: '#fff' }]}
            resizeMode="contain"
          />
          <Text style={styles.fabText}>ייצא לאקסל</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Note Modal */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: C.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: C.modalCard, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>💌 ברכה מהאורח</Text>
            {!!selectedGuestName && (
              <Text style={[styles.modalSub, { color: C.subText }]}>{selectedGuestName}</Text>
            )}

            <View style={[styles.noteBox, { backgroundColor: C.modalNoteBox, borderColor: C.border }]}>
              <ScrollView style={{ maxHeight: 200 }}>
                <Text style={[styles.noteText, { color: isDark ? '#E2E8F0' : '#0F172A' }]}>
                  {selectedNote || 'לא נמצאה ברכה לאורח זה.'}
                </Text>
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => setNoteModalVisible(false)}
              style={[styles.modalBtn, { backgroundColor: C.accent }]}
            >
              <Text style={styles.modalBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main
  screen: { flex: 1 },

  // Header
  header: {
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  backBtnText: { fontSize: 14, fontWeight: 'bold' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },

  // KPI Cards
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  kpiValue: { fontSize: 16, fontWeight: 'bold' },

  // Body
  body: { flex: 1, paddingHorizontal: 16 },

  // Toolbar
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 10 },
  sortBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  sortBtnText: { fontSize: 14, fontWeight: 'bold' },
searchInput: {
  flex: 1,
  borderRadius: 12,
  height: 46,
  paddingHorizontal: 14,
  fontSize: 16,
  borderWidth: 1,
  textAlign: 'right',
  writingDirection: 'rtl',
},


  // List Item Card
  card: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  priceSection: {
    width: 90,
    justifyContent: 'center',
  },
  priceInput: {
    fontSize: 18,
    fontWeight: 'bold',
    borderRadius: 8,
    paddingVertical: 8,
    textAlign: 'center',
    borderWidth: 1,
  },

iconBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 10,  // ✅ ימינה
  marginRight: 0,  // ✅ מבטל דחיפה הפוכה
},


  infoSection: { flex: 1, alignItems: 'flex-end', marginLeft: 10 },
  nameText: { fontSize: 16, fontWeight: 'bold' },
  phoneText: { fontSize: 13, marginTop: 2 },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600' },

  // FAB
  fabContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
  },
  fabIcon: { width: 24, height: 24, marginRight: 10 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalSub: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  noteBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  noteText: { fontSize: 16, textAlign: 'right', lineHeight: 24 },
  modalBtn: { marginTop: 24, paddingVertical: 12, width: '100%', borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  centerWrap: {
  width: '100%',
  maxWidth: 780,     // ✅ קובע צרות בדסקטופ (תשחק עם 700-900 אם בא לך)
  alignSelf: 'center',
},

list: {
  width: '100%',
},

listContent: {
  paddingBottom: 100,
  paddingTop: 10,
},

});

export default Gift;
