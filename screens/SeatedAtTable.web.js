// SeatedAtTable.js — DarkMode + Fixed Modals (no overflow) + Firebase theme mode
// ✅ שיפורים:
// 1) אין יותר window.alert / Alert — במקום זה Toast בתוך האפליקציה
// 2) ברשימת השולחנות: אורחים מוצגים כ־Chips עם צבע סטטוס (ירוק/אדום/כתום/אפור)
// 3) מודל עריכת שולחן משודרג: מידות נכונות, Scroll פנימי, בלי overflow
// 4) תיקון "מספר שולחן" שלא ייחתך + אין כפתור ✕ (יש כפתור סגור)
// 5) תאריך יצירה לשולחן (createdAt) + הצגה במודל עריכה (+ fallback לשולחנות ישנים)

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  FlatList,
  Platform,
  TextInput,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, remove, set, onValue, update } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database, storage } from '../firebase';

import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { ref as sRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import firebase from 'firebase/compat/app';
import { useColorScheme } from 'react-native';

const SeatedAtTable = (props) => {
  const { id } = props.route.params; // eventId
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const headerTopPadding =
    Platform.OS === 'android'
      ? (StatusBar.currentHeight || 0) + 10
      : insets.top;

  // --- Responsive ---
  const isDesktopWeb = Platform.OS === 'web' && winW >= 992;
  const imageBoxHeight = isDesktopWeb ? Math.round(winH * 0.70) : Math.round(winW * 0.65);
  const editMaxH = Math.round(winH * 0.88);

  // ===== Theme (Firebase) =====
  const systemScheme = useColorScheme(); // 'dark' | 'light'
  const [themeMode, setThemeMode] = useState('auto'); // 'auto' | 'dark' | 'light'

  const isDark = useMemo(() => {
    return themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark');
  }, [themeMode, systemScheme]);

  const C = useMemo(() => {
    if (isDark) {
      return {
        bg: '#0B1220',
        header: '#0F172A',
        card: '#111C2F',
        card2: '#0F1A2D',
        soft: 'rgba(255,255,255,0.06)',
        border: '#22314A',
        borderSoft: '#2D3F5F',

        text: '#E8EEF9',
        subText: '#9FB0CC',
        muted: '#6B7FA4',

        primary: '#6C63FF',
        danger: '#EF5350',
        success: '#10B981',
        warn: '#F59E0B',

        overlay: 'rgba(0,0,0,0.72)',
        inputBg: '#0B1528',
        inputBorder: '#243450',
        placeholder: '#7E93B6',
        shadow: 'rgba(0,0,0,0.6)',
      };
    }

    return {
      bg: '#F5F7FA',
      header: '#FFFFFF',
      card: '#FFFFFF',
      card2: '#FFFFFF',
      soft: '#F3F6FB',
      border: '#E6ECF5',
      borderSoft: '#EEF2F7',

      text: '#1F2A37',
      subText: '#475569',
      muted: '#8A97A8',

      primary: '#6C63FF',
      danger: '#EF5350',
      success: '#16A34A',
      warn: '#F59E0B',

      overlay: 'rgba(0,0,0,0.50)',
      inputBg: '#FFFFFF',
      inputBorder: '#E6ECF5',
      placeholder: '#9AA6B2',
      shadow: 'rgba(0,0,0,0.10)',
    };
  }, [isDark]);

  // --- Data State ---
  const [contacts, setContacts] = useState([]); // tables
  const [allContacts, setAllContacts] = useState([]); // guests pool
  const [user, setUser] = useState(null);
  const [userId2, setUserId2] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [responses, setResponses] = useState({});

  // Modals
  const [modalVisible, setModalVisible] = useState(false); // add table
  const [editModalVisible, setEditModalVisible] = useState(false); // edit table
  const [addGuestsModalVisible, setAddGuestsModalVisible] = useState(false); // add guests
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); // delete all

  // Form fields (add table)
  const [newContactName, setNewContactName] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]); // multi select guest IDs

  // Edit
  const [selectedTable, setSelectedTable] = useState(null);
  const [editedTableName, setEditedTableName] = useState('');
  const [editedTableNumber, setEditedTableNumber] = useState('');

  // Search
  const [searchText, setSearchText] = useState('');
  const [searchContactText, setSearchContactText] = useState('');

  // Upload
  const uploadTaskRef = useRef(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [busyText, setBusyText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);

  // =========================
  // ✅ Toast
  // =========================
  const toastAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 visible
  const toastTimer = useRef(null);
  const [toastState, setToastState] = useState({
    visible: false,
    type: 'info', // 'success' | 'error' | 'warn' | 'info'
    title: '',
    message: '',
  });

  const toastColors = useMemo(() => {
    return {
      info: {
        bg: isDark ? 'rgba(108,99,255,0.22)' : '#EEF2FF',
        border: isDark ? 'rgba(108,99,255,0.35)' : '#C7D2FE',
      },
      success: {
        bg: isDark ? 'rgba(16,185,129,0.18)' : '#E8F5E9',
        border: isDark ? 'rgba(16,185,129,0.28)' : '#C8E6C9',
      },
      error: {
        bg: isDark ? 'rgba(239,83,80,0.18)' : '#FFEBEE',
        border: isDark ? 'rgba(239,83,80,0.30)' : '#FFCDD2',
      },
      warn: {
        bg: isDark ? 'rgba(245,158,11,0.18)' : '#FFF8E1',
        border: isDark ? 'rgba(245,158,11,0.30)' : '#FFECB3',
      },
    };
  }, [isDark]);

  const showToast = useCallback(
    (type, title, message, duration = 2200) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);

      setToastState({ visible: true, type: type || 'info', title: title || '', message: message || '' });

      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();

      toastTimer.current = setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setToastState((p) => ({ ...p, visible: false }));
        });
      }, duration);
    },
    [toastAnim]
  );

  const notify = useCallback(
    (title, msg, type = 'info') => {
      showToast(type, title, msg);
    },
    [showToast]
  );

  // =========================
  // ✅ Confirm Modal
  // =========================
  const [confirmState, setConfirmState] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'אישור',
    cancelText: 'ביטול',
    danger: false,
    resolver: null,
  });

  const askConfirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setConfirmState({
        visible: true,
        title: opts?.title || 'אישור פעולה',
        message: opts?.message || '',
        confirmText: opts?.confirmText || 'אישור',
        cancelText: opts?.cancelText || 'ביטול',
        danger: !!opts?.danger,
        resolver: resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback(
    (result) => {
      const r = confirmState.resolver;
      setConfirmState((p) => ({ ...p, visible: false, resolver: null }));
      if (typeof r === 'function') r(!!result);
    },
    [confirmState.resolver]
  );

  // --- Table types ---
  const buttons = useMemo(
    () => [
      { size: 12, icon: require('../assets/meroba-removebg-preview.png'), label: 'מרובע 12' },
      { size: 14, icon: require('../assets/malben1-removebg-preview.png'), label: 'מלבן 14' },
      { size: 18, icon: require('../assets/malben2-removebg-preview.png'), label: 'מלבן 18' },
      { size: 16, icon: require('../assets/igol1-removebg-preview.png'), label: 'עגול 16' },
      { size: 10, icon: require('../assets/igol2-removebg-preview.png'), label: 'עגול 10' },
      { size: 24, icon: require('../assets/malben4-removebg-preview.png'), label: 'אביר 24' },
    ],
    []
  );

  const sizeIconMap = useMemo(() => {
    const map = {};
    buttons.forEach((b) => (map[b.size] = b.icon));
    return map;
  }, [buttons]);

  // --- Helpers: status colors/labels ---
  const getGuestColor = useCallback(
    (gid) => {
      const status = responses?.[gid]?.response;
      if (status === 'מגיע') return '#4CAF50';
      if (status === 'לא מגיע') return '#FF5252';
      if (status === 'אולי') return '#FFC107';
      return '#9E9E9E';
    },
    [responses]
  );

  const getGuestStatusLabel = useCallback(
    (gid) => {
      const status = responses?.[gid]?.response;
      if (status === 'מגיע' || status === 'לא מגיע' || status === 'אולי') return status;
      return 'בהמתנה';
    },
    [responses]
  );

  // --- Helpers: createdAt + format ---
  const getCreatedAtMs = useCallback((t) => {
    const v = t?.createdAt;

    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);

    // fallback: recordID is usually Date.now()
    if (typeof t?.recordID === 'string' && /^\d+$/.test(t.recordID)) return Number(t.recordID);

    return null;
  }, []);

  const formatDateHe = useCallback((ms) => {
    try {
      return new Date(ms).toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, []);

  // --- Image Logic ---
  const loadImagesFromStorage = useCallback(
    async (uid) => {
      try {
        const url = await getDownloadURL(sRef(storage, `users/${uid}/${id}/seatOnTables/image_0.jpg`));
        setSelectedImage(url);
      } catch {
        // silent
      }
    },
    [id]
  );

  const uploadImage = async (localUri) => {
    if (!userId2) return notify('שגיאה', 'משתמש אינו מחובר', 'error');
    try {
      setBusyText('מעלה תרשים...');
      setImgBusy(true);
      setUploadProgress(0);

      const resp = await fetch(localUri);
      const blob = await resp.blob();
      const fileRef = sRef(storage, `users/${userId2}/${id}/seatOnTables/image_0.jpg`);
      const task = uploadBytesResumable(fileRef, blob);
      uploadTaskRef.current = task;

      task.on(
        'state_changed',
        (snap) => setUploadProgress(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
        () => {
          setImgBusy(false);
          notify('שגיאה', 'העלאה נכשלה', 'error');
        },
        async () => {
          const url = await getDownloadURL(fileRef);
          setSelectedImage(url);
          setImgBusy(false);
          notify('הצלחה', 'התרשים הועלה בהצלחה!', 'success');
        }
      );
    } catch (err) {
      setImgBusy(false);
      notify('שגיאה בהעלאה', String(err?.message || err), 'error');
    }
  };

  const handleButtonPress = async () => {
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!pick.canceled) await uploadImage(pick.assets[0].uri);
  };

  const deleteImage = async () => {
    if (!userId2) return;

    const ok = await askConfirm({
      title: 'מחיקת תרשים',
      message: 'למחוק את תרשים האולם?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      danger: true,
    });
    if (!ok) return;

    setBusyText('מוחק...');
    setImgBusy(true);
    try {
      await deleteObject(sRef(storage, `users/${userId2}/${id}/seatOnTables/image_0.jpg`));
      setSelectedImage(null);
      notify('בוצע', 'התרשים נמחק', 'success');
    } catch {
      notify('שגיאה', 'לא הצלחתי למחוק תרשים', 'error');
    } finally {
      setImgBusy(false);
      setUploadProgress(null);
      setBusyText('');
    }
  };

  // --- Effects ---
  useEffect(() => {
    const u = firebase.auth().currentUser;
    if (u) {
      setUserId2(u.uid);
      loadImagesFromStorage(u.uid);
    }

    let unsubTables = null;
    let unsubContacts = null;
    let unsubResponses = null;
    let unsubTheme = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Theme listener
        const themeModeRef = ref(database, `Events/${currentUser.uid}/${id}/__admin/ui/theme/mode`);
        unsubTheme = onValue(themeModeRef, (snap) => {
          const m = snap.val();
          if (m === 'dark' || m === 'light' || m === 'auto') setThemeMode(m);
          else setThemeMode('auto');
        });

        // tables
        unsubTables = onValue(ref(database, `Events/${currentUser.uid}/${id}/tables`), (snapshot) => {
          const data = snapshot.val();
          setContacts(data ? Object.values(data) : []);
        });

        // guests
        unsubContacts = onValue(ref(database, `Events/${currentUser.uid}/${id}/contacts`), (snapshot) => {
          const data = snapshot.val();
          setAllContacts(data ? Object.values(data) : []);
        });

        // responses
        unsubResponses = onValue(ref(database, `Events/${currentUser.uid}/${id}/responses`), (snapshot) => {
          setResponses(snapshot.val() || {});
        });
      } else {
        setUser(null);
        setContacts([]);
        setAllContacts([]);
        setResponses({});
      }
    });

    return () => {
      try {
        if (unsubTables) unsubTables();
        if (unsubContacts) unsubContacts();
        if (unsubResponses) unsubResponses();
        if (unsubTheme) unsubTheme();
        if (unsubAuth) unsubAuth();
      } catch {}
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [id, loadImagesFromStorage]);

  useEffect(() => {
    if (selectedImage) Image.prefetch(selectedImage).catch(() => {});
  }, [selectedImage]);

  // --- Table Logic ---
  const openAddTableModal = () => {
    setNewContactName('');
    setSelectedSize(null);
    setSelectedContacts([]);
    setSearchContactText('');
    setModalVisible(true);
  };

  const addTable = () => {
    if (!user?.uid) return notify('שגיאה', 'משתמש אינו מחובר', 'error');
    if (!newContactName.trim()) return notify('שגיאה', 'נא להזין שם שולחן', 'error');
    if (!selectedSize) return notify('שגיאה', 'נא לבחור סוג שולחן', 'error');
    if (selectedContacts.length > selectedSize) {
      return notify('קיבולת', `נבחרו ${selectedContacts.length} אורחים לשולחן של ${selectedSize}`, 'warn');
    }

    const now = Date.now();
    const recordID = String(now);
    const tableNum = contacts.length + 1;

    const guestsObjects = selectedContacts
      .map((cid) => allContacts.find((c) => c.recordID === cid))
      .filter(Boolean);

    const newTable = {
      recordID,
      createdAt: now, // ✅
      numberTable: `שולחן ${tableNum}`,
      displayName: newContactName,
      size: selectedSize,
      guests: guestsObjects,
    };

    set(ref(database, `Events/${user.uid}/${id}/tables/${recordID}`), newTable)
      .then(() => {
        setModalVisible(false);
        notify('הצלחה', 'השולחן נוסף בהצלחה', 'success');
      })
      .catch((e) => notify('שגיאה', e.message, 'error'));
  };

  const openEditModal = (table) => {
    setSelectedTable(table);
    setEditedTableName(table.displayName || '');
    setEditedTableNumber(table.numberTable || '');
    setEditModalVisible(true);
  };

  const updateTableInfo = (field, value) => {
    if (!user?.uid) return notify('שגיאה', 'משתמש אינו מחובר', 'error');
    if (!selectedTable?.recordID) return;
    if (!String(value || '').trim()) return notify('שגיאה', 'ערך לא תקין', 'error');

    update(ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`), { [field]: value })
      .then(() => {
        setSelectedTable((prev) => ({ ...prev, [field]: value }));
        notify('עודכן', 'נשמר בהצלחה', 'success');
      })
      .catch((e) => notify('שגיאה', e.message, 'error'));
  };

const deleteTable = async () => {
  if (!selectedTable?.recordID) return;

  // ✅ סגור את מודל העריכה כדי שה-confirm לא יהיה "מאחורה" (בעיקר ב-WEB)
  setEditModalVisible(false);

  // תן ל-Modal להיסגר לפני פתיחת confirm (במיוחד ב-web)
  await new Promise((r) => setTimeout(r, Platform.OS === 'web' ? 60 : 30));

  const ok = await askConfirm({
    title: 'מחיקת שולחן',
    message: `למחוק את "${selectedTable.displayName}"?`,
    confirmText: 'מחק',
    cancelText: 'ביטול',
    danger: true,
  });

  if (!ok) {
    // ✅ המשתמש ביטל -> נחזיר את מודל העריכה
    setTimeout(() => setEditModalVisible(true), 50);
    return;
  }

  try {
    await remove(ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`));
    notify('בוצע', 'השולחן נמחק', 'success');
    // לא מחזירים את מודל העריכה כי השולחן נמחק
  } catch (e) {
    notify('שגיאה', String(e?.message || e), 'error');
    // במקרה כשלון – נחזיר את מודל העריכה כדי שהמשתמש לא ייתקע
    setTimeout(() => setEditModalVisible(true), 50);
  }
};


  const deleteGuestFromTable = async (guestId) => {
    if (!user?.uid) return notify('שגיאה', 'משתמש אינו מחובר', 'error');
    if (!selectedTable?.recordID) return;

    const guestObj = (selectedTable.guests || []).find((g) => g.recordID === guestId);
    const ok = await askConfirm({
      title: 'הסרת אורח',
      message: `להסיר את "${guestObj?.displayName || ''}" מהשולחן?`,
      confirmText: 'הסר',
      cancelText: 'ביטול',
      danger: true,
    });
    if (!ok) return;

    const updatedGuests = (selectedTable.guests || []).filter((g) => g.recordID !== guestId);
    update(ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`), { guests: updatedGuests }).then(() =>
      setSelectedTable((prev) => ({ ...prev, guests: updatedGuests }))
    );
  };

  const openAddGuestsToEditModal = () => {
    setSearchContactText('');
    setSelectedContacts([]);
    setAddGuestsModalVisible(true);
  };

  const saveGuestsToTable = () => {
    if (!user?.uid) return notify('שגיאה', 'משתמש אינו מחובר', 'error');
    if (!selectedTable?.recordID) return;

    const newGuests = selectedContacts
      .map((cid) => allContacts.find((c) => c.recordID === cid))
      .filter(Boolean);

    const combinedGuests = [...(selectedTable.guests || []), ...newGuests];

    if (selectedTable.size && combinedGuests.length > selectedTable.size) {
      return notify('חריגה', `השולחן מכיל ${combinedGuests.length} אורחים, הקיבולת היא ${selectedTable.size}`, 'warn');
    }

    update(ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`), { guests: combinedGuests }).then(() => {
      setSelectedTable((prev) => ({ ...prev, guests: combinedGuests }));
      setAddGuestsModalVisible(false);
      setSelectedContacts([]);
      notify('הצלחה', 'האורחים נוספו לשולחן', 'success');
    });
  };

  const deleteAllTables = async () => {
    if (!user?.uid) return notify('שגיאה', 'משתמש אינו מחובר', 'error');

    try {
      await remove(ref(database, `Events/${user.uid}/${id}/tables`));
      await remove(ref(database, `Events/${user.uid}/${id}/tablesPlace`));
      setDeleteModalVisible(false);
      notify('הצלחה', 'כל השולחנות נמחקו', 'success');
    } catch (e) {
      notify('שגיאה', String(e?.message || e), 'error');
    }
  };

  // --- Planning Navigation ---
  const navigateToPlanning = () => {
    if (!selectedImage) return notify('חסר תרשים', 'יש להעלות תמונה לפני המעבר לתכנון.', 'warn');

    const tableDataForPlanning = contacts.map((table) => ({
      ...table,
      id: table.recordID,
      name: table.displayName,
    }));

    props.navigation.navigate('TablePlanningScreen', {
      id,
      selectedImage,
      tableData: tableDataForPlanning,
    });
  };

  // --- Printing ---
  const printHTML = async (html) => {
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
        setTimeout(() => w.close(), 100);
      }
    } else {
      await Print.printAsync({ html });
    }
  };

  const printSingleTable = (table) => {
    const names = table.guests?.map((g) => g.displayName).join(', ') || 'אין אורחים';
    printHTML(`
      <html dir="rtl"><body style="font-family:Arial;text-align:center;padding:20px;">
        <h1>- שמור -</h1><h2>${table.displayName}</h2><h3>${table.numberTable}</h3><p>${names}</p>
      </body></html>
    `);
  };

  const printAll = () => {
    if (!contacts.length) return;
    const pages = contacts
      .map(
        (t) => `
      <div style="page-break-after:always;padding:20px;text-align:center;border:1px solid #eee;margin:10px;">
        <h1>- שמור -</h1><h2>${t.displayName}</h2><h3>${t.numberTable}</h3>
        <p>${t.guests?.map((g) => g.displayName).join(', ') || 'אין אורחים'}</p>
      </div>
    `
      )
      .join('');
    printHTML(`<html dir="rtl"><body style="font-family:Arial;">${pages}</body></html>`);
  };

  // --- Filtering ---
  const filteredContacts = useMemo(() => {
    const q = (searchText || '').toLowerCase();
    return contacts.filter(
      (t) =>
        (t.displayName || '').toLowerCase().includes(q) ||
        (t.guests || []).some((g) => (g.displayName || '').toLowerCase().includes(q))
    );
  }, [contacts, searchText]);

  const filteredModalContacts = useMemo(() => {
    const q = (searchContactText || '').toLowerCase();
    return allContacts.filter((c) => (c.displayName || '').toLowerCase().includes(q));
  }, [allContacts, searchContactText]);

  // --- UI Helpers ---
  const toggleSelectContact = (recordID) => {
    setSelectedContacts((prev) => (prev.includes(recordID) ? prev.filter((x) => x !== recordID) : [...prev, recordID]));
  };

  const inputCommon = (extra = {}) => [
    styles.inputBase,
    {
      backgroundColor: C.inputBg,
      borderColor: C.inputBorder,
      color: C.text,
    },
    extra,
  ];

  // ==== Chips preview helper ====
  const GuestChipsPreview = ({ guests }) => {
    const list = guests || [];
    if (!list.length) return null;

    const max = 8;
    const shown = list.slice(0, max);
    const rest = list.length - shown.length;

    return (
      <View style={[styles.guestChipsWrap, { borderTopColor: C.borderSoft }]}>
        {shown.map((g) => {
          const color = getGuestColor(g.recordID);
          const statusLabel = getGuestStatusLabel(g.recordID);
          return (
            <View
              key={g.recordID}
              style={[
                styles.guestChip,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : C.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.guestChipText, { color: C.text }]} numberOfLines={1}>
                {g.displayName}
              </Text>
              <Text style={[styles.guestChipStatus, { color: isDark ? 'rgba(159,176,204,0.95)' : C.subText }]} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          );
        })}

        {rest > 0 && (
          <View style={[styles.moreChip, { backgroundColor: C.soft, borderColor: C.border }]}>
            <Text style={{ color: C.subText, fontWeight: '900' }}>+{rest}</Text>
          </View>
        )}
      </View>
    );
  };

  // --- Render ---
  const toastStyle = toastColors[toastState.type] || toastColors.info;

  return (
<SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.header} />

      {/* Toast */}
      {toastState.visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            {
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
              opacity: toastAnim,
            },
          ]}
        >
          <View style={[styles.toastCard, { backgroundColor: toastStyle.bg, borderColor: toastStyle.border }]}>
            {!!toastState.title && <Text style={[styles.toastTitle, { color: C.text }]}>{toastState.title}</Text>}
            {!!toastState.message && <Text style={[styles.toastMsg, { color: C.text }]}>{toastState.message}</Text>}
          </View>
        </Animated.View>
      )}

      {/* Confirm Modal */}
      <Modal visible={confirmState.visible} transparent animationType="fade" onRequestClose={() => closeConfirm(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: C.card2, borderColor: C.border, shadowColor: C.shadow, maxWidth: 380 }]}>
            <Text style={[styles.modalTitle, { color: confirmState.danger ? C.danger : C.text }]}>{confirmState.title}</Text>
            <Text style={{ color: C.text, textAlign: 'center', marginTop: 10, lineHeight: 20, fontWeight: '700' }}>
              {confirmState.message}
            </Text>

            <View style={[styles.modalFooter, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.soft, borderColor: C.border }]}
                onPress={() => closeConfirm(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextCancel, { color: C.text }]}>{confirmState.cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: confirmState.danger ? C.danger : C.primary,
                    borderColor: confirmState.danger ? C.danger : C.primary,
                  },
                ]}
                onPress={() => closeConfirm(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextPrimary, { color: '#fff' }]}>{confirmState.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      {/* Header (Management-like) */}
      <View
        style={[
          styles.headerMgmt,
          {
            backgroundColor: C.header,
            paddingTop: headerTopPadding,
            borderBottomColor: C.primary,
            shadowColor: C.primary,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          {/* שמאל: חזור */}
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={() => props.navigation.goBack()}
              activeOpacity={0.8}
              style={[
                styles.headerBackBtn,
                {
                  backgroundColor: C.bg,
                  borderColor: C.border,
                },
              ]}
            >
              <Text style={[styles.headerBackText, { color: C.text }]}>חזור ←</Text>
            </TouchableOpacity>
          </View>

          {/* אמצע: כותרת */}
          <Text style={[styles.headerTitleMgmt, { color: C.text }]} numberOfLines={1}>
            ניהול הושבה
          </Text>

          {/* ימין: placeholder כדי שהכותרת תישאר בדיוק באמצע */}
          <View style={styles.headerSide} />
        </View>
      </View>



      <View style={[styles.mainContent, isDesktopWeb && styles.rowLayout]}>
        {/* Control panel */}
        <View style={[styles.controlPanel, isDesktopWeb && { width: '45%' }]}>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.card, borderColor: C.border, shadowColor: C.shadow }]}
              onPress={openAddTableModal}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>➕</Text>
              <Text style={[styles.actionBtnText, { color: C.text }]}>הוסף שולחן </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.card, borderColor: C.border, shadowColor: C.shadow }]}
              onPress={navigateToPlanning}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>📐</Text>
              <Text style={[styles.actionBtnText, { color: C.text }]}>תכנון מפה </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: C.card, borderColor: C.border, shadowColor: C.shadow, opacity: contacts.length ? 1 : 0.5 },
              ]}
              onPress={printAll}
              disabled={!contacts.length}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>🖨️</Text>
              <Text style={[styles.actionBtnText, { color: C.text }]}>הדפס הכל </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? 'rgba(239,83,80,0.12)' : '#FFEBEE',
                  borderColor: isDark ? 'rgba(239,83,80,0.25)' : '#FFCDD2',
                  shadowColor: C.shadow,
                  opacity: contacts.length ? 1 : 0.5,
                },
              ]}
              onPress={() => setDeleteModalVisible(true)}
              disabled={!contacts.length}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnIcon}>🗑️</Text>
              <Text style={[styles.actionBtnText, { color: C.danger }]}>מחק הכל </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleButtonPress}
            activeOpacity={0.85}
            style={[
              styles.imageBox,
              {
                height: imageBoxHeight,
                backgroundColor: isDark ? '#0B1528' : '#E3E8EE',
                borderColor: isDark ? '#2A3A56' : '#CBD2D9',
              },
            ]}
          >
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.floorPlanImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholderContent}>
                <Image source={require('../assets/uploadimg.png')} style={{ width: 60, height: 60, opacity: 0.55 }} />
                <Text style={[styles.placeholderText, { color: C.placeholder }]}>לחץ להעלאת תרשים אולם</Text>
              </View>
            )}

            {!!selectedImage && (
              <TouchableOpacity style={[styles.deleteImgBtn, { backgroundColor: C.danger }]} onPress={deleteImage}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            )}

            {imgBusy && (
              <View style={[styles.loaderOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={{ color: 'white', marginTop: 10, fontWeight: '700' }}>{busyText}</Text>
                {uploadProgress !== null && (
                  <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <View
                      style={{
                        width: `${Math.round(uploadProgress * 100)}%`,
                        height: '100%',
                        backgroundColor: 'white',
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* List panel */}
        <View style={[styles.listPanel, isDesktopWeb && { width: '50%' }]}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: C.card,
                borderColor: C.border,
                color: C.text,
              },
            ]}
            placeholder="חפש שולחן או אורח"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={C.placeholder}
            textAlign="right"
          />

          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: C.text }]}>רשימת שולחנות ({contacts.length})</Text>
          </View>

          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.recordID}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const guestCount = item.guests ? item.guests.length : 0;
              const isFull = guestCount >= (item.size || 0);

              const createdAtMs = getCreatedAtMs(item);
              const createdStr = createdAtMs ? formatDateHe(createdAtMs) : '';

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: C.card,
                      borderColor: C.border,
                      shadowColor: C.shadow,
                    },
                  ]}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.88}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(108,99,255,0.12)' : '#F0F4FF' }]}>
                      {!!item.size && !!sizeIconMap[item.size] && <Image source={sizeIconMap[item.size]} style={styles.tableIcon} />}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      <Text style={[styles.cardSubTitle, { color: C.subText }]} numberOfLines={1}>
                        {item.numberTable}
                      </Text>
                      {!!createdStr && (
                        <Text style={[styles.cardMeta, { color: C.muted }]} numberOfLines={1}>
                          נוצר: {createdStr}
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isFull
                            ? isDark
                              ? 'rgba(239,83,80,0.16)'
                              : '#FFEBEE'
                            : isDark
                            ? 'rgba(16,185,129,0.14)'
                            : '#E8F5E9',
                          borderColor: isFull
                            ? isDark
                              ? 'rgba(239,83,80,0.25)'
                              : '#FFCDD2'
                            : isDark
                            ? 'rgba(16,185,129,0.22)'
                            : '#C8E6C9',
                        },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: isFull ? C.danger : C.success }]}>
                        {guestCount} / {item.size}
                      </Text>
                    </View>
                  </View>

                  {/* Chips Preview */}
                  <GuestChipsPreview guests={item.guests || []} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: C.muted }]}>לא נמצאו שולחנות</Text>}
          />
        </View>
      </View>

      {/* =========================
          MODAL 1: Add Table
         ========================= */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: C.card2, borderColor: C.border, shadowColor: C.shadow, maxHeight: isDesktopWeb ? 680 : '90%' },
            ]}
          >
            <View style={styles.modalTopBar}>
              <Text style={[styles.modalTitle, { color: C.text }]}>הוספת שולחן חדש</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalX} activeOpacity={0.85}>
                <Text style={{ color: C.subText, fontSize: 18, fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: C.subText }]}>שם השולחן:</Text>
              <TextInput
                style={inputCommon()}
                value={newContactName}
                onChangeText={setNewContactName}
                placeholder="לדוגמה: משפחת כהן"
                placeholderTextColor={C.placeholder}
                textAlign="right"
              />

              <Text style={[styles.label, { color: C.subText }]}>בחר סוג שולחן:</Text>
              <View style={styles.grid}>
                {buttons.map((b) => {
                  const selected = selectedSize === b.size;
                  return (
                    <TouchableOpacity
                      key={b.size}
                      onPress={() => setSelectedSize(b.size)}
                      activeOpacity={0.85}
                      style={[
                        styles.gridItem,
                        {
                          backgroundColor: selected ? (isDark ? 'rgba(108,99,255,0.16)' : '#F3F2FF') : C.soft,
                          borderColor: selected ? C.primary : C.border,
                        },
                      ]}
                    >
                      <Image source={b.icon} style={styles.gridIcon} />
                      <Text style={[styles.gridText, { color: C.text }]}>{b.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: C.subText }]}>שיוך אורחים (אופציונלי):</Text>
              <View style={[styles.miniListContainer, { borderColor: C.border, backgroundColor: C.soft }]}>
                <TextInput
                  style={inputCommon({ paddingVertical: 10 })}
                  placeholder="חיפוש אורח..."
                  value={searchContactText}
                  onChangeText={setSearchContactText}
                  placeholderTextColor={C.placeholder}
                  textAlign="right"
                />

                <ScrollView style={{ height: 170 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {filteredModalContacts.map((c) => {
                    const isSelected2 = selectedContacts.includes(c.recordID);
                    const color = getGuestColor(c.recordID);

                    return (
                      <TouchableOpacity
                        key={c.recordID}
                        onPress={() => toggleSelectContact(c.recordID)}
                        activeOpacity={0.86}
                        style={[
                          styles.selectRow,
                          {
                            backgroundColor: isSelected2 ? (isDark ? 'rgba(108,99,255,0.16)' : '#F3F2FF') : 'transparent',
                            borderBottomColor: C.borderSoft,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.statusDot, { backgroundColor: color }]} />
                          <Text style={[styles.selectText, { color: C.text, fontWeight: isSelected2 ? '900' : '700' }]}>
                            {c.displayName}
                          </Text>
                        </View>

                        {isSelected2 && <Text style={{ color: C.primary, fontWeight: '900' }}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={{ textAlign: 'left', fontSize: 12, color: C.subText, marginTop: 8, fontWeight: '700' }}>
                  נבחרו: {selectedContacts.length} {selectedSize ? `/ ${selectedSize}` : ''}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.soft, borderColor: C.border }]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextCancel, { color: C.text }]}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={addTable}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextPrimary, { color: '#fff' }]}>שמור שולחן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================
          MODAL 2: Edit Table
         ========================= */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: C.card2,
                borderColor: C.border,
                shadowColor: C.shadow,
                maxHeight: editMaxH,
              },
            ]}
          >
            {selectedTable && (
              <>
                <View style={styles.modalTopBar}>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[styles.modalTitle, { color: C.text, textAlign: 'right' }]}>עריכת שולחן</Text>

                    {(() => {
                      const createdAtMs = getCreatedAtMs(selectedTable);
                      const createdStr = createdAtMs ? formatDateHe(createdAtMs) : null;
                      return (
                        <Text style={{ color: C.subText, fontWeight: '800', fontSize: 12, marginTop: 4, textAlign: 'right' }}>
                          נוצר: {createdStr || 'לא ידוע'}
                        </Text>
                      );
                    })()}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => printSingleTable(selectedTable)} style={styles.iconBtnTop} activeOpacity={0.85}>
                      <Text style={{ fontSize: 20 }}>🖨️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ✅ Fields stacked (no cut) */}
                <View style={{ width: '100%' }}>
                  <View style={{ width: '100%', marginBottom: 12 }}>
                    <Text style={[styles.miniLabel, { color: C.subText }]}>מספר שולחן</Text>
                    <View style={[styles.editFieldRow, { backgroundColor: C.soft, borderColor: C.border }]}>
                      <TextInput
                        style={[styles.editFieldInput, { color: C.text }]}
                        value={editedTableNumber}
                        onChangeText={setEditedTableNumber}
                        placeholderTextColor={C.placeholder}
                        textAlign="right"
                      />
                      <TouchableOpacity
                        onPress={() => updateTableInfo('numberTable', editedTableNumber)}
                        style={[styles.saveIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                        activeOpacity={0.85}
                      >
                        <Text>💾</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ width: '100%' }}>
                    <Text style={[styles.miniLabel, { color: C.subText }]}>שם שולחן</Text>
                    <View style={[styles.editFieldRow, { backgroundColor: C.soft, borderColor: C.border }]}>
                      <TextInput
                        style={[styles.editFieldInput, { color: C.text }]}
                        value={editedTableName}
                        onChangeText={setEditedTableName}
                        placeholderTextColor={C.placeholder}
                        textAlign="right"
                      />
                      <TouchableOpacity
                        onPress={() => updateTableInfo('displayName', editedTableName)}
                        style={[styles.saveIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}
                        activeOpacity={0.85}
                      >
                        <Text>💾</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: C.border }]} />

<View style={{ width: '100%', marginBottom: 10 }}>
  <Text style={[styles.label, { color: C.subText, marginTop: 0 }]}>
    אורחים ({selectedTable.guests ? selectedTable.guests.length : 0}/{selectedTable.size}):
  </Text>

  <TouchableOpacity
    onPress={openAddGuestsToEditModal}
    activeOpacity={0.9}
    style={[
      styles.addGuestsPill,
      {
        backgroundColor: isDark ? 'rgba(108,99,255,0.16)' : '#EEF2FF',
        borderColor: isDark ? 'rgba(108,99,255,0.35)' : '#C7D2FE',
      },
    ]}
  >
    <View style={[styles.addGuestsIcon, { backgroundColor: C.primary }]}>
      <Text style={{ color: '#fff', fontWeight: '900' }}>＋</Text>
    </View>

    <Text style={[styles.addGuestsText, { color: C.text }]}>הוסף מוזמנים</Text>

    <View style={{ marginLeft: 'auto' }}>
      <Text style={{ color: C.subText, fontWeight: '900', fontSize: 12 }}>
        {selectedTable.guests ? selectedTable.guests.length : 0}/{selectedTable.size}
      </Text>
    </View>
  </TouchableOpacity>
</View>


                <FlatList
                  data={selectedTable.guests || []}
                  keyExtractor={(item) => item.recordID}
                  style={{ flex: 1, width: '100%' }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={[styles.guestRowItem, { backgroundColor: C.soft, borderColor: C.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.statusDot, { backgroundColor: getGuestColor(item.recordID) }]} />
                        <Text style={[styles.guestNameList, { color: C.text }]} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteGuestFromTable(item.recordID)} activeOpacity={0.85}>
                        <Text style={{ color: C.danger, fontWeight: '900' }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={[styles.emptyTextSmall, { color: C.muted }]}>השולחן ריק</Text>}
                />

                <View style={styles.editFooter}>
  {/* ✅ כפתור מחיקה מעוצב - FULL WIDTH */}
  <TouchableOpacity
    onPress={deleteTable}
    activeOpacity={0.9}
    style={[
      styles.deleteTableBtn,
      {
        backgroundColor: isDark ? 'rgba(239,83,80,0.14)' : '#FFEBEE',
        borderColor: isDark ? 'rgba(239,83,80,0.30)' : '#FFCDD2',
      },
    ]}
  >
    <View style={[styles.deleteTableIcon, { backgroundColor: C.danger }]}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>🗑️</Text>
    </View>

    <View style={{ flex: 1 }}>
      <Text style={[styles.deleteTableTitle, { color: C.danger }]}>מחק שולחן</Text>
      <Text style={[styles.deleteTableSub, { color: isDark ? 'rgba(159,176,204,0.9)' : C.subText }]}>
        פעולה זו תסיר את השולחן וכל השיבוצים שבו
      </Text>
    </View>
  </TouchableOpacity>

  {/* ✅ כפתור סגור גדול, נשאר בתוך המסגרת */}
  <TouchableOpacity
    onPress={() => setEditModalVisible(false)}
    activeOpacity={0.9}
    style={[
      styles.closeBigBtn,
      {
        backgroundColor: C.soft,
        borderColor: C.border,
      },
    ]}
  >
    <Text style={{ color: C.text, fontWeight: '900' }}>סגור</Text>
  </TouchableOpacity>
</View>

              </>
            )}
          </View>
        </View>
      </Modal>

      {/* =========================
          MODAL 2.1: Add Guests (separate modal)
         ========================= */}
      <Modal visible={addGuestsModalVisible} transparent animationType="fade" onRequestClose={() => setAddGuestsModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: C.card2,
                borderColor: C.border,
                shadowColor: C.shadow,
                maxHeight: isDesktopWeb ? 640 : 560,
                maxWidth: 520,
              },
            ]}
          >
            <View style={styles.modalTopBar}>
              <Text style={[styles.modalTitle, { color: C.text }]}>בחירת אורחים להוספה</Text>
              <TouchableOpacity onPress={() => setAddGuestsModalVisible(false)} style={styles.modalX} activeOpacity={0.85}>
                <Text style={{ color: C.subText, fontSize: 18, fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={inputCommon()}
              placeholder="חפש..."
              value={searchContactText}
              onChangeText={setSearchContactText}
              placeholderTextColor={C.placeholder}
              textAlign="right"
            />

            <View style={{ flex: 1, width: '100%', marginTop: 10 }}>
              <FlatList
                data={filteredModalContacts}
                keyExtractor={(c) => c.recordID}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSel = selectedContacts.includes(item.recordID);
                  const alreadyInTable = selectedTable?.guests?.some((g) => g.recordID === item.recordID);
                  if (alreadyInTable) return null;

                  return (
                    <TouchableOpacity
                      onPress={() => toggleSelectContact(item.recordID)}
                      style={[
                        styles.selectRow,
                        {
                          backgroundColor: isSel ? (isDark ? 'rgba(108,99,255,0.16)' : '#F3F2FF') : 'transparent',
                          borderBottomColor: C.borderSoft,
                        },
                      ]}
                      activeOpacity={0.86}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.statusDot, { backgroundColor: getGuestColor(item.recordID) }]} />
                        <Text style={[styles.selectText, { color: C.text, fontWeight: isSel ? '900' : '700' }]} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                      </View>
                      {isSel && <Text style={{ color: C.primary, fontWeight: '900' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.soft, borderColor: C.border }]}
                onPress={() => setAddGuestsModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextCancel, { color: C.text }]}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={saveGuestsToTable}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextPrimary, { color: '#fff' }]}>הוסף נבחרים ({selectedContacts.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================
          MODAL 3: Delete All
         ========================= */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: C.card2, borderColor: C.border, shadowColor: C.shadow, maxWidth: 360 }]}>
            <View style={styles.modalTopBar}>
              <Text style={[styles.modalTitle, { color: C.danger }]}>מחיקת הכל</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalX} activeOpacity={0.85}>
                <Text style={{ color: C.subText, fontSize: 18, fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ textAlign: 'center', marginBottom: 18, color: C.text, lineHeight: 20, fontWeight: '700' }}>
              פעולה זו תמחק את כל השולחנות והשיבוצים.
              {'\n'}
              האם להמשיך?
            </Text>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.soft, borderColor: C.border }]}
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextCancel, { color: C.text }]}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.danger, borderColor: C.danger }]}
                onPress={deleteAllTables}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnTextPrimary, { color: '#fff' }]}>מחק הכל</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
header: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 16,
  borderBottomWidth: 1,
},

  headerTitle: { fontSize: 20, fontWeight: '900' },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 22, fontWeight: '900' },

  // Layout
  mainContent: { flex: 1, flexDirection: 'column' },
  rowLayout: { flexDirection: 'row-reverse', padding: 20 },
  controlPanel: { padding: 16 },
  listPanel: { flex: 1, padding: 16 },

  // Actions
  actionGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginBottom: 16 },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
    marginLeft: 10,
  },
  actionBtnText: { fontWeight: '800', fontSize: 13 },
  actionBtnIcon: { fontSize: 16 },

  // Image Box
  imageBox: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    position: 'relative',
  },
  floorPlanImage: { width: '100%', height: '100%' },
  placeholderContent: { alignItems: 'center' },
  placeholderText: { marginTop: 10, fontWeight: '800' },
  deleteImgBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 20,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  progressBar: { width: '60%', height: 6, marginTop: 10, borderRadius: 3, overflow: 'hidden' },

  // List
  searchInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    writingDirection: 'rtl',
  },
  listHeader: { marginBottom: 10, flexDirection: 'row-reverse' },
  listTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { textAlign: 'center', marginTop: 40, fontWeight: '800' },

  // Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  tableIcon: { width: 32, height: 32, resizeMode: 'contain' },
  cardTitle: { fontSize: 16, fontWeight: '900', textAlign: 'right' },
  cardSubTitle: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
  cardMeta: { fontSize: 11, fontWeight: '800', textAlign: 'right', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '900' },

  // Chips Preview
  guestChipsWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  guestChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  guestChipText: { fontSize: 12, fontWeight: '900', maxWidth: 140 },
  guestChipStatus: { fontSize: 11, fontWeight: '800', marginRight: 8, maxWidth: 70 },
  moreChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
    marginBottom: 8,
  },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
    alignItems: 'center',
  },
  modalTopBar: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalX: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnTop: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },

  label: { fontSize: 13, fontWeight: '900', marginBottom: 8, marginTop: 12, textAlign: 'right', width: '100%' },
  miniLabel: { fontSize: 12, fontWeight: '900', marginBottom: 6, textAlign: 'right' },

  inputBase: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'right',
    fontWeight: '800',
    writingDirection: 'rtl',
  },

  grid: { width: '100%', flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 4 },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginLeft: 10,
    marginBottom: 10,
  },
  gridIcon: { width: 32, height: 32, resizeMode: 'contain', marginBottom: 6 },
  gridText: { fontSize: 12, textAlign: 'center', fontWeight: '900' },

  modalFooter: { width: '100%', flexDirection: 'row-reverse', marginTop: 14 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, marginLeft: 10 },
  btnTextPrimary: { fontWeight: '900' },
  btnTextCancel: { fontWeight: '900' },

  // Mini list
  miniListContainer: { width: '100%', borderWidth: 1, borderRadius: 14, padding: 10 },
  selectRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 10,
  },
  selectText: { fontSize: 14, marginLeft: 8, textAlign: 'right', maxWidth: 240 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },

  // Edit fields (✅ fixed)
  editFieldRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  editFieldInput: {
    flex: 1,
    minWidth: 0, // ✅ הכי חשוב כדי שלא ייחתך
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  saveIconBtn: { padding: 10, borderRadius: 10 },

  divider: { height: 1, width: '100%', marginVertical: 14 },
  smallAddBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },

  guestRowItem: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  guestNameList: { fontSize: 14, fontWeight: '900', marginLeft: 8, flex: 1 },
  emptyTextSmall: { textAlign: 'center', fontSize: 12, padding: 10, fontWeight: '900' },

  // Toast
  toastWrap: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 14,
    left: 12,
    right: 12,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toastTitle: { fontWeight: '900', fontSize: 13, textAlign: 'right' },
  toastMsg: { marginTop: 4, fontWeight: '800', fontSize: 12, textAlign: 'right' },
  deleteTableBtn: {
  width: '100%',
  flexDirection: 'row-reverse',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 14,
  borderWidth: 1,
  marginTop: 10,
},
deleteTableIcon: {
  width: 34,
  height: 34,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
deleteTableTitle: {
  fontWeight: '900',
  fontSize: 14,
  textAlign: 'right',
},
deleteTableSub: {
  marginTop: 2,
  fontWeight: '800',
  fontSize: 11,
  textAlign: 'right',
  lineHeight: 15,
},
editFooter: {
  width: '100%',
  marginTop: 12,
  gap: 10,
},

closeBigBtn: {
  width: '100%',
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: 'center',
  borderWidth: 1,
},

deleteTableBtn: {
  width: '100%',
  flexDirection: 'row-reverse',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 14,
  borderWidth: 1,
},
deleteTableIcon: {
  width: 34,
  height: 34,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
deleteTableTitle: {
  fontWeight: '900',
  fontSize: 14,
  textAlign: 'right',
},
deleteTableSub: {
  marginTop: 2,
  fontWeight: '800',
  fontSize: 11,
  textAlign: 'right',
  lineHeight: 15,
},

addGuestsPill: {
  width: '100%',
  flexDirection: 'row-reverse',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 12,
  paddingHorizontal: 12,
  borderRadius: 16,
  borderWidth: 1,
},
addGuestsIcon: {
  width: 32,
  height: 32,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
addGuestsText: {
  fontWeight: '900',
  fontSize: 14,
  textAlign: 'right',
},
  // ===== Header (like Management) =====
  headerMgmt: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,

    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,

    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 4,
  },
  headerSide: {
    width: 96,          // אפשר לשחק 80-110 אם בא לך
    alignItems: 'flex-start',
  },
  headerBackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  headerBackText: {
    fontSize: 13,
    fontWeight: '900',
  },
  headerTitleMgmt: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.4,
  },


});

export default SeatedAtTable;
