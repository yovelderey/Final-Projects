import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  PermissionsAndroid,
  StatusBar,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';

import { ref, remove, set, onValue, update, push } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../firebase'; // ודא נתיב נכון

const Management = (props) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const id = props.route.params.id;

  // נתונים עיקריים
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);

  // חיפוש במסך הראשי
  const [searchQuery, setSearchQuery] = useState('');

  // מודל “הוספה ידנית”
  const [manualVisible, setManualVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');

  // תמונות מדריך (בתיקיית assets)
  const onepic   = require('../assets/onepic.png');
  const twopic   = require('../assets/twopic.png');
  const threepic = require('../assets/threepic.png');
  const fourpic  = require('../assets/fourpic.png');

  // מודל אופציות ייבוא
  const [importOptionsVisible, setImportOptionsVisible] = useState(false);

  // מודל אישור “מחק הכל” (ל־Web)
  const [confirmDeleteAllVisible, setConfirmDeleteAllVisible] = useState(false);

  // סיכום ייבוא (Excel/vCard/Contact Picker)
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  // מודל מדריך
  const [guideVisible, setGuideVisible] = useState(false);

  // תמיכת Contact Picker בדפדפן (אנדרואיד כרום/כרומיום)
  const isContactPickerSupported =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    navigator.contacts &&
    typeof navigator.contacts.select === 'function';

  // ===== מודל vCard =====
  const [vcfModalVisible, setVcfModalVisible] = useState(false);
  const [vcfContacts, setVcfContacts] = useState([]); // [{id, name, phone}]
  const [vcfSearch, setVcfSearch] = useState('');
  const [isLoadingVcf, setIsLoadingVcf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // בחירות עם useRef כדי למנוע מירוצים
  const [selectedIds, setSelectedIds] = useState(new Set()); // Set<number | string>
  const selectedIdsRef = useRef(selectedIds);
  const setSelectedAndRef = (nextSet) => {
    selectedIdsRef.current = nextSet;
    setSelectedIds(nextSet);
  };

  // ------------------------------------------------------------
  // הרשאות + סאבסקריפשן ל־Firebase
  // ------------------------------------------------------------
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'האפליקציה צריכה גישה לאנשי הקשר שלך.',
            buttonPositive: 'אישור',
            buttonNegative: 'ביטול',
          }
        );
      }

      onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) {
          setUser(null);
          setContacts([]);
          return;
        }
        setUser(currentUser);

        const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/contacts`);
        onValue(databaseRef, (snapshot) => {
          const data = snapshot.val();
          const arr = data ? Object.values(data) : [];
          setContacts(arr);

          // תחזוקת קאונטר אנשי קשר
          set(
            ref(database, `Events/${currentUser.uid}/${id}/counter_contacts`),
            arr.length
          );
        });
      });
    };

    requestPermissions();
  }, [id]);

  // ------------------------------------------------------------
  // עזרים: טלפון + vCard
  // ------------------------------------------------------------
  const normalizeTel = (s) => {
    if (!s) return '';
    let t = s.replace(/[^\d+]/g, ''); // משאיר ספרות ו-+
    t = t.replace(/(?!^)\+/g, '');    // מסיר + פנימיים
    return t;
  };

  const parseVCardText = (text) => {
    if (!text) return [];
    // ביטול folding
    const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    // פיצול לכרטיסים
    const cards = unfolded.split(/BEGIN:VCARD/i).slice(1).map(s => 'BEGIN:VCARD' + s);
    const out = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const nameMatch =
        card.match(/^FN(?:;[^:]+)?:([^\r\n]+)/mi) ||
        card.match(/^N(?:;[^:]+)?:([^\r\n]+)/mi);
      const name = nameMatch ? nameMatch[1].trim() : '';

      const telMatches = [...card.matchAll(/^TEL(?:(;[^:]+))?:([^\r\n]+)/gmi)];
      if (telMatches.length === 0) {
        out.push({ id: i, name, phone: '' });
        continue;
      }
      const lines = telMatches.map(m => ({ meta: m[1] || '', value: m[2] }));
      const chosen = lines.find(l => /PREF/i.test(l.meta)) ||
                     lines.find(l => /CELL|MOBILE/i.test(l.meta)) ||
                     lines[0];
      const phone = normalizeTel(chosen.value);
      out.push({ id: i, name, phone });
    }
    return out;
  };

  // ------------------------------------------------------------
  // CRUD בסיסי
  // ------------------------------------------------------------
  const addManualContact = async () => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }
    if (!newContactName.trim() || !selectedPrefix.trim() || !newContactPhone.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }
    const fullPhone = normalizeTel(`${selectedPrefix}${newContactPhone}`);
    const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
    const newKey = push(contactsRef).key;

    await set(ref(database, `Events/${user.uid}/${id}/contacts/${newKey}`), {
      recordID: newKey,
      displayName: newContactName.trim(),
      phoneNumbers: fullPhone,
    });

    setManualVisible(false);
    setNewContactName('');
    setNewContactPhone('');
    setSelectedPrefix('');
  };

  const deleteContact = async (contactId) => {
    if (!user) {
      Alert.alert('שגיאה', 'משתמש לא מחובר');
      return;
    }
    try {
      await remove(ref(database, `Events/${user.uid}/${id}/contacts/${contactId}`));
    } catch (error) {
      console.error('Error deleting contact from Firebase:', error);
      Alert.alert('Error', 'Failed to delete contact. Please try again.');
    }
  };

  const deleteAllContacts = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated. Please log in.');
      return;
    }
    try {
      await remove(ref(database, `Events/${user.uid}/${id}/contacts`));
    } catch (error) {
      console.error('Error deleting all contacts from Firebase:', error);
      Alert.alert('Error', 'Failed to delete all contacts. Please try again.');
    }
  };

  const showDeleteAllAlert = () => {
    if (Platform.OS === 'web') {
      setConfirmDeleteAllVisible(true);
    } else {
      Alert.alert(
        'הסר הכל',
        'האם אתה בטוח שברצונך להסיר את כל המוזמנים?',
        [
          { text: 'הסר', onPress: () => deleteAllContacts(), style: 'destructive' },
          { text: 'ביטול', onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  // ------------------------------------------------------------
  // ייבוא: Contact Picker (נייטיב)
  // ------------------------------------------------------------
  const pickContactsNative = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('שגיאה', 'אין הרשאה לגשת לאנשי קשר');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      if (!data?.length) {
        Alert.alert('שגיאה', 'לא נמצאו אנשי קשר');
        return;
      }
      navigation.navigate('ContactsList', {
        contacts: data,
        selectedContacts: [],
        onSelectContacts: async (picked) => {
          if (!user) return;
          const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
          const updates = {};
          let count = 0;

          picked.forEach((c) => {
            const tel = c.phoneNumbers?.[0]?.number ? normalizeTel(c.phoneNumbers[0].number) : '';
            if (!tel) return;
            const k = push(contactsRef).key;
            updates[k] = {
              recordID: k,
              displayName: c.name || 'ללא שם',
              phoneNumbers: tel,
            };
            count++;
          });

          if (count > 0) await update(contactsRef, updates);
        },
      });
    } catch (error) {
      console.error('שגיאה בבקשת הרשאות/ייבוא:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת ייבוא אנשי הקשר');
    }
  };

  // ------------------------------------------------------------
  // ייבוא: Contact Picker API (Web / אנדרואיד כרום)
  // ------------------------------------------------------------
  const importFromContactPickerWeb = async () => {
    if (!isContactPickerSupported) {
      setSummaryText('⚠️ הדפדפן לא תומך בייבוא ישיר. ניתן להשתמש ב־vCard/Excel.');
      setSummaryVisible(true);
      return;
    }
    if (!user) {
      setSummaryText('⚠️ יש להתחבר לפני הייבוא.');
      setSummaryVisible(true);
      return;
    }

    try {
      // פתיחת בורר אנשי קשר (חייב מחוות משתמש)
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked?.length) {
        setSummaryText('לא נבחרו אנשי קשר.');
        setSummaryVisible(true);
        return;
      }

      // דה-דופ + סינון על סמך אנשי קשר שכבר קיימים ב-Firebase/state
      const existingSet = new Set(
        (contacts || [])
          .map(c => normalizeTel(c.phoneNumbers))
          .filter(Boolean)
      );

      const seenSession = new Set();
      const rows = [];
      let skippedNoTel = 0;
      let skippedDupSession = 0;
      let skippedDupExisting = 0;

      for (const c of picked) {
        const name = Array.isArray(c.name) ? c.name[0] : (c.name || 'ללא שם');
        const telRaw = Array.isArray(c.tel) ? c.tel[0] : c.tel;
        if (!telRaw) { skippedNoTel++; continue; }
        const tel = normalizeTel(telRaw);
        if (!tel) { skippedNoTel++; continue; }

        if (seenSession.has(tel)) { skippedDupSession++; continue; }
        if (existingSet.has(tel)) { skippedDupExisting++; continue; }

        seenSession.add(tel);
        rows.push({ name, tel });
      }

      if (!rows.length) {
        let msg = 'לא נוספו אנשי קשר חדשים.';
        if (skippedDupExisting > 0) msg += `\n(${skippedDupExisting} כבר קיימים)`;
        setSummaryText('ℹ️ ' + msg);
        setSummaryVisible(true);
        return;
      }

      // כתיבה מרוכזת ל-Firebase
      const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      const updatesObj = {};
      rows.forEach(({ name, tel }) => {
        const k = push(contactsRef).key;
        updatesObj[k] = { recordID: k, displayName: name, phoneNumbers: tel };
      });
      await update(contactsRef, updatesObj);

      // פידבק למשתמש
      let message = `✅ נוספו ${rows.length} אנשי קשר מהמכשיר.`;
      const extras = [];
      if (skippedNoTel) extras.push(`${skippedNoTel} ללא מספר`);
      if (skippedDupSession) extras.push(`${skippedDupSession} כפולים באותה בחירה`);
      if (skippedDupExisting) extras.push(`${skippedDupExisting} כבר קיימים`);
      if (extras.length) message += `\nℹ️ דילגנו על: ${extras.join(' | ')}`;

      setSummaryText(message);
      setSummaryVisible(true);
    } catch (err) {
      // טיפול בשגיאות טיפוסיות
      let msg = 'ייבוא דרך בורר אנשי קשר נחסם/נכשל.';
      if (err?.name === 'NotAllowedError') {
        msg = 'הדפדפן חסם את הגישה לאנשי קשר. ודא שהאתר ב־HTTPS, ושהוא לא נטען בתוך iframe ללא הרשאת contact-picker.';
      } else if (err?.name === 'NotFoundError') {
        msg = 'לא נמצאו אנשי קשר או שהפעולה בוטלה.';
      }
      setSummaryText('⚠️ ' + msg);
      setSummaryVisible(true);
    }
  };

  // ------------------------------------------------------------
  // ייבוא: vCard – פתיחת מודל + טעינת קובץ
  // ------------------------------------------------------------
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
      if (result.canceled) {
        setIsLoadingVcf(false);
        return;
      }

      const fileUri = result.assets?.[0]?.uri;
      let text = '';
      if (Platform.OS === 'web') {
        const res = await fetch(fileUri);
        text = await res.text();
      } else {
        text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      }

      const entries = parseVCardText(text).filter(e => e.phone);
      setVcfContacts(entries);
      setSelectedAndRef(new Set());
    } catch (e) {
      console.error(e);
      Alert.alert('שגיאה', 'קריאת קובץ vCard נכשלה. ודא שהקובץ תקין.');
    } finally {
      setIsLoadingVcf(false);
    }
  };

  // בחירה/ביטול של פריט
  const toggleSelect = (rowId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      selectedIdsRef.current = next;
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(vcfContacts.map((c) => c.id));
    setSelectedAndRef(all);
  };

  const clearAll = () => {
    setSelectedAndRef(new Set());
  };

  // רשימה מסוננת במודל vCard
  const filteredVcf = vcfContacts.filter((c) => {
    const q = (vcfSearch || '').toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });

  // ייבוא מרוכז ל-Firebase
  const importSelectedVcf = async () => {
    if (!user) return;

    const pickedIds = Array.from(selectedIdsRef.current);
    if (pickedIds.length === 0) {
      Alert.alert('שים לב', 'לא נבחרו אנשי קשר');
      return;
    }

    setIsImporting(true);
    try {
      const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      const updatesObj = {};
      let success = 0;

      const mapById = new Map(vcfContacts.map((c) => [c.id, c]));
      pickedIds.forEach((rid) => {
        const c = mapById.get(rid);
        if (!c?.phone) return;
        const k = push(contactsRef).key;
        updatesObj[k] = {
          recordID: k,
          displayName: c.name || 'ללא שם',
          phoneNumbers: c.phone,
        };
        success++;
      });

      if (success > 0) {
        await update(contactsRef, updatesObj);
      }

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
  };

  // ------------------------------------------------------------
  // Excel
  // ------------------------------------------------------------
  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i);
    return buf;
  }

  const downloadExcelTemplate = async () => {
    const data = [
      { שם: 'דני דוגמה', טלפון: '0501234567' },
      { שם: 'רותי דוגמה', טלפון: '0527654321' },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מוזמנים');
    const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });

    if (Platform.OS === 'web') {
      const blob = new Blob([s2ab(wbout)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const uri = FileSystem.documentDirectory + 'template.xlsx';
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('שגיאה', 'שיתוף לא נתמך במכשיר שלך');
      }
    }
  };

  const uploadExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      const fileUri = result.assets?.[0]?.uri;
      if (!result.canceled && fileUri) {
        let workbook;
        if (Platform.OS === 'web') {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          workbook = XLSX.read(arrayBuffer, { type: 'array' });
        } else {
          const b64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          workbook = XLSX.read(b64, { type: 'base64' });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const errors = [];
        let successCount = 0;

        for (let idx = 0; idx < data.length; idx++) {
          const row = data[idx];
          if (!row || typeof row !== 'object') {
            errors.push(`שורה ${idx + 2} ריקה או לא תקינה`);
            continue;
          }
          let name = row['שם'];
          let phone = row['טלפון'];
          if (typeof name === 'number') name = name.toString();
          if (typeof phone === 'number') phone = phone.toString();

          if (typeof name !== 'string' || name.trim() === '') {
            errors.push(`שורה ${idx + 2} - חסר שם`);
            continue;
          }
          if (typeof phone !== 'string' || phone.trim() === '') {
            errors.push(`שורה ${idx + 2} - חסר מספר טלפון`);
            continue;
          }
          const phoneClean = normalizeTel(phone);
          if (!/^\+?\d{7,15}$/.test(phoneClean)) {
            errors.push(`שורה ${idx + 2} - מספר טלפון לא תקין`);
            continue;
          }

          if (!user) continue;
          const k = push(ref(database, `Events/${user.uid}/${id}/contacts`)).key;
          await set(ref(database, `Events/${user.uid}/${id}/contacts/${k}`), {
            recordID: k,
            displayName: (name || '').trim(),
            phoneNumbers: phoneClean,
          });
          successCount++;
        }

        let message = `✅ ${successCount} מוזמנים הועלו בהצלחה.`;
        if (errors.length > 0) {
          message += `\n\n❌ ${errors.length} שורות נכשלו:\n${errors.join('\n')}`;
        }
        setSummaryText(message);
        setSummaryVisible(true);
      }
    } catch (error) {
      console.error('❌ שגיאה בקריאת קובץ:', error);
      setSummaryText('⚠️ לא הצלחנו לקרוא את הקובץ. ודא שהוא בפורמט תקין.');
      setSummaryVisible(true);
    }
  };

  // ------------------------------------------------------------
  // UI עיקרי
  // ------------------------------------------------------------
  const filteredContacts = contacts.filter((c) => {
    const n = (c.displayName || '').toLowerCase();
    const p = (c.phoneNumbers || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    return n.includes(q) || p.includes(q);
  });

  const renderItem = ({ item, index }) => (
    <View style={[styles.itemContainer, { backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#ffffff' }]}>
      <TouchableOpacity onPress={() => deleteContact(item.recordID)}>
        <Image source={require('../assets/delete.png')} style={styles.deleteIcon} />
      </TouchableOpacity>
      <View style={{ flex: 1, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={styles.itemText}>{item.displayName}</Text>
          <Text style={styles.itemText}>{item.phoneNumbers}</Text>
        </View>
      </View>
    </View>
  );

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <ImageBackground source={require('../assets/backgruondcontact.png')} style={styles.background}>
      <StatusBar backgroundColor="#6C63FF" barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ניהול אורחים</Text>
      </View>

      <View style={styles.container}>
        {contacts.length === 0 ? (
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>אין פריטים להצגה</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="חפש מוזמנים"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <View style={styles.rowContainer}>
              <Text style={styles.textPrice}>מספר מוזמנים {contacts.length}</Text>

              <TouchableOpacity style={styles.deleteAllButton} onPress={showDeleteAllAlert}>
                <Text style={styles.deleteAllButtonText}>הסר הכל</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredContacts}
              renderItem={renderItem}
              keyExtractor={(item) => item.recordID}
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}

        {/* כפתור מרכזי – הוסף מוזמנים */}
        <View style={styles.topB}>
          <TouchableOpacity style={styles.mainButton} onPress={() => setImportOptionsVisible(true)}>
            <Text style={styles.mainButtonText}>הוסף מוזמנים +</Text>
          </TouchableOpacity>
        </View>

        {/* מודל אופציות ייבוא */}
        <Modal
          visible={importOptionsVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setImportOptionsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>בחר אפשרות ייבוא</Text>

              {/* הוספה ידנית */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setManualVisible(true);
                  setImportOptionsVisible(false);
                }}
              >
                <Text style={styles.optionButtonText}>הוסף מספר ידני</Text>
              </TouchableOpacity>

              {/* Contact Picker Web */}
              {Platform.OS === 'web' && isContactPickerSupported && (
                <TouchableOpacity style={styles.optionButton} onPress={importFromContactPickerWeb}>
                  <Text style={styles.optionButtonText}>ייבא ממכשירי אנדרואיד</Text>
                </TouchableOpacity>
              )}


              {/* מרווח וסעיף ברור ל-iCloud */}
              <View style={styles.sectionSpacer} />
              <Text style={styles.sectionTitle}>ייבוא מקובץ iCloud - אייפון (vCard)</Text>
              <TouchableOpacity
                style={[styles.optionButtonGreen, styles.icloudButton]}
                onPress={() => {
                  setImportOptionsVisible(false);
                  openVcfModal();
                }}
              >
                <Text style={styles.optionButtonText}>פתח מודל וייבא מ-iCloud (vCard)</Text>
              </TouchableOpacity>

              {/* מפריד ברור בין vCard ל-Excel */}
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>ייבוא/ייצוא דרך Excel</Text>

              <TouchableOpacity style={styles.optionButtonGreen} onPress={downloadExcelTemplate}>
                <Text style={styles.optionButtonText}>הורד טמפלייט מוזמנים באקסל</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionButtonGreen} onPress={uploadExcelFile}>
                <Text style={styles.optionButtonText}>העלה קובץ אקסל</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={() => setImportOptionsVisible(false)}>
                <Text style={styles.closeButtonText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* מודל vCard: העלאה + בחירה + חיפוש + מונים */}
        <Modal
          visible={vcfModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setVcfModalVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.vcfCard}>
              {/* כפתור מדריך — פותח מודל עם גלילה */}
              <View style={styles.guideRow}>
                <TouchableOpacity
                  style={styles.guideBtn}
                  onPress={() => setGuideVisible(true)}
                >
                  <Text style={styles.guideBtnText}>מדריך ליצירת הקובץ</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.vcfTitle}>ייבוא מ-iCloud (vCard)</Text>

              <TouchableOpacity style={styles.chooseFileBtn} onPress={pickVcfFile} disabled={isLoadingVcf}>
                <Text style={styles.chooseFileBtnText}>
                  {isLoadingVcf ? 'טוען…' : 'בחר קובץ vCard'}
                </Text>
              </TouchableOpacity>

              {/* אזור חיפוש + מונים + פעולות */}
              <View style={{ width: '100%', marginTop: 8 }}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפש בשם/טלפון מתוך הקובץ"
                  value={vcfSearch}
                  onChangeText={setVcfSearch}
                />

                <View style={styles.vcfTopRow}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.smallPill} onPress={selectAll} disabled={!vcfContacts.length}>
                      <Text style={styles.smallPillText}>בחר הכל</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallPill} onPress={clearAll} disabled={!vcfContacts.length}>
                      <Text style={styles.smallPillText}>נקה</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.countersText}>
                    נטענו: {vcfContacts.length} | נבחרו: {selectedIds.size}
                  </Text>
                </View>
              </View>

              {/* רשימה */}
              <View style={styles.vcfListBox}>
                {!vcfContacts.length ? (
                  <View style={{ padding: 12, alignItems: 'center' }}>
                    {isLoadingVcf ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={{ color: '#666' }}>עדיין לא נטען קובץ.</Text>
                    )}
                  </View>
                ) : (
                  <FlatList
                    data={filteredVcf}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item, index }) => {
                      const selected = selectedIds.has(item.id);
                      return (
                        <TouchableOpacity
                          onPress={() => toggleSelect(item.id)}
                          style={[
                            styles.vcfItem,
                            { backgroundColor: index % 2 === 0 ? '#f8f8f8' : '#ffffff' },
                            selected && styles.vcfItemSelected,
                          ]}
                        >
                          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ maxWidth: '85%' }}>
                              <Text style={styles.vcfItemName} numberOfLines={1}>
                                {item.name || 'ללא שם'}
                              </Text>
                              <Text style={styles.vcfItemPhone}>{item.phone}</Text>
                            </View>
                            <View style={[styles.checkbox, selected && styles.checkboxChecked]} />
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    contentContainerStyle={{ paddingVertical: 6 }}
                  />
                )}
              </View>

              {/* פעולות תחתית */}
              <View style={styles.vcfActionsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn2]}
                  onPress={() => setVcfModalVisible(false)}
                  disabled={isImporting}
                >
                  <Text style={styles.modalButtonText2}>סגור</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.importBtn, (isImporting || selectedIds.size === 0) && { opacity: 0.6 }]}
                  onPress={importSelectedVcf}
                  disabled={isImporting || selectedIds.size === 0}
                >
                  <Text style={styles.modalButtonText2}>
                    {isImporting ? 'מייבא…' : 'ייבא נבחרים'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* מודל “הוספה ידנית” */}
        {manualVisible && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle2}>הוסף איש קשר חדש</Text>

              <TextInput
                style={styles.modalInput2}
                placeholder="שם"
                value={newContactName}
                onChangeText={setNewContactName}
              />

              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={[styles.prefixInput, { width: 80 }]}
                  placeholder="קידומת"
                  value={selectedPrefix}
                  keyboardType="numeric"
                  maxLength={3}
                  onChangeText={setSelectedPrefix}
                />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="טלפון"
                  value={newContactPhone}
                  keyboardType="phone-pad"
                  onChangeText={setNewContactPhone}
                />
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={styles.modalButtonCancel2} onPress={() => setManualVisible(false)}>
                  <Text style={styles.modalButtonText2}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalButtonSave2} onPress={addManualContact}>
                  <Text style={styles.modalButtonText2}>שמור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* מודל אישור מחיקת הכל – לדפדפן */}
        {confirmDeleteAllVisible && (
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle2}>האם למחוק את כל המוזמנים?</Text>
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalButtonCancel2}
                  onPress={() => setConfirmDeleteAllVisible(false)}
                >
                  <Text style={styles.modalButtonText2}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonSave2}
                  onPress={() => {
                    deleteAllContacts();
                    setConfirmDeleteAllVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText2}>מחק</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* סיכום ייבוא */}
        <Modal
          visible={summaryVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSummaryVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={[styles.modalCard, { width: '85%' }]}>
              <Text style={styles.modalTitle2}>סיכום ייבוא</Text>
              <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
                <Text style={{ textAlign: 'right', lineHeight: 24 }}>{summaryText}</Text>
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalButtonSave2, styles.modalButtonWide]}
                onPress={() => setSummaryVisible(false)}
              >
                <Text style={styles.modalButtonText2}>הבנתי</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* מודל המדריך עם גלילה */}
        <Modal
          visible={guideVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setGuideVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <Text style={styles.guideTitle}>מדריך ייבוא מ־iCloud (vCard)</Text>
                <TouchableOpacity style={styles.guideClose} onPress={() => setGuideVisible(false)}>
                  <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.guideBody} contentContainerStyle={{ padding: 14, gap: 16 }}>
                <View style={styles.guideStep}>
                  <Text style={styles.guideStepTitle}>1) כניסה ל־iCloud</Text>
                  <Image source={onepic} style={styles.guideImage} resizeMode="contain" />
                  <Text style={styles.guideStepText}>גלוש ל־iCloud.com, התחבר וחפש Contacts.</Text>
                </View>

                <View style={styles.guideStep}>
                  <Text style={styles.guideStepTitle}>2) תבחר ב־Contacts</Text>
                  <Image source={twopic} style={styles.guideImage} resizeMode="contain" />
                  <Text style={styles.guideStepText}>ייפתח חלון שבו כל אנשי הקשר שלך.</Text>
                </View>

                <View style={styles.guideStep}>
                  <Text style={styles.guideStepTitle}>3) ייצוא אנשי קשר</Text>
                  <Image source={threepic} style={styles.guideImage} resizeMode="contain" />
                  <Text style={styles.guideStepText}>בחר "Select All" ואז Export vCard. הקובץ יישמר למכשיר.</Text>
                </View>

                <View style={styles.guideStep}>
                  <Text style={styles.guideStepTitle}>4) ייבוא לאפליקציה</Text>
                  <Image source={fourpic} style={styles.guideImage} resizeMode="contain" />
                  <Text style={styles.guideStepText}>כאן לחץ "בחר קובץ vCard", סמן את הרצויים וייבא.</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  // מסך כללי
  background: { flex: 1, resizeMode: 'cover', backgroundColor: '#fff' },
  container: { flex: 1, padding: 16 },

  header: {
    width: '100%',
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: { position: 'absolute', left: 20, bottom: 20 },
  backButtonText: { fontSize: 29, color: 'white' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },

  // רשימה
  tableContainer: { flex: 1 },
  listContent: { paddingBottom: 20 },
  searchInput: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  textPrice: {
    right: 0,
    fontSize: 16,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'right',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  deleteAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'red',
    borderRadius: 5,
  },
  deleteAllButtonText: { color: '#fff', fontSize: 12 },

  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 18,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deleteIcon: { width: 24, height: 24, marginRight: 12 },
  itemText: { fontSize: 16, color: '#333', textAlign: 'right' },

  // כפתור ראשי
  topB: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
  mainButton: {
    backgroundColor: '#28A745',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '70%',
    maxWidth: 420,
  },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // מודל אופציות
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalContent: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  optionButton: {
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 6,
    marginVertical: 6,
    width: '100%',
  },
  optionButtonGreen: {
    padding: 10,
    backgroundColor: '#28A745',
    borderRadius: 6,
    marginVertical: 6,
    width: '100%',
  },
  optionButtonText: { color: '#FFFFFF', textAlign: 'center', fontSize: 16 },
  closeButton: { marginTop: 12, padding: 10, backgroundColor: '#808080', borderRadius: 6, width: '100%' },
  closeButtonText: { color: '#FFFFFF', textAlign: 'center', fontSize: 16 },

  // מפרידים וסעיפים באופציות
  sectionSpacer: { height: 6 },
  sectionTitle: { alignSelf: 'flex-end', width: '100%', textAlign: 'right', marginTop: 4, marginBottom: 4, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e9e9e9', alignSelf: 'stretch', marginVertical: 10 },
  icloudButton: { marginTop: 6 },

  // Overlay כללי
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 10,
  },
  modalCard: {
    width: '85%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },

  // “הוספה ידנית”
  modalTitle2: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalInput2: {
    width: '100%',
    height: 42,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    textAlign: 'right',
    backgroundColor: '#fff',
  },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  prefixInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
  },
  phoneInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    textAlign: 'right',
  },
  modalButtonsRow: { flexDirection: 'row', width: '100%', gap: 8 },
  modalButtonCancel2: {
    flex: 1,
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonSave2: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,   // טיפה יותר גבוה
    alignItems: 'center',
  },
  modalButtonText2: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // vCard Modal
  vcfCard: {
    width: '92%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  guideRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  guideBtn: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  guideBtnText: { color: '#fff', fontWeight: '600' },

  vcfTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 6 },
  chooseFileBtn: {
    backgroundColor: '#28A745',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  chooseFileBtnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },

  vcfTopRow: {
    marginTop: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallPill: {
    backgroundColor: '#eee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  smallPillText: { fontWeight: '600' },
  countersText: { color: '#444' },

  vcfListBox: {
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fff',
    maxHeight: 380,
    overflow: 'hidden',
  },
  vcfItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  vcfItemSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  vcfItemName: { fontWeight: '700', color: '#333' },
  vcfItemPhone: { color: '#666', marginTop: 2 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#bbb',
  },
  checkboxChecked: {
    backgroundColor: '#28A745',
    borderColor: '#28A745',
  },

  vcfActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  cancelBtn2: {
    flex: 1,
    backgroundColor: '#808080',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  importBtn: {
    flex: 1,
    backgroundColor: '#28A745',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },

  // מדריך – מודל גלילה
  guideCard: {
    width: '92%',
    maxWidth: 760,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    elevation: 8,
  },
  guideHeader: {
    backgroundColor: '#6C63FF',
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  guideClose: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  guideBody: { alignSelf: 'stretch', maxHeight: 420 },
  guideStep: { gap: 8 },
  guideStepTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  guideStepText: { fontSize: 14, color: '#444', textAlign: 'right', lineHeight: 22 },
  guideImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#f4f4f7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },

  // כפתור "הבנתי" רחב וגבוה יותר
  modalButtonWide: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 48,
  },

  // ריקון
  noItemsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noItemsText: { fontSize: 20, color: '#000' },
});

export default Management;