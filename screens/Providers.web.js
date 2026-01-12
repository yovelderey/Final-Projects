// Providers.js — Responsive Providers tables (Phone friendly) + Header like Management + DarkMode from DB (NO toggle button)

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  StatusBar,
  Platform,
  UIManager,
  LayoutAnimation,
  Animated,
  useWindowDimensions,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

import { ref, set, get, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../firebase';

// --- enable LayoutAnimation on Android ---
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ==== Theme Colors (same as Management) ====
const COLORS = {
  light: {
    bg: '#F8FAFC',
    headerBg: '#FFFFFF',
    text: '#1E293B',
    subText: '#64748B',
    card: '#FFFFFF',
    border: '#E2E8F0',
    inputBg: '#F1F5F9',
    primary: '#4F46E5',
    iconBg: '#F1F5F9',
    sheetBg: '#FFFFFF',
    danger: '#EF4444',
  },
  dark: {
    bg: '#0F172A',
    headerBg: '#1E293B',
    text: '#F8FAFC',
    subText: '#94A3B8',
    card: '#1E293B',
    border: '#334155',
    inputBg: '#0F172A',
    primary: '#6366F1',
    iconBg: '#334155',
    sheetBg: '#1E293B',
    danger: '#EF4444',
  },
};

// column flex (keep consistent between headers & rows)
const COL_FLEX = {
  supplier: 1.05,
  offer: 1.35,
  price: 0.8,
};

const Providers = (props) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const id = props?.route?.params?.id;

  const { width } = useWindowDimensions();
const isPhone = width < 700;   // כל טלפון + טאבלטים קטנים
const isCompact = width < 520; // ✅ כל הטלפונים נכנסים לפה (כולל iPhone 15/14 וכו׳)
const isTiny = width < 380;    // מאוד קטן (SE וכד׳)


  const systemScheme = useColorScheme();
  const [dbMode, setDbMode] = useState('auto'); // light/dark/auto
  const [user, setUser] = useState(null);

  const isDarkMode = useMemo(() => {
    if (dbMode === 'dark') return true;
    if (dbMode === 'light') return false;
    return systemScheme === 'dark';
  }, [dbMode, systemScheme]);

  const theme = isDarkMode ? COLORS.dark : COLORS.light;

  const headerTopPadding =
    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : insets.top;

  // tables
  const createNewTable = useCallback(
    () => ({
      name: '',
      // data[row][col] => [price, offer, supplierName]
      data: Array.from({ length: 5 }, () => Array(3).fill('')),
    }),
    []
  );

  const [tables, setTables] = useState([createNewTable()]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // -----------------------------
  // Theme subscription (same logic as Management) — NO TOGGLE BUTTON HERE
  // -----------------------------
  useEffect(() => {
    let unsubAdmin = null;
    let unsubLegacy = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubAdmin) unsubAdmin();
      if (unsubLegacy) unsubLegacy();

      if (!currentUser) {
        setUser(null);
        setDbMode('auto');
        return;
      }

      setUser(currentUser);

      const applyMode = (raw) => {
        let mode = String(raw ?? 'auto').toLowerCase();
        if (raw === true) mode = 'dark';
        if (raw === false) mode = 'light';
        if (!['light', 'dark', 'auto'].includes(mode)) mode = 'auto';
        setDbMode(mode);
      };

      const adminRef = ref(database, `Events/${currentUser.uid}/${id}/__admin/ui/theme/mode`);
      const legacyRef = ref(database, `Events/${currentUser.uid}/${id}/ui/theme/mode`);

      let hasAdminTheme = false;

      unsubAdmin = onValue(adminRef, (snap) => {
        const v = snap.val();
        hasAdminTheme = v !== null && v !== undefined;
        if (hasAdminTheme) applyMode(v);
      });

      unsubLegacy = onValue(legacyRef, (snap) => {
        if (!hasAdminTheme) applyMode(snap.val());
      });
    });

    return () => {
      if (unsubAdmin) unsubAdmin();
      if (unsubLegacy) unsubLegacy();
      unsubAuth();
    };
  }, [id]);

  // -----------------------------
  // Load Providers tables
  // -----------------------------
  const loadTables = useCallback(async () => {
    if (!user || !id) return;

    try {
      const r = ref(database, `Events/${user.uid}/${id}/Providers`);
      const snap = await get(r);

      if (snap.exists() && Array.isArray(snap.val())) {
        setTables(snap.val());
      } else {
        setTables([createNewTable()]);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }).start();
    } catch {
      setTables([createNewTable()]);
    }
  }, [user, id, createNewTable, fadeAnim]);

  useEffect(() => {
    if (!user || !id) return;
    loadTables();
  }, [user, id, loadTables]);

  useFocusEffect(
    useCallback(() => {
      if (!user || !id) return;
      loadTables();
    }, [user, id, loadTables])
  );

  const saveToFirebase = useCallback(
    async (updatedTables) => {
      if (!user || !id) return;
      await set(ref(database, `Events/${user.uid}/${id}/Providers`), updatedTables);
    },
    [user, id]
  );

  // -----------------------------
  // Actions
  // -----------------------------
  const handleAddTable = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    const next = [createNewTable(), ...tables];
    setTables(next);
    saveToFirebase(next);
  };

  const handleRemoveFirstTable = () => {
    if (tables.length <= 1) {
      Alert.alert('אי אפשר', 'חייב להישאר לפחות טבלה אחת.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = tables.slice(1);
    setTables(next);
    saveToFirebase(next);
  };

  const handleClearAllTables = () => {
    Alert.alert('ניקוי הכל', 'האם למחוק את כל טבלאות ההשוואה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק הכל',
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.linear);
          const next = [createNewTable()];
          setTables(next);
          saveToFirebase(next);
        },
      },
    ]);
  };

  const showInfoAlert = () => {
    Alert.alert(
      'מדריך השוואת ספקים 💡',
      'כאן ניתן לערוך טבלאות השוואה בין ספקים.\n\n' +
        '• רשמו שם קטגוריה (לדוגמה: צלמים)\n' +
        '• מלאו שם ספק, מה הוא מציע ומחיר\n' +
        '• השתמשו בכפתורים למעלה להוספה/הסרה/ניקוי.',
      [{ text: 'הבנתי' }]
    );
  };

  const handleInputChange = (text, tableIndex, rowIndex, colIndex) => {
    const next = [...tables];
    next[tableIndex].data[rowIndex][colIndex] = text;
    setTables(next);
    saveToFirebase(next);
  };

  const handleTableNameChange = (text, tableIndex) => {
    const next = [...tables];
    next[tableIndex].name = text;
    setTables(next);
    saveToFirebase(next);
  };

  // -----------------------------
  // UI
  // -----------------------------
  const Header = () => {
    return (
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBg,
            paddingTop: headerTopPadding,
            borderBottomColor: theme.primary,
            shadowColor: theme.primary,
          },
        ]}
      >
        <View style={styles.headerTop}>
          {/* left */}
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.iconBtn, { backgroundColor: theme.bg }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.iconBtnText, { color: theme.text }]}>חזור ←</Text>
            </TouchableOpacity>
          </View>

          {/* center */}
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            השוואת ספקים
          </Text>

          {/* right placeholder (same width) — ✅ removed darkmode toggle button */}
          <View style={[styles.headerSide, { alignItems: 'flex-end' }]} />
        </View>

        <Text style={[styles.headerSubtitle, { color: theme.subText }]}>
          בחרו נכון — הכל מסודר במקום אחד
        </Text>

        {/* actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.squareBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={showInfoAlert}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 18 }}>ℹ️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.squareBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={handleClearAllTables}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 18 }}>🧹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.squareBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={handleRemoveFirstTable}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.danger }}>－</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.squareBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={handleAddTable}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>＋</Text>
          </TouchableOpacity>

          <View style={[styles.countBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.countText, { color: theme.primary }]}>{tables.length}</Text>
          </View>
        </View>
      </View>
    );
  };

  const RecommendationCard = () => (
    <TouchableOpacity
      style={[styles.recCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: '#000' }]}
      onPress={() => navigation.navigate('ProvidersScreen')}
      activeOpacity={0.85}
    >
      <View style={styles.recContent}>
        <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
          <Text style={{ fontSize: 18 }}>🏆</Text>
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 14 }}>
          <Text style={[styles.recTitle, { color: theme.text }]}>מחפשים המלצות?</Text>
          <Text style={[styles.recSubtitle, { color: theme.subText }]}>
            כנסו למאגר הספקים המומלצים שלנו
          </Text>
        </View>

        <Text style={{ fontSize: 18, color: theme.subText }}>←</Text>
      </View>
    </TouchableOpacity>
  );

const renderRowCompact = (row, tableIndex, rowIndex) => {
  // row = [price, offer, supplierName]
  return (
    <View key={rowIndex} style={[styles.compactRowWrap, { borderColor: theme.border }]}>
      {/* labels */}
      <View style={styles.compactLabelsRow}>
        <Text style={[styles.compactLabel, { color: theme.subText, flex: 1 }]}>שם הספק</Text>
        <Text style={[styles.compactLabel, { color: theme.subText, width: isTiny ? 92 : 110, textAlign: 'center' }]}>
          מחיר
        </Text>
      </View>

      {/* supplier + price */}
      <View style={styles.compactTopRow}>
        <TextInput
          style={[
            styles.cellInput,
            styles.compactSupplier,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={row[2]}
          onChangeText={(t) => handleInputChange(t, tableIndex, rowIndex, 2)}
          placeholder={`שם ספק ${rowIndex + 1}`}
          placeholderTextColor={theme.subText}
          textAlign="right"
          writingDirection="rtl"
        />

        <TextInput
          style={[
            styles.cellInput,
            styles.compactPrice,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              color: theme.text,
              width: isTiny ? 92 : 110,
            },
          ]}
          value={row[0]}
          onChangeText={(t) => handleInputChange(t, tableIndex, rowIndex, 0)}
          placeholder="₪"
          keyboardType="numeric"
          placeholderTextColor={theme.subText}
          textAlign="center"
        />
      </View>

      {/* label offer */}
      <Text style={[styles.compactLabel, { color: theme.subText, textAlign: 'right', marginBottom: 6 }]}>
        הצעה / פרטים
      </Text>

      {/* offer */}
      <TextInput
        style={[
          styles.cellInput,
          styles.compactOffer,
          {
            backgroundColor: theme.inputBg,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={row[1]}
        onChangeText={(t) => handleInputChange(t, tableIndex, rowIndex, 1)}
        placeholder="כתבו כאן..."
        placeholderTextColor={theme.subText}
        textAlign="right"
        writingDirection="rtl"
        multiline
        numberOfLines={3}
      />
    </View>
  );
};


  const renderTable = (table, tableIndex) => (
    <View
      key={tableIndex}
      style={[
        styles.tableCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: '#000',
          padding: isCompact ? 12 : 14,
        },
      ]}
    >
      {/* table title */}
      <View style={styles.tableHeaderInputContainer}>
        <Text style={{ fontSize: 18 }}>🏷️</Text>
        <TextInput
          style={[
            styles.tableNameInput,
            {
              color: theme.text,
              borderBottomColor: theme.border,
              fontSize: isCompact ? 16 : 18,
            },
          ]}
          value={table.name}
          onChangeText={(t) => handleTableNameChange(t, tableIndex)}
          placeholder="שם הקטגוריה (לדוגמה: אולמות / צלמים)"
          placeholderTextColor={theme.subText}
          textAlign="right"
          writingDirection="rtl"
        />
      </View>

      {/* headers: show only when NOT compact (on phone compact it looks better without headers) */}
      {!isCompact && (
        <View style={[styles.columnHeadersRow, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Text style={[styles.colHeader, { color: theme.subText, flex: COL_FLEX.supplier }]}>שם הספק</Text>
          <Text style={[styles.colHeader, { color: theme.subText, flex: COL_FLEX.offer }]}>הצעה</Text>
          <Text style={[styles.colHeader, { color: theme.subText, flex: COL_FLEX.price }]}>מחיר</Text>
        </View>
      )}

      {/* rows */}
      {table.data.map((row, rowIndex) => {
        if (isCompact) return renderRowCompact(row, tableIndex, rowIndex);

        return (
          <View key={rowIndex} style={[styles.dataRow, { borderBottomColor: theme.border }]}>
            {/* supplierName (col 2) */}
            <TextInput
              style={[
                styles.cellInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.text,
                  fontWeight: '900',
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  paddingRight: 10,
                  flex: COL_FLEX.supplier,
                },
              ]}
              value={row[2]}
              onChangeText={(t) => handleInputChange(t, tableIndex, rowIndex, 2)}
              placeholder={`ספק ${rowIndex + 1}`}
              placeholderTextColor={theme.subText}
            />

            {/* offer (col 1) */}
            <TextInput
              style={[
                styles.cellInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.text,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                  paddingRight: 10,
                  flex: COL_FLEX.offer,
                },
              ]}
              value={row[1]}
              onChangeText={(t) => handleInputChange(t, tableIndex, rowIndex, 1)}
              placeholder="פרטים..."
              placeholderTextColor={theme.subText}
            />

            {/* price (col 0) */}
            <TextInput
              style={[
                styles.cellInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.text,
                  textAlign: 'center',
                  flex: COL_FLEX.price,
                },
              ]}
              value={row[0]}
              onChangeText={(t) => handleInputChange(t, tableIndex, rowIndex, 0)}
              placeholder="₪"
              keyboardType="numeric"
              placeholderTextColor={theme.subText}
            />
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg}
        translucent={false}
      />

      <Header />

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isPhone ? 12 : 16,
            maxWidth: isPhone ? 700 : 800,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <RecommendationCard />

        <Text style={[styles.sectionTitle, { color: theme.subText }]}>
          טבלאות השוואה ({tables.length})
        </Text>

        {tables.map((t, i) => renderTable(t, i))}

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // ===== Header like Management =====
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  headerSide: {
    width: 96,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 13, fontWeight: '700' },
  headerSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },

  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  squareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 50,
  },
  countText: { fontSize: 16, fontWeight: '800' },

  // ===== Body =====
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 100,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '700',
  },

  // ===== Recommendation Card =====
  recCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recContent: { flexDirection: 'row-reverse', alignItems: 'center' },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  recTitle: { fontSize: 18, fontWeight: '900' },
  recSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '600' },

  // ===== Table Card =====
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeaderInputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tableNameInput: {
    flex: 1,
    fontWeight: '900',
    textAlign: 'right',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },

  columnHeadersRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  colHeader: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
  },

  dataRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },

  cellInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '700',
  },

  // ===== Compact (phone) rows =====
  compactRowWrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  compactTopRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  compactSupplier: {
    flex: 1,
    height: 44,
    fontWeight: '900',
  },
  compactPrice: {
    width: 110,
    height: 44,
    fontWeight: '900',
  },
  compactOffer: {
    minHeight: 44,
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    textAlignVertical: 'top',
  },
  compactLabelsRow: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  marginBottom: 6,
},
compactLabel: {
  fontSize: 12,
  fontWeight: '800',
},

});

export default Providers;
