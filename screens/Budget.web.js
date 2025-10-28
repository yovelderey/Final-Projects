// Budget.js — White base + full-screen background image (absolute), dark-mode, responsive table,
// safe calculator, XLSX/CSV export, purple buttons (delete red), top buttons aligned on all sizes.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Platform,
  useWindowDimensions,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
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

// ---- Web-safe pressable wrapper (avoids <button> inside <button> on web)
const Tap = ({ onPress, onLongPress, children, style, ...rest }) => {
  if (Platform.OS === 'web') {
    return (
      <View
        role="button"
        tabIndex={0}
        onClick={onPress}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault?.();
            onPress?.(e);
          }
        }}
        onContextMenu={(e) => {
          if (onLongPress) { e.preventDefault?.(); onLongPress(); }
        }}
        style={style}
        {...rest}
      >
        {children}
      </View>
    );
  }
  const { TouchableOpacity } = require('react-native');
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} style={style} {...rest}>
      {children}
    </TouchableOpacity>
  );
};

// ---- Safe calculator (no eval)
const tokenize = (s) => {
  const tokens = []; let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue;
    }
    if ('+-*/%^()'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    throw new Error('תווים לא נתמכים');
  }
  return tokens;
};
const prec = { '^': 4, '*': 3, '/': 3, '%': 3, '+': 2, '-': 2 };
const rightAssoc = { '^': true };
const toRPN = (tokens) => {
  const out = [], st = [];
  for (const t of tokens) {
    if (t.t === 'num') out.push(t);
    else if (t.v === '(') st.push(t);
    else if (t.v === ')') {
      while (st.length && st[st.length - 1].v !== '(') out.push(st.pop());
      if (!st.length) throw new Error('סוגריים לא תואמים');
      st.pop();
    } else {
      while (st.length && st[st.length - 1].v !== '(' &&
        (prec[st[st.length - 1].v] > prec[t.v] ||
         (prec[st[st.length - 1].v] === prec[t.v] && !rightAssoc[t.v]))) {
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
      const b = st.pop(); const a = st.pop();
      if (a === undefined || b === undefined) throw new Error('ביטוי לא חוקי');
      let r = 0;
      switch (t.v) {
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        case '*': r = a * b; break;
        case '/': r = b === 0 ? NaN : a / b; break;
        case '%': r = a % b; break;
        case '^': r = Math.pow(a, b); break;
      }
      st.push(r);
    }
  }
  if (st.length !== 1) throw new Error('ביטוי לא חוקי');
  return st[0];
};
const safeCalc = (expr) => {
  const rpn = toRPN(tokenize(String(expr)));
  const res = evalRPN(rpn);
  if (!isFinite(res)) throw new Error('תוצאה לא תקינה');
  return res;
};

const Budget = (props) => {
  const id = props.route.params.id;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: screenW } = useWindowDimensions();

  // ===== Pull theme from previous screen (AsyncStorage 'themeMode')
  const systemScheme = useColorScheme(); // 'light' | 'dark'
  const [themeMode, setThemeMode] = useState('auto'); // 'auto' | 'light' | 'dark'
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('themeMode');
        if (saved === 'auto' || saved === 'light' || saved === 'dark') setThemeMode(saved);
      } catch {}
    })();
  }, []);
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark');

  const COLORS = useMemo(() => {
    const primary = '#6c63ff';
    const danger = '#EF4444';
    if (isDark) {
      return {
        bg: '#0e1113',
        card: '#14181b',
        text: '#e8ebf0',
        sub: '#b8c0cc',
        border: '#2a2f35',
        primary, onPrimary: '#fff', danger,
        inputBg: '#1b2024',
        placeholder: '#94a3b8',
        chartBg: '#14181b',
      };
    }
    return {
      bg: '#f7f8fb',              // נצבע רק אם דרק מוד לא פעיל — שכבת בסיס תהיה לבנה חדה
      card: '#ffffff',
      text: '#1f2937',
      sub: '#556070',
      border: '#e5e7eb',
      primary, onPrimary: '#fff', danger,
      inputBg: '#f3f4f6',
      placeholder: '#94a3b8',
      chartBg: '#ffffff',
    };
  }, [isDark]);

  // ===== Data =====
  const database = getDatabase();
  const user = firebase.auth().currentUser;

  // rows: {checked, price, content(advance), date, name}
  const [rows, setRows] = useState([{ checked: false, price: '', content: '', date: '', name: '' }]);
  const [eventDetails, setEventDetails] = useState({});
  const [msgVisible, setMsgVisible] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const memRef = useRef(0);
  const [lastEdited, setLastEdited] = useState({ row: null, field: null });

  // totals
  const [totalCheckedSum, setTotalCheckedSum] = useState(0);
  const [totalCheckedCount, setTotalCheckedCount] = useState(0);
  const [totalAdvance, setTotalAdvance] = useState(0);
  const [totalRemain, setTotalRemain] = useState(0);

  const alertMsg = (t, m) => { setMsgTitle(t); setMsgBody(m); setMsgVisible(true); };

  // fetch
  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const itemsRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
        const snap = await get(itemsRef);
        if (snap.exists()) {
          const data = snap.val();
          const arr = Array.isArray(data) ? data : Object.values(data || {});
          const norm = arr.map(it => ({
            checked: !!it.checked,
            price: String(it.price ?? ''),
            content: String(it.content ?? ''),
            date: String(it.date ?? ''),
            name: String(it.name ?? ''),
          }));
          setRows(norm.length ? norm : [{ checked: false, price: '', content: '', date: '', name: '' }]);
        }
      } catch {}
      try {
        const refEv = ref(database, `Events/${user.uid}/${id}/`);
        const s2 = await get(refEv);
        if (s2.exists()) setEventDetails(s2.val() || {});
      } catch {}
    };
    fetch();
  }, [user, id, database]);

  // recalc + mirror spend
  useEffect(() => {
    let sum = 0, cnt = 0, adv = 0;
    rows.forEach(r => {
      const price = +String(r.price).replace(/[^0-9.-]/g, '') || 0;
      const a = +String(r.content).replace(/[^0-9.-]/g, '') || 0;
      if (r.checked) { sum += price; adv += a; cnt += 1; }
    });
    setTotalCheckedSum(sum);
    setTotalCheckedCount(cnt);
    setTotalAdvance(adv);
    setTotalRemain(Math.max(sum - adv, 0));
    if (user) set(ref(getDatabase(), `Events/${user.uid}/${id}/spend`), sum).catch(() => {});
  }, [rows, user, id]);

  // helpers
  const saveRows = async (data = rows) => {
    if (!user) return;
    const itemsRef = ref(database, `Events/${user.uid}/${id}/budgetItems`);
    const payload = data.map(r => ({
      checked: !!r.checked,
      price: String(r.price ?? ''),
      content: String(r.content ?? ''),
      date: String(r.date ?? ''),
      name: String(r.name ?? ''),
    }));
    await set(itemsRef, payload);
    alertMsg('נשמר', 'הנתונים נשמרו בהצלחה.');
  };

  const addRow = () => setRows(prev => [...prev, { checked: false, price: '', content: '', date: '', name: '' }]);
  const removeLastRow = () => setRows(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  const setRowField = (idx, field, value) => setRows(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  const toggleRow = (idx) => setRows(prev => { const n = [...prev]; n[idx] = { ...n[idx], checked: !n[idx].checked }; return n; });

  // ===== Export (XLSX + CSV) =====
  const buildSheet = () => {
    const data = [
      ['✓','Price','Advance','Date','Expense'],
      ...rows.map(r => [r.checked ? 'V' : '', r.price, r.content, r.date, r.name]),
      [],
      ['Summary (checked only)'],
      ['Total Price', totalCheckedSum],
      ['Total Advance', totalAdvance],
      ['Remain', totalRemain],
    ];
    const ws = utils.aoa_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Budget');
    return { wb, ws };
  };

  const exportToExcel = async () => {
    try {
      const { wb } = buildSheet();
      const filename = `Budget_${Date.now()}.xlsx`;

      if (Platform.OS === 'web') {
        writeFileXLSX(wb, filename); // triggers browser download
        alertMsg('הורדנו את הקובץ', 'נוצר קובץ אקסל בדפדפן.');
        return;
      }

      // Native
      const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filePath = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(filePath, b64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else {
        alertMsg('נשמר', 'הקובץ נשמר לתיקיית המסמכים של האפליקציה.');
      }
    } catch (e) {
      alertMsg('שגיאה בייצוא', e?.message || 'נכשל ליצור קובץ אקסל');
    }
  };

  const exportToCSV = async () => {
    try {
      const { ws } = buildSheet();
      const csv = utils.sheet_to_csv(ws);
      const filename = `Budget_${Date.now()}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        alertMsg('הורדנו את הקובץ', 'נוצר קובץ CSV בדפדפן.');
        return;
      }

      const filePath = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, { mimeType: 'text/csv' });
      } else {
        alertMsg('נשמר', 'קובץ CSV נשמר לתיקיית המסמכים.');
      }
    } catch (e) {
      alertMsg('שגיאה בייצוא CSV', e?.message || 'נכשל ליצור קובץ');
    }
  };

  // ===== Layout / Responsive =====
  const isTablet = screenW >= 600;
  const isDesktop = screenW >= 992;
  const CARD_W = Math.min(screenW * 0.96, isDesktop ? 1000 : isTablet ? 860 : screenW * 0.96);

  // עמודות מינימליות למובייל — גלילה אופקית
  const COLW = { check: 40, price: 120, advance: 120, date: 140, name: 200 };
  const TABLE_MIN_W = COLW.check + COLW.price + COLW.advance + COLW.date + COLW.name + 16;

  const colorsForPie = [
    "#FF6347","#FF4500","#FFD700","#ADFF2F","#32CD32","#1E90FF","#8A2BE2","#FF1493","#FF69B4",
    "#B0C4DE","#00FA9A","#FF8C00","#D2691E","#4B0082","#F08080","#00CED1","#8B0000","#800080","#D3D3D3","#C71585",
  ];
  const pieData = rows.map((r, i) => ({
    name: r.name || `פריט ${i + 1}`,
    amount: +String(r.price).replace(/[^0-9.-]/g, '') || 0,
    color: colorsForPie[i % colorsForPie.length],
    legendFontColor: COLORS.sub,
    legendFontSize: 12,
  })).filter(d => d.amount > 0);

  const HeaderRow = ({ mobile }) => (
    <View style={[styles.row, { borderColor: COLORS.border, paddingVertical: 8 }]}>
      <Text style={[styles.th, { width: mobile ? COLW.check : 34, color: COLORS.sub, textAlign: 'center' }]}>✓</Text>
      <Text style={[styles.th, { width: mobile ? COLW.price : undefined, flex: mobile ? undefined : 1.1, color: COLORS.sub, textAlign: 'center' }]}>מחיר</Text>
      <Text style={[styles.th, { width: mobile ? COLW.advance : undefined, flex: mobile ? undefined : 1.1, color: COLORS.sub, textAlign: 'center' }]}>מקדמה</Text>
      <Text style={[styles.th, { width: mobile ? COLW.date : undefined, flex: mobile ? undefined : 1.2, color: COLORS.sub, textAlign: 'center' }]}>תאריך</Text>
      <Text style={[styles.th, { width: mobile ? COLW.name : undefined, flex: mobile ? undefined : 1.6, color: COLORS.sub, textAlign: 'center' }]}>שם הוצאה</Text>
    </View>
  );

  const renderRow = ({ item, index }) => {
    const box = { backgroundColor: COLORS.inputBg, color: COLORS.text, borderColor: COLORS.border, height: 42 };
    const mobile = screenW < 600;

    return (
      <View style={[styles.row, { borderColor: COLORS.border }]}>
        <Tap onPress={() => toggleRow(index)} style={[styles.checkbox, { borderColor: COLORS.text, width: mobile ? COLW.check : 30 }]}>
          <Text style={{ color: COLORS.text, fontWeight: '700' }}>{item.checked ? '✓' : ''}</Text>
        </Tap>

        <TextInput
          style={[
            styles.cell, box, mobile ? { width: COLW.price } : { flex: 1.1 }
          ]}
          value={String(item.price)}
          onChangeText={(tx) => setRowField(index, 'price', tx.replace(/[^0-9.\-]/g, ''))}
          onFocus={() => setLastEdited({ row: index, field: 'price' })}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.placeholder}
          textAlign="center"
        />
        <TextInput
          style={[
            styles.cell, box, mobile ? { width: COLW.advance } : { flex: 1.1 }
          ]}
          value={String(item.content)}
          onChangeText={(tx) => setRowField(index, 'content', tx.replace(/[^0-9.\-]/g, ''))}
          onFocus={() => setLastEdited({ row: index, field: 'content' })}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={COLORS.placeholder}
          textAlign="center"
        />
        <TextInput
          style={[
            styles.cell, box, mobile ? { width: COLW.date } : { flex: 1.2 }
          ]}
          value={item.date}
          onChangeText={(tx) => setRowField(index, 'date', tx)}
          onFocus={() => setLastEdited({ row: index, field: 'date' })}
          placeholder="תאריך"
          placeholderTextColor={COLORS.placeholder}
          textAlign="center"
        />
        <TextInput
          style={[
            styles.cell, box, mobile ? { width: COLW.name } : { flex: 1.6 }
          ]}
          value={item.name}
          onChangeText={(tx) => setRowField(index, 'name', tx)}
          onFocus={() => setLastEdited({ row: index, field: 'name' })}
          placeholder="שם ההוצאה"
          placeholderTextColor={COLORS.placeholder}
          textAlign="center"
        />
      </View>
    );
  };

  // compact actions layout for tiny screens
  const compact = screenW < 520;

  return (
    <View style={[styles.pageBase, { backgroundColor: isDark ? COLORS.bg : '#fff' }]}>
      {/* Full-screen background image that sits behind everything */}
      <ImageBackground
        source={require('../assets/backgruond_pro.png')}
        style={styles.bgAbsolute}
        imageStyle={styles.bgImage}
        resizeMode="cover"
        pointerEvents="none"
      />

      <StatusBar backgroundColor={COLORS.primary} barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
        <View style={{ position: 'absolute', left: 16, bottom: 14 }}>
          <Tap onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </Tap>
        </View>
        <Text style={[styles.title, { color: COLORS.onPrimary }]}>ניהול תקציב</Text>
      </View>

      {/* Actions */}
      <View style={[styles.actionsRow, { width: CARD_W }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tap onPress={() => setCalcVisible(true)} style={[styles.iconBtn, { backgroundColor: COLORS.primary }]}>
            <Icon name="calculator" size={18} color={COLORS.onPrimary} />
            <Text style={[styles.iconBtnText, { color: COLORS.onPrimary }]}> מחשבון </Text>
          </Tap>
          <Tap onPress={addRow} style={[styles.circleBtn, { backgroundColor: COLORS.primary }]}><Text style={styles.circleBtnTxt}>+</Text></Tap>
          <Tap onPress={removeLastRow} style={[styles.circleBtn, { backgroundColor: COLORS.primary }]}><Text style={styles.circleBtnTxt}>−</Text></Tap>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tap onPress={() => saveRows()} style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}>
            <Text style={[styles.primaryBtnText, { color: COLORS.onPrimary }]}>שמור</Text>
          </Tap>

          {/* ייצוא: לחיצה רגילה = XLSX, לחיצה ארוכה = CSV */}
          <Tap
            onPress={exportToExcel}
            onLongPress={exportToCSV}
            style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}
          >
            <Text style={[styles.primaryBtnText, { color: COLORS.onPrimary }]}>ייצוא</Text>
          </Tap>

          <Tap
            onPress={async () => {
              try {
                if (!user) return;
                await remove(ref(database, `Events/${user.uid}/${id}/budgetItems`));
                setRows([{ checked: false, price: '', content: '', date: '', name: '' }]);
                alertMsg('נמחק', 'כל פריטי התקציב נמחקו');
              } catch (e) { alertMsg('שגיאה', e.message); }
            }}
            style={[styles.primaryBtn, { backgroundColor: COLORS.danger }]}
          >
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>מחק פריטים</Text>
          </Tap>
        </View>
      </View>

      {/* Table Card */}
      <View style={[styles.card, { width: CARD_W, backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
        {/* גלילה אופקית במובייל כדי לא לחתוך עמודות */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ width: screenW < 600 ? TABLE_MIN_W : '100%' }}
        >
          <View style={{ flex: 1 }}>
            <HeaderRow mobile={screenW < 600} />
            <FlatList
              data={rows}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderRow}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={[styles.statsWrap, { width: CARD_W }]}>
        {[
          { label: 'מספר עסקאות נבחרות', value: totalCheckedCount },
          { label: 'סך הכל עלות (נבחרים)', value: totalCheckedSum.toLocaleString('he-IL') + ' ₪' },
          { label: 'סך מקדמות', value: totalAdvance.toLocaleString('he-IL') + ' ₪' },
          { label: 'יתרה לתשלום', value: totalRemain.toLocaleString('he-IL') + ' ₪' },
          { label: 'ממוצע למוזמן', value: Math.round(totalCheckedSum / Math.max(eventDetails.counter_contacts || 0, 1)).toLocaleString('he-IL') + ' ₪' },
          { label: 'מספר פריטים', value: rows.length },
        ].map((b, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.statLabel, { color: COLORS.sub }]}>{b.label}</Text>
            <Text style={[styles.statValue, { color: COLORS.text }]}>{b.value}</Text>
          </View>
        ))}
      </View>

      {/* Pie */}
      {!!pieData.length && (
        <View style={[styles.card, { width: CARD_W, backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
          <Text style={[styles.chartTitle, { color: COLORS.text }]}>התפלגות הוצאות</Text>
          <PieChart
            data={pieData}
            width={Math.min(CARD_W, screenW) - (screenW < 600 ? 16 : 24)}
            height={screenW < 600 ? 180 : 220}
            chartConfig={{
              backgroundColor: COLORS.chartBg,
              backgroundGradientFrom: COLORS.chartBg,
              backgroundGradientTo: COLORS.chartBg,
              color: (opacity = 1) => `rgba(0,0,0,${isDark ? 0.8 : 0.6})`,
              labelColor: () => COLORS.text,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft={screenW < 600 ? '8' : '16'}
            hasLegend
            center={[0, 0]}
            absolute
          />
        </View>
      )}

      {/* Calculator */}
      <Modal visible={calcVisible} animationType="slide" transparent onRequestClose={() => setCalcVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.calcCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <TextInput
              style={[styles.calcInput, { backgroundColor: COLORS.inputBg, color: COLORS.text }]}
              value={calcInput}
              editable={false}
              placeholder="0"
              placeholderTextColor={COLORS.placeholder}
            />
            <View style={styles.calcGrid}>
              {['7','8','9','/','MC','4','5','6','*','MR','1','2','3','-','M+','0','.','%','+','M-','(',')','^','C','='].map((v, idx) => (
                <Tap
                  key={idx}
                  onPress={() => {
                    if (v === 'C') { setCalcInput(''); return; }
                    if (v === '=') {
                      try { setCalcInput(String(safeCalc(calcInput))); } catch { alertMsg('שגיאת מחשבון','ביטוי לא חוקי'); }
                      return;
                    }
                    if (v === 'MC') { memRef.current = 0; return; }
                    if (v === 'MR') { setCalcInput(p => p + String(memRef.current)); return; }
                    if (v === 'M+') { try { memRef.current += safeCalc(calcInput || '0'); setCalcInput(''); } catch {} return; }
                    if (v === 'M-') { try { memRef.current -= safeCalc(calcInput || '0'); setCalcInput(''); } catch {} return; }
                    setCalcInput(p => p + v);
                  }}
                  style={[
                    styles.calcBtn,
                    { backgroundColor: COLORS.primary },
                    v === 'C' && { backgroundColor: COLORS.danger },
                    v === '=' && { backgroundColor: '#22c55e' },
                  ]}
                >
                  <Text style={styles.calcBtnText}>{v}</Text>
                </Tap>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Tap onPress={() => {
                try {
                  const val = String(safeCalc(calcInput || '0'));
                  if (lastEdited.row == null || lastEdited.field == null) {
                    setRows(prev => { const n = [...prev]; n[n.length - 1].price = val; return n; });
                  } else {
                    setRowField(lastEdited.row, lastEdited.field, val);
                  }
                  setCalcVisible(false);
                } catch { alertMsg('שגיאת מחשבון', 'לא ניתן להכניס תוצאה'); }
              }} style={[styles.primaryBtn, { backgroundColor: COLORS.primary, alignSelf: 'flex-start' }]}>
                <Text style={[styles.primaryBtnText, { color: COLORS.onPrimary }]}>הכנס לשדה האחרון</Text>
              </Tap>
              <Tap onPress={() => setCalcVisible(false)} style={[styles.primaryBtn, { backgroundColor: COLORS.danger }]}>
                <Text style={[styles.primaryBtnText, { color: '#fff' }]}>סגור</Text>
              </Tap>
            </View>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      <Modal visible={msgVisible} transparent animationType="fade" onRequestClose={() => setMsgVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.msgCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            <Text style={[styles.msgTitle, { color: COLORS.text }]}>{msgTitle}</Text>
            <Text style={[styles.msgBody, { color: COLORS.sub }]}>{msgBody}</Text>
            <Tap onPress={() => setMsgVisible(false)} style={[styles.primaryBtn, { backgroundColor: COLORS.primary, marginTop: 12 }]}>
              <Text style={[styles.primaryBtnText, { color: COLORS.onPrimary }]}>סגור</Text>
            </Tap>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Base + absolute background image
  pageBase: {
    flex: 1,
    position: 'relative',
  },
  bgAbsolute: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    opacity: 1, // אפשר לרכך: 0.8/0.7 לפי טעם
  },

  headerBar: {
    width: '100%',
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
backBtn: {
  minWidth: 42,
  height: 42,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  transform: [{ translateY: 9 }], // מזיז קצת למטה
},
  backBtnText: { fontSize: 26, color: '#fff' },
  title: { fontSize: 20, fontWeight: '700' },

      actionsRow: { alignSelf: 'center', marginTop: 10, marginBottom: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, }
      , iconBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', }
      , iconBtnText: { fontSize: 14, fontWeight: '600' }, circleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }
      , circleBtnTxt: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 22 },

  circleBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  circleBtnTxt: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 22 },

  primaryBtn: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    minWidth: 104, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },

primaryBtn: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10 }, primaryBtnText: { fontSize: 14, fontWeight: '700' }, card: { alignSelf: 'center', marginTop: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 10, },

  // table
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  th: { fontSize: 12, fontWeight: '700' },
  cell: { marginHorizontal: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 8 },
  checkbox: { height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 4, borderWidth: StyleSheet.hairlineWidth },

  // stats
  statsWrap: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  statCard: { minWidth: 140, flexGrow: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  // calculator/modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  calcCard: { width: '96%', maxWidth: 480, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12, alignItems: 'center' },
  calcInput: { width: '100%', height: 64, borderRadius: 10, fontSize: 28, paddingHorizontal: 10, marginBottom: 10, textAlign: 'right' },
  calcGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  calcBtn: { width: '19%', marginVertical: 5, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // message modal
  msgCard: { width: '90%', maxWidth: 420, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, alignItems: 'center' },
  msgTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  msgBody: { fontSize: 14, textAlign: 'center' },
});

export default Budget;
