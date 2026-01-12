// Management.js (FULL) — vCard + Excel + Manual RTL + Table Name on cards + LEFT status bar color (keep default for none/new/pending)
// ✅ Shows table for each guest (from /tables mapping)
// ✅ Left color bar by RSVP status: yes=green, no=red, maybe=orange, none/unknown => keep default (gray)
// ✅ Keeps your existing UI/Theme/Filters + Gift from contacts/newPrice (+ optional blessing)

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
  PermissionsAndroid,
  StatusBar,
  Platform,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  useColorScheme,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';

import { ref, remove, set, onValue, update, push } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../firebase';

// ==== Theme Colors ====
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
  },
};

// ==== Utils ====
const normalizeTel = (s) => {
  if (!s) return '';
  let t = String(s).replace(/[^\d+]/g, '');
  t = t.replace(/(?!^)\+/g, '');
  return t;
};

const toLocalTime = (isoOrMs) => {
  if (!isoOrMs) return '';
  try {
    const d = new Date(isoOrMs);
    if (isNaN(d.getTime())) return String(isoOrMs);
    return d.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoOrMs);
  }
};

// vCard parser (supports FN/N and TEL pref/cell/mobile)
const parseVCardText = (text) => {
  if (!text) return [];

  const unfolded = String(text)
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '');

  const cards = unfolded
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((s) => 'BEGIN:VCARD' + s);

  const out = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    const nameMatch =
      card.match(/^FN(?:;[^:]+)?:([^\r\n]+)/mi) ||
      card.match(/^N(?:;[^:]+)?:([^\r\n]+)/mi);
    const name = nameMatch ? String(nameMatch[1]).trim() : '';

    const telMatches = [...card.matchAll(/^TEL(?:(;[^:]+))?:([^\r\n]+)/gmi)];
    if (telMatches.length === 0) {
      out.push({ id: i, name, phone: '' });
      continue;
    }

    const lines = telMatches.map((m) => ({ meta: m[1] || '', value: m[2] }));
    const chosen =
      lines.find((l) => /PREF/i.test(l.meta)) ||
      lines.find((l) => /CELL|MOBILE/i.test(l.meta)) ||
      lines[0];

    const phone = normalizeTel(chosen?.value || '');
    out.push({ id: i, name, phone });
  }

  return out;
};

const Management = (props) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const id = props.route.params.id;

  // Refs
  const phoneBodyRef = useRef(null);

  // ==== Theme Logic ====
  const systemScheme = useColorScheme();
  const [dbMode, setDbMode] = useState('light');

  const isDarkMode = useMemo(() => {
    if (dbMode === 'dark') return true;
    if (dbMode === 'light') return false;
    return systemScheme === 'dark';
  }, [dbMode, systemScheme]);

  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const headerTopPadding =
    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : insets.top;

  // Data State
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & Sort
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTable, setFilterTable] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const [responses, setResponses] = useState({});
  const [guestTableMap, setGuestTableMap] = useState({});

  // Modals
  const [manualVisible, setManualVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');

  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestPhone, setEditGuestPhone] = useState('');
  const [isSavingGuest, setIsSavingGuest] = useState(false);

  const [importOptionsVisible, setImportOptionsVisible] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  // vCard modal
  const [vcfModalVisible, setVcfModalVisible] = useState(false);
  const [vcfContacts, setVcfContacts] = useState([]);
  const [vcfSearch, setVcfSearch] = useState('');
  const [isLoadingVcf, setIsLoadingVcf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectedIdsRef = useRef(selectedIds);

  const setSelectedAndRef = (nextSet) => {
    selectedIdsRef.current = nextSet;
    setSelectedIds(nextSet);
  };

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState({ mode: 'one', contactId: null, name: '' });

  const [guideVisible, setGuideVisible] = useState(false);

  // Images
  const onepic = require('../assets/onepic.png');
  const twopic = require('../assets/twopic.png');
  const threepic = require('../assets/threepic.png');
  const fourpic = require('../assets/fourpic.png');

  // -----------------------------
  // Permissions (optional)
  // -----------------------------
  useEffect(() => {
    const req = async () => {
      if (Platform.OS === 'android') {
        try {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
        } catch {}
      }
    };
    req();
  }, []);

  // -----------------------------
  // Helpers (tables) — supports your structure: tables/<tableId> { numberTable: "שולחן 1", contacts/guests/.. }
  // -----------------------------
  const buildGuestTableMap = useCallback((tablesObj) => {
    const out = {};
    if (!tablesObj) return out;

    const addFromNode = (node, tableName) => {
      if (!node) return;

      if (Array.isArray(node)) {
        node.forEach((x) => {
          if (x && (typeof x === 'string' || typeof x === 'number')) out[String(x)] = tableName;
          else if (x && typeof x === 'object') {
            const gid = x.recordID || x.guestId || x.id;
            if (gid) out[String(gid)] = tableName;
          }
        });
        return;
      }

      if (typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => {
          if (k) out[String(k)] = tableName;
          if (v && typeof v === 'object') {
            const gid = v.recordID || v.guestId || v.id;
            if (gid) out[String(gid)] = tableName;
            if (v.guestId) out[String(v.guestId)] = tableName;
          }
        });
      }
    };

    Object.entries(tablesObj).forEach(([_, tVal], idx) => {
      if (!tVal) return;
      const tableName = String(
        tVal.numberTable || tVal.tableName || tVal.name || `שולחן ${idx + 1}`
      ).trim();

      [
        tVal.contacts,
        tVal.guests,
        tVal.users,
        tVal.assigned,
        tVal.members,
        tVal.people,
        tVal.guestIds,
        tVal.seats,
      ].forEach((node) => addFromNode(node, tableName));

      // Optional: if this node itself is per-guest record with recordID (not common, but safe)
      const gid = tVal.recordID || tVal.guestId || tVal.id;
      if (gid) out[String(gid)] = tableName;
    });

    return out;
  }, []);

  const getGuestTableName = useCallback(
    (contact) => {
      const gid = String(contact?.recordID || '');
      return guestTableMap?.[gid] || 'לא שובץ';
    },
    [guestTableMap]
  );

  // -----------------------------
  // Gift from contacts/<id>/newPrice (+ optional blessing fields)
  // -----------------------------
  const getGiftFromContact = (contact) => {
    if (!contact) return { amount: null, blessing: '' };

    const rawAmount =
      contact?.newPrice ??
      contact?.price ??
      contact?.giftAmount ??
      contact?.amount ??
      null;

    const amountNum =
      rawAmount === null || rawAmount === undefined
        ? null
        : Number(String(rawAmount).replace(/[^\d.]/g, ''));

    const amount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null;

    const blessing = String(
      contact?.blessing ??
        contact?.bracha ??
        contact?.greeting ??
        contact?.note ??
        contact?.newBlessing ??
        ''
    ).trim();

    return { amount, blessing };
  };

  // -----------------------------
  // Firebase subscriptions
  // -----------------------------
  useEffect(() => {
    let unsubAdmin = null,
      unsubLegacy = null,
      unsubContacts = null,
      unsubResponses = null,
      unsubTables = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubAdmin) unsubAdmin();
      if (unsubLegacy) unsubLegacy();
      if (unsubContacts) unsubContacts();
      if (unsubResponses) unsubResponses();
      if (unsubTables) unsubTables();

      if (!currentUser) {
        setUser(null);
        setContacts([]);
        return;
      }
      setUser(currentUser);

      const modeAdminRef = ref(database, `Events/${currentUser.uid}/${id}/__admin/ui/theme/mode`);
      const modeLegacyRef = ref(database, `Events/${currentUser.uid}/${id}/ui/theme/mode`);
      let hasAdminTheme = false;

      const applyMode = (raw) => {
        let mode = String(raw ?? 'auto').toLowerCase();
        if (raw === true) mode = 'dark';
        if (raw === false) mode = 'light';
        if (!['light', 'dark', 'auto'].includes(mode)) mode = 'auto';
        setDbMode(mode);
      };

      unsubAdmin = onValue(modeAdminRef, (snap) => {
        const v = snap.val();
        hasAdminTheme = v !== null && v !== undefined;
        if (hasAdminTheme) applyMode(v);
      });

      unsubLegacy = onValue(modeLegacyRef, (snap) => {
        if (!hasAdminTheme) applyMode(snap.val());
      });

      unsubContacts = onValue(ref(database, `Events/${currentUser.uid}/${id}/contacts`), (snapshot) => {
        const data = snapshot.val() || {};
        const arr = Object.entries(data).map(([key, val]) => ({
          ...(val || {}),
          recordID: val?.recordID || key,
        }));
        arr.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setContacts(arr);
      });

      unsubResponses = onValue(ref(database, `Events/${currentUser.uid}/${id}/responses`), (snap) =>
        setResponses(snap.val() || {})
      );

      unsubTables = onValue(ref(database, `Events/${currentUser.uid}/${id}/tables`), (snap) =>
        setGuestTableMap(buildGuestTableMap(snap.val() || {}))
      );
    });

    return () => {
      if (unsubAdmin) unsubAdmin();
      if (unsubLegacy) unsubLegacy();
      if (unsubContacts) unsubContacts();
      if (unsubResponses) unsubResponses();
      if (unsubTables) unsubTables();
      unsubAuth();
    };
  }, [id, buildGuestTableMap]);

  const toggleTheme = async () => {
    if (!user) return;
    let nextMode = 'light';
    if (dbMode === 'light') nextMode = 'dark';
    else if (dbMode === 'dark') nextMode = 'auto';
    else if (dbMode === 'auto') nextMode = 'light';

    setDbMode(nextMode);
    await set(ref(database, `Events/${user.uid}/${id}/ui/theme/mode`), nextMode);
  };

  // -----------------------------
  // Excel
  // -----------------------------
  const downloadExcelTemplate = async () => {
    try {
      const data = [
        { שם: 'דני דוגמה', טלפון: '0501234567' },
        { שם: 'רותי דוגמה', טלפון: '0527654321' },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'מוזמנים');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + 'template.xlsx';
        await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
        else Alert.alert('שגיאה', 'שיתוף לא נתמך במכשיר זה');
      }
    } catch (e) {
      Alert.alert('שגיאה', 'לא ניתן ליצור את הקובץ');
    }
  };

  const uploadExcelFile = async () => {
    try {
      if (!user) {
        Alert.alert('שגיאה', 'משתמש לא מחובר');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/octet-stream',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;
      const fileUri = result.assets?.[0]?.uri;
      if (!fileUri) return;

      let workbook;
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } else {
        const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        workbook = XLSX.read(b64, { type: 'base64' });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      const updatesObj = {};
      let successCount = 0;

      jsonData.forEach((row) => {
        const values = Object.values(row || {});
        const nameRaw = row['שם'] ?? row['Name'] ?? row['name'] ?? (values.length ? values[0] : '');
        const phoneRaw = row['טלפון'] ?? row['Phone'] ?? row['phone'] ?? (values.length > 1 ? values[1] : '');
        const name = String(nameRaw || '').trim();
        const phoneClean = normalizeTel(String(phoneRaw || '').trim());

        if (name && /^\+?\d{7,15}$/.test(phoneClean)) {
          const k = push(contactsRef).key;
          updatesObj[k] = { recordID: k, displayName: name, phoneNumbers: phoneClean, createdAt: Date.now() };
          successCount++;
        }
      });

      if (successCount > 0) await update(contactsRef, updatesObj);

      setSummaryText(`✅ ${successCount} מוזמנים הועלו בהצלחה.`);
      setSummaryVisible(true);
    } catch (error) {
      Alert.alert('שגיאה', 'קובץ לא תקין או בעיה בקריאה');
    }
  };

    const norm = (s) => String(s ?? '').trim().toLowerCase();

const getResponsesArray = useCallback(() => {
  return Object.entries(responses || {}).map(([key, val]) => ({
    _key: key,
    ...(val || {}),
  }));
}, [responses]);

const getGuestRsvpInfo = useCallback(
  (contact) => {
    if (!contact) return null;

    const cId = String(contact.recordID || '');
    const cName = norm(contact.displayName);
    const cPhone = normalizeTel(contact.phoneNumbers || '');

    const all = getResponsesArray();

    const matched = all.filter((r) => {
      const rId =
        String(r.guestId || r.recordID || r.contactId || r.recordId || '');
      const rName = norm(r.guestName || r.displayName || r.name);
      const rPhone = normalizeTel(r.phone || r.phoneNumbers || r.formattedContacts || '');

      // 1) match by id if exists
      if (cId && rId && cId === rId) return true;

      // 2) match by phone if exists in response
      if (cPhone && rPhone && cPhone === rPhone) return true;

      // 3) your current DB: match by guestName
      if (cName && rName && cName === rName) return true;

      return false;
    });

    if (!matched.length) return null;

    // pick latest by timestamp (fallback: keep newest by key order)
    const sorted = matched.sort((a, b) => {
      const ta = new Date(a.timestamp || 0).getTime() || 0;
      const tb = new Date(b.timestamp || 0).getTime() || 0;
      return tb - ta;
    });

    return sorted[0];
  },
  [getResponsesArray]
);

const getStatusKey = useCallback(
  (contact) => {
    const rsvp = getGuestRsvpInfo(contact);
    const raw = String(rsvp?.response || rsvp?.status || '').trim();

    if (/^(מגיע|כן|yes|coming)$/i.test(raw)) return 'yes';
    if (/^(לא|no)$/i.test(raw)) return 'no';
    if (/^(אולי|maybe)$/i.test(raw)) return 'maybe';

    // pending/new/none => keep default
    return 'none';
  },
  [getGuestRsvpInfo]
);


  // ✅ LEFT BAR COLOR:
  // yes/no/maybe -> green/red/orange
  // none -> keep "existing" neutral gray (based on mode)
  const leftBarColor = useCallback(
    (statusKey) => {
      if (statusKey === 'yes') return '#22C55E';
      if (statusKey === 'no') return '#EF4444';
      if (statusKey === 'maybe') return '#F59E0B';
      // keep default for pending/new/unknown
      return isDarkMode ? '#334155' : '#E2E8F0';
    },
    [isDarkMode]
  );

  // -----------------------------
  // Filtered list
  // -----------------------------
  const filteredContacts = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();

    let res = (contacts || []).filter((c) => {
      const n = (c.displayName || '').toLowerCase();
      const p = String(c.phoneNumbers || '');
      const t = getGuestTableName(c);
      return n.includes(q) || p.includes(q) || (t || '').toLowerCase().includes(q);
    });

    if (filterStatus !== 'all') res = res.filter((c) => getStatusKey(c) === filterStatus);
    if (filterTable === 'no_table') res = res.filter((c) => getGuestTableName(c) === 'לא שובץ');

    res.sort((a, b) => {
      if (sortBy === 'name') return (a.displayName || '').localeCompare(b.displayName || '');
      if (sortBy === 'table') {
        const tA = getGuestTableName(a);
        const tB = getGuestTableName(b);
        if (tA === 'לא שובץ' && tB !== 'לא שובץ') return 1;
        if (tA !== 'לא שובץ' && tB === 'לא שובץ') return -1;
        return tA.localeCompare(tB);
      }
      return 0;
    });

    return res;
  }, [contacts, searchQuery, filterStatus, filterTable, sortBy, getGuestTableName, getStatusKey]);

  // -----------------------------
  // CRUD
  // -----------------------------
  const addManualContact = async () => {
    if (!user) return;

    if (!newContactName.trim() || !selectedPrefix.trim() || !newContactPhone.trim()) {
      Alert.alert('שגיאה', 'נא למלא שם + קידומת + טלפון');
      return;
    }

    const fullPhone = normalizeTel(`${selectedPrefix}${newContactPhone}`);
    if (!/^\+?\d{7,15}$/.test(fullPhone)) {
      Alert.alert('שגיאה', 'מספר טלפון לא תקין');
      return;
    }

    const newKey = push(ref(database, `Events/${user.uid}/${id}/contacts`)).key;
    await set(ref(database, `Events/${user.uid}/${id}/contacts/${newKey}`), {
      recordID: newKey,
      displayName: newContactName.trim(),
      phoneNumbers: fullPhone,
      createdAt: Date.now(),
    });

    setManualVisible(false);
    setNewContactName('');
    setNewContactPhone('');
    setSelectedPrefix('');
  };

  const deleteContact = async (rid) => {
    if (!user) return;
    await remove(ref(database, `Events/${user.uid}/${id}/contacts/${rid}`));
  };

  const deleteAll = async () => {
    if (!user) return;
    await remove(ref(database, `Events/${user.uid}/${id}/contacts`));
  };

  const confirmDeleteContact = (c) => {
    setConfirmPayload({ mode: 'one', contactId: c.recordID, name: c.displayName });
    setConfirmVisible(true);
  };

  const runConfirmedDelete = async () => {
    setConfirmVisible(false);
    if (confirmPayload.mode === 'all') await deleteAll();
    else if (confirmPayload.contactId) await deleteContact(confirmPayload.contactId);
  };

  // -----------------------------
  // Guest modal open/save
  // -----------------------------
  const selectedGuest = useMemo(() => {
    if (!selectedGuestId) return null;
    return (contacts || []).find((c) => String(c.recordID) === String(selectedGuestId)) || null;
  }, [selectedGuestId, contacts]);

  const openGuestModal = (contact) => {
    setSelectedGuestId(contact?.recordID || null);
    setEditGuestName(contact?.displayName || '');
    setEditGuestPhone(contact?.phoneNumbers || '');
    setGuestModalVisible(true);
  };

  const saveGuestEdits = async () => {
    if (!user || !selectedGuest?.recordID) return;

    const name = String(editGuestName || '').trim();
    if (!name) return Alert.alert('שגיאה', 'שם חובה');

    const phoneClean = normalizeTel(editGuestPhone || '');
    if (phoneClean && !/^\+?\d{7,15}$/.test(phoneClean)) {
      return Alert.alert('שגיאה', 'מספר טלפון לא תקין');
    }

    setIsSavingGuest(true);
    try {
      const updatesObj = {};
      updatesObj[`contacts/${selectedGuest.recordID}/displayName`] = name;
      updatesObj[`contacts/${selectedGuest.recordID}/phoneNumbers`] = phoneClean;
      updatesObj[`contacts/${selectedGuest.recordID}/updatedAt`] = Date.now();

      await update(ref(database, `Events/${user.uid}/${id}`), updatesObj);
      setGuestModalVisible(false);
    } catch (e) {
      Alert.alert('שגיאה', 'שמירה נכשלה');
    } finally {
      setIsSavingGuest(false);
    }
  };

  // -----------------------------
  // vCard modal logic
  // -----------------------------
  const openVcfModal = () => {
    setVcfContacts([]);
    setVcfSearch('');
    setSelectedAndRef(new Set());
    setVcfModalVisible(true);
  };

  const pickVcfFile = async () => {
    try {
      setIsLoadingVcf(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/vcard', 'text/x-vcard', 'text/plain', 'application/octet-stream', '.vcf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const fileUri = result.assets?.[0]?.uri;
      if (!fileUri) throw new Error('No file uri');

      let text = '';
      if (Platform.OS === 'web') {
        const res = await fetch(fileUri);
        text = await res.text();
      } else {
        text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      }

      const entries = parseVCardText(text).filter((e) => e.phone);
      setVcfContacts(entries);
      setSelectedAndRef(new Set());
    } catch (e) {
      console.error('pickVcfFile error:', e);
      Alert.alert('שגיאה', 'קריאת קובץ vCard נכשלה. ודא שהקובץ תקין.');
    } finally {
      setIsLoadingVcf(false);
    }
  };

  const toggleSelectVcf = (rowId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      selectedIdsRef.current = next;
      return next;
    });
  };

  const selectAllVcf = () => {
    const all = new Set((vcfContacts || []).map((c) => c.id));
    setSelectedAndRef(all);
  };

  const clearAllVcf = () => {
    setSelectedAndRef(new Set());
  };

  const filteredVcf = useMemo(() => {
    const q = (vcfSearch || '').toLowerCase();
    return (vcfContacts || []).filter((c) => {
      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
    });
  }, [vcfContacts, vcfSearch]);

  const importSelectedVcf = async () => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }

    const pickedIds = Array.from(selectedIdsRef.current || []);
    if (pickedIds.length === 0) {
      Alert.alert('שים לב', 'לא נבחרו אנשי קשר');
      return;
    }

    setIsImporting(true);
    try {
      const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      const updatesObj = {};
      let success = 0;

      const mapById = new Map((vcfContacts || []).map((c) => [c.id, c]));

      pickedIds.forEach((rid) => {
        const c = mapById.get(rid);
        if (!c?.phone) return;

        const phoneClean = normalizeTel(c.phone);
        if (!/^\+?\d{7,15}$/.test(phoneClean)) return;

        const k = push(contactsRef).key;
        updatesObj[k] = {
          recordID: k,
          displayName: (c.name || 'ללא שם').trim(),
          phoneNumbers: phoneClean,
          createdAt: Date.now(),
        };
        success++;
      });

      if (success > 0) await update(contactsRef, updatesObj);

      setSummaryText(`✅ יובאו ${success} אנשי קשר נבחרים.`);
      setSummaryVisible(true);

      setSelectedAndRef(new Set());
      setVcfModalVisible(false);
    } catch (e) {
      console.error('importSelectedVcf error:', e);
      Alert.alert('שגיאה', 'ייבוא נכשל, נסה שוב.');
    } finally {
      setIsImporting(false);
    }
  };

  // -----------------------------
  // UI helpers
  // -----------------------------
  const getThemeIcon = () => {
    if (dbMode === 'light') return '☀️';
    if (dbMode === 'dark') return '🌙';
    return '🤖';
  };

    const statusLabel = (key, raw) => {
  if (key === 'yes') return 'מגיע';
  if (key === 'no') return 'לא מגיע';
  if (key === 'maybe') return 'אולי';
  // אם אין תגובה/חדש/ממתין
  return raw ? String(raw) : 'ממתין';
};

  const getThemeText = () => {
    if (dbMode === 'light') return 'Light';
    if (dbMode === 'dark') return 'Dark';
    return 'Auto';
  };

const renderItem = ({ item }) => {
  const rsvp = getGuestRsvpInfo(item);
  const stKey = getStatusKey(item);

  const accent = leftBarColor(stKey);
  const stText = statusLabel(stKey, rsvp?.response || rsvp?.status);
  const stTime = rsvp?.timestamp ? toLocalTime(rsvp.timestamp) : '';

  const tableName = getGuestTableName(item);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: accent }]}>
      <TouchableOpacity
        style={styles.cardPressArea}
        onPress={() => openGuestModal(item)}
        activeOpacity={0.75}
      >
        {/* ✅ ימין: שם + טלפון */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={[styles.cardPhone, { color: theme.subText }]} numberOfLines={1}>
            {item.phoneNumbers}
          </Text>
        </View>

        {/* ✅ אמצע: סטטוס (לא מתחת!) */}
        <View style={styles.statusMidWrap}>
          <View
            style={[
              styles.statusPill,
              {
                borderColor: accent,
                backgroundColor: isDarkMode ? '#0B1220' : '#F8FAFC',
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: '900', fontSize: 12, textAlign: 'center' }}>
              {stText}{stTime ? ` · ${stTime}` : ''}
            </Text>
          </View>
        </View>

        {/* ✅ שמאל: שולחן */}
        <View style={styles.cardTable}>
          {tableName !== 'לא שובץ' && (
            <View
              style={[
                styles.tableBadge,
                {
                  borderColor: accent,
                  backgroundColor: isDarkMode ? '#111827' : '#F8FAFC',
                },
              ]}
            >
              <Text style={[styles.tableText, { color: theme.subText }]} numberOfLines={1}>
                {tableName}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDeleteContact(item)}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
};



  // Gift display for selected guest
  const selectedGift = useMemo(() => {
    if (!selectedGuest) return { amount: null, blessing: '' };
    return getGiftFromContact(selectedGuest);
  }, [selectedGuest]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg}
        translucent={false}
      />

      {/* Header */}
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
  {/* צד שמאל (רוחב קבוע) */}
  <View style={styles.headerSide}>
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={[styles.iconBtn, { backgroundColor: theme.bg }]}
    >
      <Text style={[styles.iconBtnText, { color: theme.text }]}>חזור ←</Text>
    </TouchableOpacity>
  </View>

  {/* כותרת תמיד באמצע */}
  <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
    ניהול מוזמנים
  </Text>

  {/* צד ימין (placeholder באותו רוחב בדיוק) */}
  <View style={styles.headerSide} />
</View>



        <View style={styles.searchRow}>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: showFilterBar ? theme.primary : theme.bg }]}
            onPress={() => setShowFilterBar(!showFilterBar)}
          >
            <Text style={[styles.filterIcon, { color: showFilterBar ? '#fff' : theme.text }]}>🌪️</Text>
          </TouchableOpacity>

          <View style={[styles.searchContainer, { backgroundColor: theme.bg }]}>
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.text,
                textAlign: 'right',
                writingDirection: 'rtl',   // חשוב בעיקר ב-iOS
              },
            ]}
            placeholder="חיפוש מוזמנים"
            placeholderTextColor={theme.subText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          </View>

          <View style={[styles.countBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.countText, { color: theme.primary }]}>{filteredContacts.length}</Text>
          </View>
        </View>

        {showFilterBar && (
          <View style={styles.filterPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              style={{ marginBottom: 8 }}
            >
              {['all', 'yes', 'maybe', 'no'].map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setFilterStatus(st)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                    filterStatus === st && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: theme.subText },
                      filterStatus === st && { color: '#FFF' },
                    ]}
                  >
                    {st === 'all' ? 'הכל' : st === 'yes' ? 'מגיעים' : st === 'no' ? 'לא' : 'אולי'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setSortBy(sortBy === 'name' ? 'table' : 'name')}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                  sortBy === 'table' && { borderColor: theme.primary },
                ]}
              >
                <Text style={[styles.filterChipText, { color: theme.text }]}>
                  {sortBy === 'name' ? 'מיין: לפי שם ⬇️' : 'מיין: לפי שולחן 🔃'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterTable(filterTable === 'all' ? 'no_table' : 'all')}
                style={[
                  styles.filterChip,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                  filterTable === 'no_table' && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: theme.text },
                    filterTable === 'no_table' && { color: '#fff' },
                  ]}
                >
                  ⚠️ לא שובצו
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.subText }]}>הרשימה ריקה</Text>
            <Text style={[styles.emptySubText, { color: theme.subText }]}>התחל להוסיף מוזמנים!</Text>
          </View>
        ) : filteredContacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.subText }]}>לא נמצאו תוצאות</Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.recordID)}
            contentContainerStyle={styles.listContainer}
            initialNumToRender={10}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setImportOptionsVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ================= MODALS ================= */}

      {/* Import Options */}
      <Modal
        visible={importOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportOptionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.actionSheet, styles.narrowModal, { backgroundColor: theme.sheetBg }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>פעולות</Text>

            <View style={styles.sheetGrid}>
              <TouchableOpacity
                style={styles.sheetAction}
                onPress={() => {
                  setImportOptionsVisible(false);
                  setManualVisible(true);
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: theme.iconBg }]}>
                  <Text>✏️</Text>
                </View>
                <Text style={[styles.sheetLabel, { color: theme.subText }]}>ידני</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetAction}
                onPress={() => {
                  setImportOptionsVisible(false);
                  setGuideVisible(true);
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: isDarkMode ? '#1e1b4b' : '#EEF2FF' }]}>
                  <Text>📘</Text>
                </View>
                <Text style={[styles.sheetLabel, { color: theme.subText }]}>מדריך</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetAction}
                onPress={async () => {
                  setImportOptionsVisible(false);
                  await downloadExcelTemplate();
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: theme.iconBg }]}>
                  <Text>📥</Text>
                </View>
                <Text style={[styles.sheetLabel, { color: theme.subText }]}>הורד אקסל</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetAction}
                onPress={async () => {
                  setImportOptionsVisible(false);
                  await uploadExcelFile();
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: theme.iconBg }]}>
                  <Text>📤</Text>
                </View>
                <Text style={[styles.sheetLabel, { color: theme.subText }]}>העלה אקסל</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetAction}
                onPress={() => {
                  setImportOptionsVisible(false);
                  openVcfModal();
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: theme.iconBg }]}>
                  <Text>☁️</Text>
                </View>
                <Text style={[styles.sheetLabel, { color: theme.subText }]}>vCard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetAction}
                onPress={() => {
                  setImportOptionsVisible(false);
                  setConfirmPayload({ mode: 'all', contactId: null, name: '' });
                  setConfirmVisible(true);
                }}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: isDarkMode ? '#450a0a' : '#FEE2E2' }]}>
                  <Text>🗑️</Text>
                </View>
                <Text style={[styles.sheetLabel, { color: '#EF4444' }]}>מחק הכל</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sheetClose, { backgroundColor: theme.iconBg }]}
              onPress={() => setImportOptionsVisible(false)}
            >
              <Text style={[styles.sheetCloseText, { color: theme.subText }]}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Add (RTL FIXED) */}
      <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlayCenter}>
          <View style={[styles.dialogCard, styles.narrowModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>הוסף מוזמן</Text>

            <Text style={[styles.label, { color: theme.subText, textAlign: 'right' }]}>שם מלא</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, textAlign: 'right' },
              ]}
              placeholder="שם המוזמן"
              placeholderTextColor={theme.subText}
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <Text style={[styles.label, { color: theme.subText, textAlign: 'right' }]}>טלפון</Text>
            <View style={styles.rowInputs}>
              <TextInput
                ref={phoneBodyRef}
                style={[
                  styles.input,
                  { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, textAlign: 'right' },
                ]}
                placeholder="XXXXXXX"
                placeholderTextColor={theme.subText}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    width: 70,
                    marginLeft: 8,
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.text,
                    textAlign: 'center',
                  },
                ]}
                placeholder="05X"
                placeholderTextColor={theme.subText}
                value={selectedPrefix}
                onChangeText={(t) => {
                  setSelectedPrefix(t);
                  if (t.length === 3) phoneBodyRef.current?.focus();
                }}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setManualVisible(false)} style={[styles.btnSecondary, { backgroundColor: theme.bg }]}>
                <Text style={[styles.btnTextSec, { color: theme.subText }]}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addManualContact} style={[styles.btnPrimary, { backgroundColor: theme.primary }]}>
                <Text style={styles.btnTextPri}>שמור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* vCard Modal */}
      <Modal visible={vcfModalVisible} transparent animationType="fade" onRequestClose={() => setVcfModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlayCenter}>
          <View style={[styles.dialogCard, styles.narrowModal, { backgroundColor: theme.card, padding: 18 }]}>
            <Text style={[styles.dialogTitle, { color: theme.text, marginBottom: 10 }]}>ייבוא vCard (iCloud)</Text>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: theme.primary, marginBottom: 12 }]}
              onPress={pickVcfFile}
              disabled={isLoadingVcf}
            >
              <Text style={styles.btnTextPri}>{isLoadingVcf ? 'טוען...' : 'בחר קובץ vCard (.vcf)'}</Text>
            </TouchableOpacity>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.text,
                  textAlign: 'right',
                  marginBottom: 10,
                },
              ]}
              placeholder="חיפוש בשם/טלפון מתוך הקובץ..."
              placeholderTextColor={theme.subText}
              value={vcfSearch}
              onChangeText={setVcfSearch}
            />

            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    const all = new Set((vcfContacts || []).map((c) => c.id));
                    setSelectedAndRef(all);
                  }}
                  disabled={!vcfContacts.length}
                  style={[styles.btnSecondary, { backgroundColor: theme.bg, paddingVertical: 8, paddingHorizontal: 12 }]}
                >
                  <Text style={[styles.btnTextSec, { color: theme.text, fontSize: 13 }]}>בחר הכל</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedAndRef(new Set())}
                  disabled={!vcfContacts.length}
                  style={[styles.btnSecondary, { backgroundColor: theme.bg, paddingVertical: 8, paddingHorizontal: 12 }]}
                >
                  <Text style={[styles.btnTextSec, { color: theme.text, fontSize: 13 }]}>נקה</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: theme.subText, fontWeight: '700', fontSize: 12 }}>
                נטענו: {vcfContacts.length} | נבחרו: {selectedIds.size}
              </Text>
            </View>

            <View style={{ width: '100%', maxHeight: 360, borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden' }}>
              {!vcfContacts.length ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: theme.subText }}>{isLoadingVcf ? 'טוען...' : 'עדיין לא נטען קובץ.'}</Text>
                </View>
              ) : (
                <FlatList
                  data={(vcfContacts || []).filter((c) => {
                    const q = (vcfSearch || '').toLowerCase();
                    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
                  })}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item, index }) => {
                    const selected = selectedIds.has(item.id);
                    return (
                      <TouchableOpacity
                        onPress={() => toggleSelectVcf(item.id)}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          backgroundColor: index % 2 === 0 ? (isDarkMode ? '#0B1220' : '#F8FAFC') : 'transparent',
                          borderRightWidth: 5,
                          borderRightColor: selected ? theme.primary : 'transparent',
                        }}
                      >
                        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ maxWidth: '85%' }}>
                            <Text style={{ color: theme.text, fontWeight: '800', textAlign: 'right' }} numberOfLines={1}>
                              {item.name || 'ללא שם'}
                            </Text>
                            <Text style={{ color: theme.subText, textAlign: 'right', marginTop: 2 }}>{item.phone}</Text>
                          </View>

                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 5,
                              borderWidth: 2,
                              borderColor: selected ? theme.primary : theme.border,
                              backgroundColor: selected ? theme.primary : 'transparent',
                            }}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>

            <View style={[styles.dialogActions, { marginTop: 12 }]}>
              <TouchableOpacity onPress={() => setVcfModalVisible(false)} style={[styles.btnSecondary, { backgroundColor: theme.bg }]}>
                <Text style={[styles.btnTextSec, { color: theme.subText }]}>סגור</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!user) return Alert.alert('שגיאה', 'משתמש לא מחובר');
                  const pickedIds = Array.from(selectedIdsRef.current || []);
                  if (!pickedIds.length) return Alert.alert('שים לב', 'לא נבחרו אנשי קשר');

                  setIsImporting(true);
                  try {
                    const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
                    const updatesObj = {};
                    let success = 0;

                    const mapById = new Map((vcfContacts || []).map((c) => [c.id, c]));
                    pickedIds.forEach((rid) => {
                      const c = mapById.get(rid);
                      if (!c?.phone) return;
                      const phoneClean = normalizeTel(c.phone);
                      if (!/^\+?\d{7,15}$/.test(phoneClean)) return;

                      const k = push(contactsRef).key;
                      updatesObj[k] = {
                        recordID: k,
                        displayName: (c.name || 'ללא שם').trim(),
                        phoneNumbers: phoneClean,
                        createdAt: Date.now(),
                      };
                      success++;
                    });

                    if (success > 0) await update(contactsRef, updatesObj);

                    setSummaryText(`✅ יובאו ${success} אנשי קשר נבחרים.`);
                    setSummaryVisible(true);

                    setSelectedAndRef(new Set());
                    setVcfModalVisible(false);
                  } catch (e) {
                    console.error(e);
                    Alert.alert('שגיאה', 'ייבוא נכשל, נסה שוב.');
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={isImporting || selectedIds.size === 0}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: theme.primary, opacity: isImporting || selectedIds.size === 0 ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.btnTextPri}>{isImporting ? 'מייבא...' : 'ייבא נבחרים'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Guest Edit Modal (SHOW TABLE + SHOW GIFT newPrice + blessing) */}
      <Modal visible={guestModalVisible} transparent animationType="fade" onRequestClose={() => setGuestModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlayCenter}>
          <View style={[styles.dialogCard, styles.narrowModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>עריכה</Text>

            {selectedGuest && (
              <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.primary }}>
                  שולחן: {getGuestTableName(selectedGuest)}
                </Text>
              </View>
            )}
{selectedGuest && (() => {
  const rsvp = getGuestRsvpInfo(selectedGuest);
  const key = getStatusKey(selectedGuest);
  const accent = leftBarColor(key);
  const stText = statusLabel(key, rsvp?.response || rsvp?.status);
  const stTime = rsvp?.timestamp ? toLocalTime(rsvp.timestamp) : '';

  return (
    <View
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: accent,
        backgroundColor: isDarkMode ? '#0B1220' : '#F8FAFC',
        alignItems: 'flex-end',
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '900', color: theme.text, textAlign: 'right' }}>
        סטטוס: {stText}
      </Text>
      {!!stTime && (
        <Text style={{ fontSize: 12, color: theme.subText, marginTop: 4, textAlign: 'right' }}>
          עדכון אחרון: {stTime}
        </Text>
      )}
    </View>
  );
})()}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { color: theme.subText, textAlign: 'right' }]}>פרטים</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, textAlign: 'right' }]}
                value={editGuestName}
                onChangeText={setEditGuestName}
                placeholder="שם"
                placeholderTextColor={theme.subText}
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text, textAlign: 'right' }]}
                value={editGuestPhone}
                onChangeText={setEditGuestPhone}
                placeholder="טלפון"
                placeholderTextColor={theme.subText}
                keyboardType="phone-pad"
              />
            </View>

            <View
              style={{
                marginBottom: 16,
                backgroundColor: isDarkMode ? '#1e293b' : '#FEF3C7',
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Text style={[styles.label, { color: isDarkMode ? '#FCD34D' : '#92400E', textAlign: 'right', marginBottom: 6 }]}>
                🎁 מתנה שהתקבלה
              </Text>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>
                  {selectedGift.amount !== null ? `₪ ${selectedGift.amount}` : '—'}
                </Text>

                {selectedGift.blessing ? (
                  <Text style={{ fontSize: 14, color: theme.subText, marginTop: 6, textAlign: 'right' }}>
                    "{selectedGift.blessing}"
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: theme.subText, marginTop: 6, textAlign: 'right' }}>ללא ברכה</Text>
                )}
              </View>
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setGuestModalVisible(false)} style={[styles.btnSecondary, { backgroundColor: theme.bg }]}>
                <Text style={[styles.btnTextSec, { color: theme.subText }]}>סגור</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveGuestEdits}
                style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
                disabled={isSavingGuest}
              >
                <Text style={styles.btnTextPri}>{isSavingGuest ? 'שומר...' : 'שמור'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Guide Modal */}
      <Modal visible={guideVisible} animationType="slide" onRequestClose={() => setGuideVisible(false)}>
        <View style={[styles.screen, { backgroundColor: theme.bg }]}>
          <View style={[styles.header, { backgroundColor: theme.headerBg, paddingTop: headerTopPadding }]}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => setGuideVisible(false)} style={[styles.iconBtn, { backgroundColor: theme.bg }]}>
                <Text style={[styles.iconBtnText, { color: theme.text }]}>סגור</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>מדריך ייבוא (vCard)</Text>
              <View style={{ width: 45 }} />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
            <View style={styles.guideStep}>
              <Text style={[styles.guideStepTitle, { color: theme.text }]}>1. היכנס ל-iCloud.com</Text>
              <Image source={onepic} style={styles.guideImage} resizeMode="contain" />
              <Text style={[styles.guideStepText, { color: theme.subText }]}>התחבר לחשבון ה-iCloud דרך הדפדפן במחשב.</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={[styles.guideStepTitle, { color: theme.text }]}>2. בחר "אנשי קשר"</Text>
              <Image source={twopic} style={styles.guideImage} resizeMode="contain" />
              <Text style={[styles.guideStepText, { color: theme.subText }]}>לחץ על אייקון אנשי הקשר.</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={[styles.guideStepTitle, { color: theme.text }]}>3. ייצוא vCard</Text>
              <Image source={threepic} style={styles.guideImage} resizeMode="contain" />
              <Text style={[styles.guideStepText, { color: theme.subText }]}>בחר את אנשי הקשר (CTRL+A) ← גלגל שיניים ← Export vCard.</Text>
            </View>
            <View style={styles.guideStep}>
              <Text style={[styles.guideStepTitle, { color: theme.text }]}>4. העלאה לאפליקציה</Text>
              <Image source={fourpic} style={styles.guideImage} resizeMode="contain" />
              <Text style={[styles.guideStepText, { color: theme.subText }]}>חזור לכאן, לחץ על vCard, בחר את הקובץ וייבא.</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Summary Modal */}
      <Modal visible={summaryVisible} transparent animationType="fade" onRequestClose={() => setSummaryVisible(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setSummaryVisible(false)}>
          <Pressable style={[styles.dialogCard, styles.narrowModal, { backgroundColor: theme.card }]} onPress={() => {}}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>סיכום</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <Text style={{ color: theme.text, textAlign: 'right', lineHeight: 22 }}>{summaryText}</Text>
            </ScrollView>
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setSummaryVisible(false)} style={[styles.btnPrimary, { backgroundColor: theme.primary }]}>
                <Text style={styles.btnTextPri}>הבנתי</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setConfirmVisible(false)}>
          <Pressable style={[styles.dialogCard, styles.narrowModal, { backgroundColor: theme.card }]} onPress={() => {}}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>מחיקה</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: theme.text }}>
              {confirmPayload.mode === 'all' ? 'למחוק את כל המוזמנים?' : `למחוק את ${confirmPayload.name}?`}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setConfirmVisible(false)} style={[styles.btnSecondary, { backgroundColor: theme.bg }]}>
                <Text style={[styles.btnTextSec, { color: theme.subText }]}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={runConfirmedDelete} style={[styles.btnPrimary, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.btnTextPri}>מחק</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

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
    marginBottom: 12,
    marginTop: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  iconBtn: { padding: 8, borderRadius: 12, minWidth: 40, alignItems: 'center' },
  iconBtnText: { fontSize: 13, fontWeight: '700' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchContainer: { flex: 1, borderRadius: 12, height: 44, justifyContent: 'center' },
searchInput: {
  fontSize: 15,
  fontWeight: '500',
  paddingHorizontal: 12,
  textAlign: 'right',
  writingDirection: 'rtl',
},
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterIcon: { fontSize: 20 },
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

  filterPanel: { marginTop: 12 },
  filterScroll: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 2 },
  filterChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },

  body: { flex: 1 },
  listContainer: { padding: 16, paddingBottom: 100, maxWidth: 600, alignSelf: 'center', width: '100%' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold' },
  emptySubText: { fontSize: 14, marginTop: 6 },

  // ✅ now borderLeft for status color
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPressArea: { flex: 1, flexDirection: 'row-reverse', padding: 16, alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  cardPhone: { fontSize: 13, textAlign: 'right' },

  cardTable: { paddingHorizontal: 8 },
  tableBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tableText: { fontSize: 11, fontWeight: '700' },

  deleteBtn: { paddingHorizontal: 16, justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.05)' },
  deleteIcon: { fontSize: 20 },

  fab: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fabText: { color: '#fff', fontSize: 32, marginTop: -4 },

  narrowModal: { width: '90%', maxWidth: 450, alignSelf: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'web' ? 20 : 0,
  },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

  actionSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  sheetGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  sheetAction: { alignItems: 'center', width: '30%', marginBottom: 16 },
  sheetIconBox: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sheetLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  sheetClose: { marginTop: 12, padding: 14, borderRadius: 16, alignItems: 'center' },
  sheetCloseText: { fontWeight: 'bold', fontSize: 16 },

  dialogCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'right' },

  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 16 },
  rowInputs: { flexDirection: 'row-reverse' },

  dialogActions: { flexDirection: 'row-reverse', marginTop: 12, gap: 12 },
  btnPrimary: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  btnSecondary: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  btnTextPri: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnTextSec: { fontWeight: 'bold', fontSize: 16 },

  // Guide
  guideStep: { marginBottom: 16 },
  guideStepTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 6 },
  guideStepText: { textAlign: 'right' },
  guideImage: { width: '100%', height: 200, borderRadius: 10, marginVertical: 8 },
  statusMidWrap: {
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

statusPill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
  minWidth: 90,
},
headerTop: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
  marginTop: 4,
},

headerSide: {
  width: 96,            // תוכל לשחק 80-110 לפי איך שזה נראה אצלך
  alignItems: 'flex-start',
},

headerTitle: {
  flex: 1,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: '800',
  letterSpacing: 0.5,
},



headerSpacer: {
  width: 90, // חשוב: אותו רוחב “ויזואלי” כמו כפתור החזור (אפשר לשחק בין 80-100)
},

});

export default Management;
