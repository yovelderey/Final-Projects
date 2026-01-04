import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ImageBackground,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';

import { ref, set, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../firebase';

const Gift = (props) => {
  const [contacts, setContacts] = useState([]);
  const [user, setUser] = useState(null);

  const id = props.route.params.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [averagePrice, setAveragePrice] = useState(0);
  const [paidGuestsCount, setPaidGuestsCount] = useState(0);

  // ✅ note per guestId (recordID)
  const [giftNotes, setGiftNotes] = useState({}); // { [guestId]: note }

  // ✅ modal for viewing note
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState('');
  const [selectedGuestName, setSelectedGuestName] = useState('');

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'ההרשאה דרושה',
            message: 'אנא אפשר גישה לכתיבה על האחסון',
            buttonNeutral: 'לא להפעיל',
            buttonNegative: 'בטל',
            buttonPositive: 'אישור',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permission to write storage was denied');
        }
      }
    };

    const calculateTotalPrice = (contactsArray) => {
      const total = contactsArray.reduce((sum, contact) => {
        return sum + (parseFloat(contact.newPrice) || 0);
      }, 0);
      setTotalPrice(total);

      const validPrices = contactsArray.filter((contact) => parseFloat(contact.newPrice));
      const average = validPrices.length > 0 ? Math.round(total / validPrices.length) : 0;
      setAveragePrice(average);

      const paidCount = contactsArray.filter((contact) => parseFloat(contact.newPrice) > 0).length;
      setPaidGuestsCount(paidCount);
    };

    let unsubContacts = null;
    let unsubGifts = null;

    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // ✅ Contacts listener
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

        // ✅ Gifts/notes listener
        const giftsRef = ref(database, `Events/${currentUser.uid}/${id}/payments/gifts`);
        unsubGifts = onValue(giftsRef, (snapshot) => {
          const data = snapshot.val();
          if (!data) {
            setGiftNotes({});
            return;
          }

          // תומך גם ב-gifts/{guestId} וגם ב-push keys
          const map = {};
          Object.entries(data).forEach(([key, gift]) => {
            if (!gift || typeof gift !== 'object') return;

            const guestKey = gift.guestId || key; // אם זה push key יש guestId פנימי, אחרת key הוא guestId
            const note = (gift.note ?? '').toString();
            map[guestKey] = note;
          });

          setGiftNotes(map);
        });
      } else {
        setUser(null);
        setContacts([]);
        setGiftNotes({});
        setTotalPrice(0);
        setAveragePrice(0);
        setPaidGuestsCount(0);
      }
    });

    requestPermissions();

    // cleanup
    return () => {
      try { unsubContacts && unsubContacts(); } catch {}
      try { unsubGifts && unsubGifts(); } catch {}
    };
  }, []);

  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; ++i) {
      view[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
  }

  const exportToExcel = async () => {
    try {
      const data = contacts.map((contact) => ({
        שם: contact.displayName,
        טלפון: contact.phoneNumbers,
        מחיר: contact.newPrice || 0,
        ברכה: giftNotes[contact.recordID] || '', // ✅ חדש
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'מוזמנים');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const blob = new Blob([s2ab(wbout)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'מוזמנים.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const fileUri = FileSystem.documentDirectory + 'מוזמנים.xlsx';

        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('שגיאה', 'שיתוף לא נתמך במכשיר שלך');
        }
      }
    } catch (error) {
      console.error('שגיאה ביצוא אקסל:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה ביצוא קובץ אקסל');
    }
  };

  const updatePrice = (recordID, price) => {
    const numericPrice = parseFloat(price) || 0;

    if (numericPrice > 100000) {
      Alert.alert('הגבלת מחיר', 'לא ניתן להזין מחיר גבוה מ-100,000.');
      return;
    }

    if (!user?.uid) return;

    const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordID}`);
    const updatedContacts = contacts.map((contact) =>
      contact.recordID === recordID ? { ...contact, newPrice: price } : contact
    );

    setContacts(updatedContacts);

    const existing = contacts.find((c) => c.recordID === recordID) || {};
    set(databaseRef, { ...existing, newPrice: price });

    const total = updatedContacts.reduce((sum, contact) => {
      return sum + (parseFloat(contact.newPrice) || 0);
    }, 0);
    setTotalPrice(total);
  };

  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = מהגבוה לנמוך, 'asc' = מהנמוך לגבוה
  const sortContactsByPrice = () => {
    const sortedContacts = [...contacts].sort((a, b) => {
      const priceA = parseFloat(a.newPrice) || 0;
      const priceB = parseFloat(b.newPrice) || 0;
      return sortOrder === 'desc' ? priceB - priceA : priceA - priceB;
    });
    setContacts(sortedContacts);
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const name = (contact.displayName || '').toLowerCase();
      const phone = (contact.phoneNumbers || '').toLowerCase();
      const price = (contact.newPrice || '').toString().toLowerCase();
      const note = (giftNotes[contact.recordID] || '').toLowerCase(); // ✅ אפשר גם חיפוש בברכה

      const q = searchQuery.toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        price.includes(q) ||
        note.includes(q)
      );
    });
  }, [contacts, searchQuery, giftNotes]);

  const openNote = (guestName, note) => {
    setSelectedGuestName(guestName || '');
    setSelectedNote(note || '');
    setNoteModalVisible(true);
  };

  const renderItem = ({ item, index }) => {
    const note = giftNotes[item.recordID] || ''; // ✅ note לפי אורח

    return (
      <View
        style={[
          styles.itemContainer,
          { backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#ffffff' },
        ]}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={styles.itemInput}
            placeholder="מחיר"
            keyboardType="numeric"
            value={item.newPrice}
            onChangeText={(text) => updatePrice(item.recordID, text)}
          />

          {/* ✅ כפתור "צפה בברכה" */}
          <TouchableOpacity
            onPress={() => openNote(item.displayName, note)}
            style={[styles.noteBtn, !note ? styles.noteBtnDisabled : null]}
          >
            <Text style={styles.noteBtnText}>{note ? 'צפה בברכה' : 'אין ברכה'}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.itemText}>{item.displayName}</Text>
            <Text style={styles.itemText}>{item.phoneNumbers}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={require('../assets/backgruond_gift.png')} style={styles.backgroundImage}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>רשימת מתנות</Text>
        </View>

        {/* ✅ Modal ברכה */}
        <Modal visible={noteModalVisible} transparent animationType="fade" onRequestClose={() => setNoteModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>ברכה</Text>
              {!!selectedGuestName && <Text style={styles.modalSubTitle}>{selectedGuestName}</Text>}

              <View style={styles.modalNoteBox}>
                <Text style={styles.modalNoteText}>{selectedNote || 'אין ברכה'}</Text>
              </View>

              <TouchableOpacity onPress={() => setNoteModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {contacts.length === 0 ? (
          <View style={styles.noItemsContainer}>
            <Text style={styles.textPrice}>אין פריטים להצגה</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.searchAndSortContainer}>
              <TouchableOpacity onPress={sortContactsByPrice} style={styles.sortButton}>
                <Image
                  source={
                    sortOrder === 'desc'
                      ? require('../assets/sort.png')
                      : require('../assets/sort2.png')
                  }
                  style={styles.sortIcon}
                />
              </TouchableOpacity>

              <TextInput
                style={[styles.searchInput, { flex: 1 }]}
                placeholder="חפש מוזמנים (כולל ברכה)"
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
              />
            </View>

            <FlatList
              data={filteredContacts}
              renderItem={renderItem}
              keyExtractor={(item) => item.recordID}
              style={styles.list}
              contentContainerStyle={styles.listContent}   // ✅ חדש
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

          </View>
        )}

        <View style={styles.backgroundContainer}>
          <View style={styles.row}>
            <View style={styles.section}>
              <Text style={styles.header2}>סך הכל מתנות</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{totalPrice}₪</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.header2}>ממוצע לאדם</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{averagePrice}₪</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.section}>
              <Text style={styles.header2}>אורחים ששילמו</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{paidGuestsCount}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.header2}>מוזמנים באירוע</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.textPrice}>{contacts.length}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={exportToExcel} style={styles.exportButton}>
          <Image source={require('../assets/excel.png')} style={styles.backIcon2} />
          <Text style={styles.exportButtonText}>ייצא לקובץ אקסל</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, resizeMode: 'cover', backgroundColor: '#f9f7f7' },
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center' },

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

  searchAndSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginBottom: 10,
  },
  tableContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  sortButton: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  sortIcon: { width: 26, height: 26, tintColor: 'black' },

  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },

  list: {
    width: '100%',
    maxHeight: 450,
    minHeight: 100,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  separator: { height: 2, backgroundColor: '#ccc', marginVertical: 5 },

  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
  },

  itemInput: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 5,
    marginRight: 10,
    fontWeight: 'bold',
    minWidth: 80,
  },

  // ✅ כפתור ברכה
  noteBtn: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  noteBtnDisabled: {
    backgroundColor: '#bbb',
  },
  noteBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },

  itemText: { fontSize: 16, fontWeight: 'bold' },

  backgroundContainer: {
    padding: 10,
    borderRadius: 10,
    width: '90%',
    marginTop: -10,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 0,
  },
  section: { flex: 1, alignItems: 'center', marginHorizontal: 5 },
  header2: {
    fontSize: 19,
    color: 'rgba(108, 99, 255, 0.9)',
    marginBottom: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  priceContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,
    flexDirection: 'row',
    borderColor: 'rgba(108, 99, 255, 0.9)',
  },
  textPrice: {
    fontSize: 30,
    color: 'rgba(108, 99, 255, 0.9)',
    textAlign: 'center',
    flexShrink: 1,
    fontWeight: 'bold',
  },

  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
    paddingHorizontal: 85,
    marginBottom: 30,
  },
  backIcon2: { width: 30, height: 30, marginRight: 8 },
  exportButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // ✅ Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: 'rgba(108, 99, 255, 0.9)',
  },
  modalNoteBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
  },
  modalNoteText: {
    fontSize: 16,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  list: {
  width: '92%',          // ✅ היה 100%
  alignSelf: 'center',   // ✅ כדי שיהיה באמצע
  maxHeight: 450,
  minHeight: 100,
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

listContent: {
  paddingBottom: 6,      // ✅ אופציונלי
},

  modalCloseText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default Gift;
