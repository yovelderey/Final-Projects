// Budget.js — FULL (Header like Management + FIX table alignment + Calendar Date Picker + NO background image)

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  StatusBar,
  Platform,
  useWindowDimensions,
  useColorScheme,
  ScrollView,
  LayoutAnimation,
  UIManager,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';

import { getDatabase, ref, set, get, onValue } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/FontAwesome';
import XLSX, { utils, writeFileXLSX } from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---- Web-safe pressable wrapper
const Tap = ({ onPress, onLongPress, children, style, activeOpacity = 0.8, ...rest }) => {
  if (Platform.OS === 'web') {
    return (
      <View
        role="button"
        tabIndex={0}
        onClick={onPress}
        onContextMenu={(e) => {
          if (onLongPress) {
            e.preventDefault();
            onLongPress();
          }
        }}
        style={[style, { cursor: 'pointer', transition: '0.2s opacity' }]}
        {...rest}
      >
        {children}
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={activeOpacity}
      style={style}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
};

// ---- Safe Calculator Logic
const tokenize = (s) => {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ t: 'num', v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if ('+-*/%^()'.includes(ch)) {
      tokens.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    throw new Error('תווים לא נתמכים');
  }
  return tokens;
};
const prec = { '^': 4, '*': 3, '/': 3, '%': 3, '+': 2, '-': 2 };
const toRPN = (tokens) => {
  const out = [],
    st = [];
  for (const t of tokens) {
    if (t.t === 'num') out.push(t);
    else if (t.v === '(') st.push(t);
    else if (t.v === ')') {
      while (st.length && st[st.length - 1].v !== '(') out.push(st.pop());
      if (!st.length) throw new Error('סוגריים לא תואמים');
      st.pop();
    } else {
      while (st.length && st[st.length - 1].v !== '(' && prec[st[st.length - 1].v] >= prec[t.v]) {
        out.push(st.pop());
      }
      st.push(t);
    }
  }
  while (st.length) {
    const op = st.pop();
    if (op.v === '(') throw new Error('סוגריים לא תואמים');
    out.push(op);
  }
  return out;
};
const evalRPN = (rpn) => {
  const st = [];
  for (const t of rpn) {
    if (t.t === 'num') st.push(t.v);
    else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error('ביטוי לא חוקי');
      let r = 0;
      switch (t.v) {
        case '+':
          r = a + b;
          break;
        case '-':
          r = a - b;
          break;
        case '*':
          r = a * b;
          break;
        case '/':
          r = b === 0 ? NaN : a / b;
          break;
        case '%':
          r = a % b;
          break;
        case '^':
          r = Math.pow(a, b);
          break;
      }
      st.push(r);
    }
  }
  return st[0];
};
const safeCalc = (expr) => {
  const rpn = toRPN(tokenize(String(expr)));
  const res = evalRPN(rpn);
  if (!isFinite(res)) throw new Error('תוצאה לא תקינה');
  return res;
};

// ===== Calendar helpers =====
const pad2 = (n) => String(n).padStart(2, '0');
const monthNamesHe = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// parse "DD/MM" or "DD/MM/YYYY"
const parseHebDate = (s) => {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yy = m[3] ? Number(m[3]) : new Date().getFullYear();
  if (String(m[3] || '').length === 2) yy = 2000 + yy;
  const d = new Date(yy, mm - 1, dd);
  if (isNaN(d.getTime())) return null;
  return d;
};

const formatHebDate = (d) => {
  if (!d) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getMonthMatrix = (year, monthIdx) => {
  // monthIdx: 0..11
  const first = new Date(year, monthIdx, 1);
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // Sunday=0 ... Saturday=6  (בישראל זה מעולה)
  const startDow = first.getDay();

  const cells = [];
  // blanks before
  for (let i = 0; i < startDow; i++) cells.push(null);
  // days
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // chunk to weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

const CalendarModal = ({
  visible,
  onClose,
  onSelect,
  initialDate,
  COLORS,
}) => {
  const init = initialDate || new Date();
  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());
  const [selected, setSelected] = useState(initialDate || null);

  useEffect(() => {
    if (!visible) return;
    const base = initialDate || new Date();
    setYear(base.getFullYear());
    setMonth(base.getMonth());
    setSelected(initialDate || null);
  }, [visible, initialDate]);

  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const goMonth = (delta) => {
    let y = year;
    let m = month + delta;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  };

  const goYear = (delta) => setYear((p) => p + delta);

  const weekLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sun..Sat

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.calContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          {/* Header */}
          <View style={styles.calTopRow}>
            <Tap
              onPress={() => goYear(-1)}
              style={[styles.calNavBtn, { backgroundColor: COLORS.inputBg, borderColor: COLORS.border }]}
            >
              <Text style={[styles.calNavTxt, { color: COLORS.text }]}>{'« שנה'}</Text>
            </Tap>

            <Tap
              onPress={() => goMonth(-1)}
              style={[styles.calNavBtn, { backgroundColor: COLORS.inputBg, borderColor: COLORS.border }]}
            >
              <Icon name="chevron-right" size={14} color={COLORS.text} />
            </Tap>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.calTitle, { color: COLORS.text }]}>
                {monthNamesHe[month]} {year}
              </Text>
            </View>

            <Tap
              onPress={() => goMonth(1)}
              style={[styles.calNavBtn, { backgroundColor: COLORS.inputBg, borderColor: COLORS.border }]}
            >
              <Icon name="chevron-left" size={14} color={COLORS.text} />
            </Tap>

            <Tap
              onPress={() => goYear(1)}
              style={[styles.calNavBtn, { backgroundColor: COLORS.inputBg, borderColor: COLORS.border }]}
            >
              <Text style={[styles.calNavTxt, { color: COLORS.text }]}>{'שנה »'}</Text>
            </Tap>
          </View>

          {/* Week labels */}
          <View style={styles.calWeekRow}>
            {weekLabels.map((w) => (
              <Text key={w} style={[styles.calWeekTxt, { color: COLORS.sub }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={{ gap: 8 }}>
            {weeks.map((wk, wi) => (
              <View key={wi} style={styles.calRow}>
                {wk.map((cell, ci) => {
                  const isSel = isSameDay(cell, selected);
                  const isToday = isSameDay(cell, new Date());
                  const disabled = !cell;

                  return (
                    <Tap
                      key={ci}
                      onPress={() => {
                        if (!cell) return;
                        setSelected(cell);
                      }}
                      style={[
                        styles.calCell,
                        {
                          backgroundColor: disabled
                            ? 'transparent'
                            : isSel
                            ? COLORS.primary
                            : COLORS.inputBg,
                          borderColor: isSel ? COLORS.primary : COLORS.border,
                          opacity: disabled ? 0 : 1,
                        },
                        isToday && !isSel && { borderColor: COLORS.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calCellTxt,
                          { color: isSel ? COLORS.onPrimary : COLORS.text },
                        ]}
                      >
                        {cell ? cell.getDate() : ''}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.calActions}>
            <Tap onPress={onClose} style={[styles.calActionBtn, { backgroundColor: COLORS.sub }]}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>ביטול</Text>
            </Tap>
            <Tap
              onPress={() => {
                if (!selected) return;
                onSelect(selected);
              }}
              style={[styles.calActionBtn, { backgroundColor: COLORS.primary }]}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>בחר</Text>
            </Tap>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Budget = (props) => {
  const id = props.route.params.id;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: screenW } = useWindowDimensions();
  const isMobile = screenW < 700;
// Firebase (חייב להיות לפני כל useEffect שמשתמש בזה)
const database = getDatabase();

// user כ-state כדי שאם הוא נטען אחרי רגע, האפקטים ירוצו שוב
const [user, setUser] = useState(firebase.auth().currentUser);

useEffect(() => {
  const unsub = firebase.auth().onAuthStateChanged((u) => setUser(u));
  return () => unsub && unsub();
}, []);

  // Theme
  // Theme (from Firebase)
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('auto'); // 'auto' | 'light' | 'dark'

  const normalizeThemeMode = (v) => {
    const s = String(v || '').toLowerCase().trim();
    if (s === 'dark' || s === 'light' || s === 'auto') return s;
    return 'auto';
  };

 useEffect(() => {
  if (!user?.uid || !id) return;

  let unsubscribe = null;
  let cancelled = false;

  const candidates = [
    `Events/${user.uid}/${id}/Table_RSVPs/__admin/audit/ui/theme/mode`, // כמו שביקשת
    `Events/${user.uid}/${id}/__admin/audit/ui/theme/mode`,            // לפעמים זה פה
    `Events/${user.uid}/${id}/__admin/ui/theme/mode`,                  // לפעמים בלי audit
    `Events/${user.uid}/${id}/admin/ui/theme/mode`,                    // אם יש לך "admin" בלי __
    `Events/${user.uid}/${id}/Table_RSVPs/__admin/ui/theme/mode`,      // Table_RSVPs בלי audit
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
        console.log('[Theme] NOT FOUND in candidates. using auto', { uid: user.uid, id });
        setThemeMode('auto');
        return;
      }

      console.log('[Theme] RESOLVED PATH:', foundPath, 'VALUE:', foundVal);
      setThemeMode(normalizeThemeMode(foundVal));

      // מאזין רק לנתיב שנמצא
      const r = ref(database, foundPath);
      unsubscribe = onValue(
        r,
        (snap) => {
          console.log('[Theme] LIVE UPDATE:', foundPath, '=>', snap.val());
          if (snap.exists()) setThemeMode(normalizeThemeMode(snap.val()));
          else setThemeMode('auto');
        },
        (err) => console.log('[Theme] listener error:', err)
      );
    } catch (e) {
      console.log('[Theme] resolve error:', e);
      setThemeMode('auto');
    }
  };

  run();

  return () => {
    cancelled = true;
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}, [user?.uid, id]);


  // חישוב סופי
  const isDark =
    themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark');

  const COLORS = useMemo(() => {
    const primary = '#6C63FF';
    const danger = '#F87171';
    if (isDark) {
      return {
        bg: '#0F172A',
        card: '#1E293B',
        text: '#F1F5F9',
        sub: '#94A3B8',
        border: '#334155',
        primary,
        onPrimary: '#FFFFFF',
        danger,
        inputBg: '#0B1220',
        placeholder: '#64748B',
        success: '#10B981',
      };
    }
    return {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      text: '#1E293B',
      sub: '#64748B',
      border: '#E2E8F0',
      primary,
      onPrimary: '#FFFFFF',
      danger,
      inputBg: '#F1F5F9',
      placeholder: '#94A3B8',
      success: '#10B981',
    };
  }, [isDark]);

  const headerTopPadding =
    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : insets.top;

  // Firebase & State


  const [rows, setRows] = useState([{ checked: false, price: '', content: '', date: '', name: '' }]);
  const [eventDetails, setEventDetails] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Modals
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [lastEdited, setLastEdited] = useState({ row: null, field: null });

  // Calendar modal
  const [calVisible, setCalVisible] = useState(false);
  const [calRowIndex, setCalRowIndex] = useState(null);

  // Stats
  const [totalCheckedSum, setTotalCheckedSum] = useState(0);
  const [totalCheckedCount, setTotalCheckedCount] = useState(0);
  const [totalAdvance, setTotalAdvance] = useState(0);
  const [totalRemain, setTotalRemain] = useState(0);

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  // Fetch Data on Mount
  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const itemsRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
        const snap = await get(itemsRef);
        if (snap.exists()) {
          const data = snap.val();
          const arr = Array.isArray(data) ? data : Object.values(data || {});
          setRows(arr.length ? arr : [{ checked: false, price: '', content: '', date: '', name: '' }]);
        }
        setIsDataLoaded(true);
      } catch (e) {
        console.log(e);
        setIsDataLoaded(true);
      }
      try {
        const refEv = ref(database, `Events/${user.uid}/${id}/`);
        const s2 = await get(refEv);
        if (s2.exists()) setEventDetails(s2.val() || {});
      } catch {}
    };
    fetch();
  }, [user, id]);

  // Recalculate Totals & Update Spend
  useEffect(() => {
    let sum = 0,
      cnt = 0,
      adv = 0;

    rows.forEach((r) => {
      const price = +String(r.price).replace(/[^0-9.-]/g, '') || 0;
      const a = +String(r.content).replace(/[^0-9.-]/g, '') || 0;
      if (r.checked) {
        sum += price;
        adv += a;
        cnt += 1;
      }
    });

    setTotalCheckedSum(sum);
    setTotalCheckedCount(cnt);
    setTotalAdvance(adv);
    setTotalRemain(Math.max(sum - adv, 0));

    if (user && isDataLoaded) {
      set(ref(getDatabase(), `Events/${user.uid}/${id}/spend`), sum).catch(() => {});
    }
  }, [rows, user, id, isDataLoaded]);

  // Auto-save
  useEffect(() => {
    if (!isDataLoaded) return;
    const timer = setTimeout(() => {
      saveRows(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [rows, isDataLoaded]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (isDataLoaded) saveRows(true);
    });
    return unsubscribe;
  }, [navigation, rows, isDataLoaded]);

  // CRUD
  const saveRows = async (silent = false) => {
    if (!user) return;
    try {
      const itemsRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
      await set(itemsRef, rows);
      if (!silent) Alert.alert('נשמר', 'הנתונים נשמרו בהצלחה.');
    } catch (e) {
      if (!silent) Alert.alert('שגיאה', 'שמירת הנתונים נכשלה');
    }
  };

  const addRow = () => {
    animateLayout();
    setRows((prev) => [...prev, { checked: false, price: '', content: '', date: '', name: '' }]);
  };

  const removeLastRow = () => {
    if (rows.length <= 1) return;
    animateLayout();
    setRows((prev) => prev.slice(0, -1));
  };

  const setRowField = (idx, field, value) => {
    setRows((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: value };
      return n;
    });
  };

  const toggleRow = (idx) => {
    setRows((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], checked: !n[idx].checked };
      return n;
    });
  };

  // Export
  const exportData = async (type = 'xlsx') => {
    try {
      const data = [
        ['✓', 'Price', 'Advance', 'Date', 'Expense'],
        ...rows.map((r) => [r.checked ? 'V' : '', r.price, r.content, r.date, r.name]),
        [],
        ['Summary'],
        ['Total', totalCheckedSum],
        ['Remain', totalRemain],
      ];
      const ws = utils.aoa_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Budget');
      const filename = `Budget_${Date.now()}.${type === 'csv' ? 'csv' : 'xlsx'}`;

      if (Platform.OS === 'web') {
        writeFileXLSX(wb, filename);
        return;
      }

      if (type === 'csv') {
        const csv = utils.sheet_to_csv(ws);
        const uri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri);
      } else {
        const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ===== TABLE column flexes (MUST match header & row) =====
  const COL = useMemo(
    () => ({
      check: 0.5,
      price: 1.5,
      adv: 1.5,
      date: 2,
      name: 3,
    }),
    []
  );

  const openCalendarForRow = (rowIdx) => {
    setCalRowIndex(rowIdx);
    setCalVisible(true);
  };

  const currentRowDateObj = useMemo(() => {
    if (calRowIndex === null || calRowIndex === undefined) return null;
    const s = rows?.[calRowIndex]?.date;
    return parseHebDate(s) || new Date();
  }, [calRowIndex, rows]);

  const applySelectedDate = (d) => {
    if (calRowIndex === null || calRowIndex === undefined) return;
    setRowField(calRowIndex, 'date', formatHebDate(d));
    setCalVisible(false);
    setCalRowIndex(null);
  };

  // Render item
  const renderItem = ({ item, index }) => {
    if (isMobile) {
      return (
        <View style={[styles.cardMobile, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <View style={styles.cardHeader}>
            <TextInput
              style={[styles.inputTitle, { color: COLORS.text }]}
              value={item.name}
              onChangeText={(t) => setRowField(index, 'name', t)}
              placeholder="שם הוצאה"
              placeholderTextColor={COLORS.placeholder}
              textAlign="right"
            />
            <Tap
              onPress={() => toggleRow(index)}
              style={[
                styles.checkbox,
                { borderColor: COLORS.border },
                item.checked && { backgroundColor: COLORS.success, borderColor: COLORS.success },
              ]}
            >
              {item.checked && <Icon name="check" size={12} color="#fff" />}
            </Tap>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: COLORS.sub }]}>תאריך</Text>

              <Tap
                onPress={() => openCalendarForRow(index)}
                style={[
                  styles.inputSmall,
                  {
                    backgroundColor: COLORS.inputBg,
                    borderColor: COLORS.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Text style={{ color: item.date ? COLORS.text : COLORS.placeholder, fontWeight: '700' }}>
                  {item.date || 'בחר תאריך'}
                </Text>
              </Tap>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: COLORS.sub }]}>מקדמה</Text>
              <TextInput
                style={[
                  styles.inputSmall,
                  { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border, textAlign: 'center' },
                ]}
                value={item.content}
                onChangeText={(t) => setRowField(index, 'content', t)}
                onFocus={() => setLastEdited({ row: index, field: 'content' })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: COLORS.sub }]}>מחיר</Text>
              <TextInput
                style={[
                  styles.inputSmall,
                  { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border, textAlign: 'center' },
                ]}
                value={item.price}
                onChangeText={(t) => setRowField(index, 'price', t)}
                onFocus={() => setLastEdited({ row: index, field: 'price' })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>
        </View>
      );
    }

    // Desktop/Table row — FIXED alignment (same column wrappers as header)
    return (
      <View style={[styles.tableRow, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}>
        {/* ✓ */}
        <View style={[styles.tdCell, { flex: COL.check }]}>
          <Tap
            onPress={() => toggleRow(index)}
            style={[
              styles.checkboxTable,
              { borderColor: COLORS.border },
              item.checked && { backgroundColor: COLORS.success, borderColor: COLORS.success },
            ]}
          >
            {item.checked && <Icon name="check" size={14} color="#fff" />}
          </Tap>
        </View>

        {/* price */}
        <View style={[styles.tdCell, { flex: COL.price }]}>
          <TextInput
            style={[styles.tableInput, { color: COLORS.text, textAlign: 'center' }]}
            value={item.price}
            onChangeText={(t) => setRowField(index, 'price', t)}
            onFocus={() => setLastEdited({ row: index, field: 'price' })}
            placeholder="0"
            placeholderTextColor={COLORS.placeholder}
            keyboardType="numeric"
          />
        </View>

        {/* advance */}
        <View style={[styles.tdCell, { flex: COL.adv }]}>
          <TextInput
            style={[styles.tableInput, { color: COLORS.text, textAlign: 'center' }]}
            value={item.content}
            onChangeText={(t) => setRowField(index, 'content', t)}
            onFocus={() => setLastEdited({ row: index, field: 'content' })}
            placeholder="0"
            placeholderTextColor={COLORS.placeholder}
            keyboardType="numeric"
          />
        </View>

        {/* date */}
        <View style={[styles.tdCell, { flex: COL.date }]}>
          <Tap
            onPress={() => openCalendarForRow(index)}
            style={[
              styles.dateCellBtn,
              { backgroundColor: COLORS.inputBg, borderColor: COLORS.border },
            ]}
          >
            <Text style={{ color: item.date ? COLORS.text : COLORS.placeholder, fontWeight: '800' }}>
              {item.date || 'בחר תאריך'}
            </Text>
            <Icon name="calendar" size={14} color={COLORS.sub} />
          </Tap>
        </View>

        {/* name */}
        <View style={[styles.tdCell, { flex: COL.name }]}>
          <TextInput
            style={[styles.tableInput, { color: COLORS.text, textAlign: 'right', paddingRight: 10 }]}
            value={item.name}
            onChangeText={(t) => setRowField(index, 'name', t)}
            placeholder="שם הוצאה"
            placeholderTextColor={COLORS.placeholder}
          />
        </View>
      </View>
    );
  };

  const pieData = rows
    .map((r, i) => ({
      name: r.name || `פריט ${i + 1}`,
      amount: +String(r.price).replace(/[^0-9.-]/g, '') || 0,
      color: `hsl(${(i * 45) % 360}, 70%, 60%)`,
      legendFontColor: COLORS.sub,
      legendFontSize: 12,
    }))
    .filter((d) => d.amount > 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header like Management */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={COLORS.card}
        translucent={false}
      />

      <View
        style={[
          styles.header,
          {
            backgroundColor: COLORS.card,
            paddingTop: headerTopPadding,
            borderBottomColor: COLORS.primary,
            shadowColor: COLORS.primary,
          },
        ]}
      >
        <View style={styles.headerTop}>
          {/* left (fixed width) */}
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.iconBtn, { backgroundColor: COLORS.bg }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.iconBtnText, { color: COLORS.text }]}>חזור ←</Text>
            </TouchableOpacity>
          </View>

          {/* title centered */}
          <Text style={[styles.headerTitle, { color: COLORS.text }]} numberOfLines={1}>
            ניהול תקציב
          </Text>

          {/* right placeholder (same width) */}
          <View style={styles.headerSide} />
        </View>

        {/* Mini subtitle row (optional, like your style) */}
        <View style={{ alignItems: 'center', marginTop: 2 }}>
          <Text style={{ color: COLORS.sub, fontWeight: '800', fontSize: 12 }}>
            {totalCheckedCount} נבחרו • ₪{totalCheckedSum.toLocaleString()}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Stats */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
            {[
              { label: 'עלות נבחרת', value: totalCheckedSum },
              { label: 'מקדמות', value: totalAdvance },
              { label: 'יתרה לתשלום', value: totalRemain },
              { label: 'פריטים', value: rows.length },
            ].map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: COLORS.sub }]}>{stat.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <View style={styles.leftActions}>
              <Tap onPress={addRow} style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                <Icon name="plus" size={16} color="#fff" />
              </Tap>
              <Tap onPress={removeLastRow} style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}>
                <Icon name="minus" size={16} color="#fff" />
              </Tap>
              <Tap
                onPress={() => setCalcVisible(true)}
                style={[styles.actionBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }]}
              >
                <Icon name="calculator" size={16} color={COLORS.text} />
              </Tap>
            </View>

            <View style={styles.rightActions}>
              <Tap onPress={() => exportData('xlsx')} style={[styles.textBtn, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.textBtnTxt, { color: COLORS.text }]}>ייצוא</Text>
              </Tap>
              <Tap onPress={() => saveRows(false)} style={[styles.textBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                <Text style={[styles.textBtnTxt, { color: '#fff' }]}>שמור</Text>
              </Tap>
            </View>
          </View>

          {/* Desktop Headers — FIXED alignment */}
          {!isMobile && (
            <View style={[styles.tableHeader, { backgroundColor: COLORS.primary }]}>
              <View style={[styles.thCell, { flex: COL.check }]}>
                <Text style={[styles.thTxt, { color: '#fff' }]}>✓</Text>
              </View>
              <View style={[styles.thCell, { flex: COL.price }]}>
                <Text style={[styles.thTxt, { color: '#fff' }]}>מחיר</Text>
              </View>
              <View style={[styles.thCell, { flex: COL.adv }]}>
                <Text style={[styles.thTxt, { color: '#fff' }]}>מקדמה</Text>
              </View>
              <View style={[styles.thCell, { flex: COL.date }]}>
                <Text style={[styles.thTxt, { color: '#fff' }]}>תאריך</Text>
              </View>
              <View style={[styles.thCell, { flex: COL.name, alignItems: 'flex-end' }]}>
                <Text style={[styles.thTxt, { color: '#fff', textAlign: 'right', paddingRight: 10 }]}>שם ההוצאה</Text>
              </View>
            </View>
          )}

          {/* Rows */}
<View style={{ paddingHorizontal: isMobile ? 12 : 0 }}>
  {rows.map((item, index) => (
    <View key={index}>{renderItem({ item, index })}</View>
  ))}
</View>


          {/* Pie Chart */}
          {pieData.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              <Text style={[styles.chartTitle, { color: COLORS.text }]}>התפלגות הוצאות</Text>
              <PieChart
                data={pieData}
                width={screenW - 40}
                height={220}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Calculator Modal */}
      <Modal visible={calcVisible} transparent animationType="fade" onRequestClose={() => setCalcVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.calcContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <View style={styles.calcDisplay}>
              <TextInput
                style={[styles.calcDisplayText, { color: COLORS.text }]}
                value={calcInput}
                editable={false}
                placeholder="0"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.calcGrid}>
              {['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '^', '='].map((btn) => (
                <Tap
                  key={btn}
                  onPress={() => {
                    if (btn === 'C') setCalcInput('');
                    else if (btn === '=') {
                      try {
                        setCalcInput(String(safeCalc(calcInput)));
                      } catch {
                        Alert.alert('שגיאה');
                      }
                    } else setCalcInput((p) => p + btn);
                  }}
                  style={[
                    styles.calcBtn,
                    { backgroundColor: COLORS.inputBg },
                    btn === '=' && { backgroundColor: COLORS.success },
                    btn === 'C' && { backgroundColor: COLORS.danger },
                  ]}
                >
                  <Text style={[styles.calcBtnTxt, { color: ['=', 'C'].includes(btn) ? '#fff' : COLORS.text }]}>{btn}</Text>
                </Tap>
              ))}
            </View>

            <View style={styles.calcActions}>
              <Tap onPress={() => setCalcVisible(false)} style={[styles.calcActionBtn, { backgroundColor: COLORS.sub }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>סגור</Text>
              </Tap>
              <Tap
                onPress={() => {
                  if (lastEdited.row !== null) {
                    setRowField(lastEdited.row, lastEdited.field, calcInput);
                    setCalcVisible(false);
                  }
                }}
                style={[styles.calcActionBtn, { backgroundColor: COLORS.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>הכנס לטבלה</Text>
              </Tap>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <CalendarModal
        visible={calVisible}
        onClose={() => {
          setCalVisible(false);
          setCalRowIndex(null);
        }}
        onSelect={applySelectedDate}
        initialDate={currentRowDateObj}
        COLORS={COLORS}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 10,
    marginTop: 4,
  },
  headerSide: {
    width: 96,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, minWidth: 40, alignItems: 'center' },
  iconBtnText: { fontSize: 13, fontWeight: '700' },

  // ===== Stats =====
  statsContainer: { paddingHorizontal: 12, paddingVertical: 15, gap: 10 },
  statCard: {
    minWidth: 120,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },

  // ===== Actions =====
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 5,
  },
  leftActions: { flexDirection: 'row', gap: 10 },
  rightActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBtnTxt: { fontWeight: '700', fontSize: 14 },

  // ===== Mobile Card =====
  cardMobile: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  inputTitle: { fontSize: 16, fontWeight: '700', flex: 1, padding: 0 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  cardRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1 },
  label: { fontSize: 11, marginBottom: 4, textAlign: 'center', fontWeight: '600' },
  inputSmall: { height: 40, borderRadius: 10, borderWidth: 1, fontSize: 14, paddingHorizontal: 10 },

  // ===== Desktop Table (FIXED alignment) =====
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 0,
  },
  thCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  thTxt: {
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  tdCell: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  checkboxTable: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  tableInput: {
    height: 36,
    paddingHorizontal: 6,
    fontSize: 14,
    borderRadius: 10,
  },
  dateCellBtn: {
    height: 36,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ===== Chart =====
  chartCard: { margin: 20, padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  chartTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10, alignSelf: 'flex-start' },

  // ===== Modals (shared) =====
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },

  // ===== Calculator =====
  calcContainer: { width: '100%', maxWidth: 360, borderRadius: 24, padding: 20, borderWidth: 1 },
  calcDisplay: { marginBottom: 20, padding: 15, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12 },
  calcDisplayText: { fontSize: 32, textAlign: 'right', fontWeight: '700' },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  calcBtn: { width: 65, height: 65, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  calcBtnTxt: { fontSize: 22, fontWeight: '600' },
  calcActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  calcActionBtn: { flex: 0.48, padding: 15, borderRadius: 12, alignItems: 'center' },

  // ===== Calendar =====
  calContainer: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 16, borderWidth: 1 },
  calTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  calNavBtn: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calNavTxt: { fontWeight: '900', fontSize: 12 },
  calTitle: { fontSize: 16, fontWeight: '900' },

  calWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 6 },
  calWeekTxt: { width: 44, textAlign: 'center', fontWeight: '800' },

  calRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calCell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellTxt: { fontWeight: '900', fontSize: 14 },

  calActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  calActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
});

export default Budget;
