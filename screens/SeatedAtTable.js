import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  FlatList,
  Platform,
  TextInput,
  Alert,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ref, remove, set, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database, storage } from '../firebase';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { ref as sRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import firebase from 'firebase/compat/app';
import { deleteObject } from 'firebase/storage';

const SeatedAtTable = (props) => {
  const id = props.route.params.id;
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [addGuestsModalVisible, setAddGuestsModalVisible] = useState(false);
  const [editedTableName, setEditedTableName] = useState('');

  const uploadTaskRef = useRef(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [busyText, setBusyText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);

  const [userId2, setUserId2] = useState(null);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [editedTableNumber, setEditedTableNumber] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);

  const isDesktopWeb = Platform.OS === 'web' && winW >= 992;
  const imageBoxHeight = Math.round((isDesktopWeb ? winH * 0.7 : winW * 0.9));

  const buttons = [
    { size: 12, icon: require('../assets/meroba-removebg-preview.png'), label: 'שולחן מרובע 12' },
    { size: 14, icon: require('../assets/malben1-removebg-preview.png'), label: 'שולחן מלבן 14' },
    { size: 18, icon: require('../assets/malben2-removebg-preview.png'), label: 'שולחן מלבן 18' },
    { size: 16, icon: require('../assets/igol1-removebg-preview.png'), label: 'שולחן עגול 16' },
    { size: 10, icon: require('../assets/igol2-removebg-preview.png'), label: 'שולחן עגול 10' },
    { size: 24, icon: require('../assets/malben4-removebg-preview.png'), label: 'שולחן אביר 24' },
  ];

  const sizeIconMap = React.useMemo(() => {
    const map = {};
    buttons.forEach(b => { map[b.size] = b.icon; });
    return map;
  }, []);

  const filteredContacts = contacts.filter((item) => {
    const tableNameMatches = (item.displayName || '').toLowerCase().includes(searchText.toLowerCase());
    const guestNameMatches =
      item.guests &&
      item.guests.some((guest) => (guest.displayName || '').toLowerCase().includes(searchText.toLowerCase()));
    return tableNameMatches || guestNameMatches;
  });

  const [searchContactText, setSearchContactText] = useState('');
  const filteredModalContacts = allContacts.filter((contact) =>
    (contact.displayName || '').toLowerCase().includes(searchContactText.toLowerCase())
  );

  const overCapacity = !!selectedSize && selectedContacts.length > selectedSize;

  useEffect(() => {
    const fetchUserId = async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        setUserId2(user.uid);
        loadImagesFromStorage(user.uid);
      } else {
        Alert.alert('משתמש לא מחובר');
      }
    };
    fetchUserId();

    onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/tables`);
        onValue(databaseRef, (snapshot) => {
          const data = snapshot.val();
          setContacts(data ? Object.values(data) : []);
        });
      } else {
        setUser(null);
        setContacts([]);
      }
    });
  }, []);

  const loadImagesFromStorage = async (uid) => {
    try {
      const fileRef = sRef(storage, `users/${uid}/${id}/seatOnTables/image_0.jpg`);
      const url = await getDownloadURL(fileRef);
      setSelectedImage(url);
    } catch (err) {
      if (err.code !== 'storage/object-not-found') {
        console.error('loadImagesFromStorage:', err);
      }
    }
  };

  useEffect(() => {
    if (selectedImage) Image.prefetch(selectedImage).catch(() => {});
  }, [selectedImage]);

  const deleteImage = async () => {
    if (!userId2) {
      Platform.OS === 'web' ? window.alert('משתמש אינו מחובר') : Alert.alert('משתמש אינו מחובר');
      return;
    }
    if (Platform.OS === 'web') {
      if (!window.confirm('למחוק את התרשים?')) return;
    } else {
      const ok = await new Promise((r) =>
        Alert.alert('מחיקה', 'למחוק את התרשים?', [
          { text: 'בטל', style: 'cancel', onPress: () => r(false) },
          { text: 'מחק', style: 'destructive', onPress: () => r(true) },
        ])
      );
      if (!ok) return;
    }
    try {
      setBusyText('מוחק תרשים...');
      setImgBusy(true);
      setUploadProgress(null);
      const fileRef = sRef(storage, `users/${userId2}/${id}/seatOnTables/image_0.jpg`);
      await deleteObject(fileRef);
      setSelectedImage(null);
      Platform.OS !== 'web' && Alert.alert('התמונה נמחקה');
    } catch (err) {
      console.error('deleteImage:', err);
      Platform.OS === 'web'
        ? window.alert('שגיאה: מחיקה נכשלה')
        : Alert.alert('שגיאה', 'מחיקה נכשלה');
    } finally {
      setImgBusy(false);
      setBusyText('');
    }
  };

  useEffect(() => {
    const requestPermissions = async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    };
    requestPermissions();
  }, []);

  const handleButtonPress = async () => {
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: Platform.OS === 'web',
      quality: 0.8,
    });
    if (!pick.canceled) await uploadImage(pick.assets[0].uri);
  };

  const uploadImage = async (localUri) => {
    if (!userId2) { Alert.alert('משתמש אינו מחובר'); return; }
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
        (snapshot) => {
          const progress = snapshot.totalBytes
            ? snapshot.bytesTransferred / snapshot.totalBytes
            : 0;
          setUploadProgress(progress);
        },
        (err) => {
          console.error(err);
          Alert.alert('העלאה נכשלה');
          setImgBusy(false);
          setBusyText('');
          setUploadProgress(null);
          uploadTaskRef.current = null;
        },
        async () => {
          const url = await getDownloadURL(fileRef);
          setSelectedImage(url);
          setImgBusy(false);
          setBusyText('');
          setUploadProgress(null);
          uploadTaskRef.current = null;
          Alert.alert('התמונה נטענה בהצלחה!');
        }
      );
    } catch (err) {
      console.error(err);
      setImgBusy(false);
      setBusyText('');
      setUploadProgress(null);
      uploadTaskRef.current = null;
      Alert.alert('העלאה נכשלה');
    }
  };

  useEffect(() => {
    if (user) {
      const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      onValue(contactsRef, (snapshot) => {
        const data = snapshot.val();
        setAllContacts(data ? Object.values(data) : []);
      });
    }
  }, [user]);

  const handlePrint = async (tableNumber, guestNames, guestCount, tableName) => {
    try {
      await Print.printAsync({
        html: `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; background:#f5f5f5; }
              .container { background:#fff; padding:20px; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,.1); width:70%; text-align:center; }
              h1 { font-size:60px; color:#333; margin:0 0 10px; }
              h2 { font-size:48px; color:#333; margin:0 0 10px; }
              h3 { font-size:30px; color:#333; margin:0 0 10px; }
              p  { font-size:26px; color:#333; margin:10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>- שמור -</h1>
              <h2>${tableName || 'ללא שם'}</h2>
              <h3><strong>שולחן ${tableNumber}</strong></h3>
              <p><strong>שמות האורחים:</strong> ${guestNames}</p>
            </div>
          </body>
        </html>
      `,
      });
    } catch (error) {}
  };

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const openEditModal = (table) => {
    setSelectedTable(table);
    setEditedTableNumber(table.numberTable || '');
    setEditModalVisible(true);
  };
  const closeEditModal = () => { setEditModalVisible(false); setSelectedTable(null); };

  const deleteSpecificGuest = (guestId) => {
    const updatedGuests = (selectedTable.guests || []).filter((guest) => guest.recordID !== guestId);
    const tableRef = ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`);
    set(tableRef, { ...selectedTable, guests: updatedGuests })
      .then(() => {
        setContacts((prev) =>
          prev.map((contact) =>
            contact.recordID === selectedTable.recordID ? { ...contact, guests: updatedGuests } : contact
          )
        );
        Alert.alert('האורח נמחק בהצלחה!');
      })
      .catch((error) => {
        console.error('Error deleting guest:', error);
        Alert.alert('שגיאה במחיקת האורח:', error.message);
      });
  };

  const openAddGuestsModal = () => setAddGuestsModalVisible(true);

  const addContact = () => {
    if (!selectedSize) {
      Alert.alert('שגיאה', 'יש לבחור באחת התמונות לפני הוספת שולחן חדש.');
      return;
    }
    if (selectedSize && selectedContacts.length > selectedSize) {
      Alert.alert(
        'יותר ממספר המקומות',
        `נבחרו ${selectedContacts.length} מוזמנים, אבל גודל השולחן הוא ${selectedSize}. ` +
          'נא להסיר מוזמנים או לבחור גודל שולחן גדול יותר.'
      );
      return;
    }
    const recordidd = String(new Date().getTime());
    const databaseRef = ref(database, `Events/${user.uid}/${id}/tables/${recordidd}`);
    const tableNumber = contacts.length + 1;

    if (newContactName.trim()) {
      const newContact = {
        recordID: recordidd,
        numberTable: `שולחן ${tableNumber}`,
        displayName: newContactName,
        size: selectedSize,
        guests: selectedContacts.map((contactId) => allContacts.find((c) => c.recordID === contactId)),
      };
      set(databaseRef, newContact);
      setContacts([...contacts, newContact]);
      setModalVisible(false);
      setNewContactName('');
      setSelectedContacts([]);
      setSelectedSize(null);
    } else {
      Alert.alert('שגיאה', 'נא למלא את שם השולחן');
    }
  };

  const updateTableNumber = () => {
    if (!editedTableNumber.trim()) {
      Alert.alert('שגיאה', 'נא להזין מספר שולחן תקין.');
      return;
    }
    const tableRef = ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`);
    const updatedTable = { ...selectedTable, numberTable: editedTableNumber };
    set(tableRef, updatedTable)
      .then(() => {
        setContacts((prev) =>
          prev.map((contact) => (contact.recordID === selectedTable.recordID ? updatedTable : contact))
        );
        Alert.alert(`מספר השולחן השתנה \n"${editedTableNumber}״`);
      })
      .catch((error) => {
        console.error('Error updating table number:', error);
        Alert.alert('שגיאה בעדכון מספר השולחן:', error.message);
      });
  };

  const printAllTables = async () => {
    if (contacts.length === 0) { Alert.alert('אין שולחנות להדפסה'); return; }
    const allTableData = contacts.map((item, index) => {
      const tableNumber = index + 1;
      const guestNames =
        item.guests?.map((guest) => guest.displayName || 'ללא שם').join(', ') || 'אין אורחים';
      const tableName = item.displayName || 'ללא שם';
      return `
        <div class="page">
          <div class="content">
            <h1>- שמור -</h1>
            <h2>${tableName}</h2>
            <h3><strong>שולחן ${tableNumber}</strong></h3>
            <p><strong>שמות האורחים:</strong> ${guestNames}</p>
          </div>
        </div>
      `;
    });

    const printContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { margin:0; padding:0; font-family: Arial, sans-serif; }
            .page { width:100%; min-height:100vh; display:flex; flex-direction:column; align-items:center; page-break-after:always; }
            .content { width:70%; background:#fff; padding:20px; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,.1); text-align:center; margin-top:450px; }
            h1 { font-size:60px; color:#333; margin:0 0 10px; }
            h2 { font-size:48px; color:#333; margin:0 0 10px; }
            h3 { font-size:30px; color:#333; margin:0 0 10px; }
            p  { font-size:26px; color:#333; margin:10px 0; }
          </style>
        </head>
        <body>
          ${allTableData.join('')}
        </body>
      </html>
    `;
    try { await Print.printAsync({ html: printContent }); } catch (error) {}
  };

  const cancelUpload = () => {
    try { uploadTaskRef.current?.cancel(); setBusyText('מבטל העלאה...'); } catch (e) {}
  };

  const updateTableName = () => {
    if (!editedTableName.trim()) { Alert.alert('שגיאה', 'נא להזין שם שולחן תקין.'); return; }
    const tableRef = ref(database, `Events/${user.uid}/${id}/tables/${selectedTable.recordID}`);
    const updatedTable = { ...selectedTable, displayName: editedTableName };
    set(tableRef, updatedTable)
      .then(() => {
        setContacts(prev => prev.map(c => (c.recordID === selectedTable.recordID ? updatedTable : c)));
        Alert.alert(`שם השולחן השתנה ל-"${editedTableName}"`);
      })
      .catch((error) => {
        console.error('Error updating table name:', error);
        Alert.alert('שגיאה בעדכון שם השולחן:', error.message);
      });
  };

  const deleteTable = (recordID) => {
    const tableRef = ref(database, `Events/${user.uid}/${id}/tables/${recordID}`);
    remove(tableRef)
      .then(() => {
        setContacts((prev) => prev.filter((contact) => contact.recordID !== recordID));
        setEditModalVisible(false);
        Alert.alert('השולחן נמחק בהצלחה!');
      })
      .catch((error) => {
        console.error('Error deleting table:', error);
        Alert.alert('שגיאה במחיקת שולחן:', error.message);
      });
  };

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const openDeleteModal   = () => setDeleteModalVisible(true);
  const closeDeleteModal  = () => setDeleteModalVisible(false);

  const confirmDeleteAllTables = async () => {
    try {
      const tablesRef = ref(database, `Events/${user.uid}/${id}/tables`);
      await remove(tablesRef);
      setContacts([]);
      deleteAllTablesview();
      closeDeleteModal();
      Alert.alert('הכל נמחק בהצלחה!');
    } catch (err) {
      console.error('Error deleting all tables:', err);
      Alert.alert('שגיאה במחיקה', err.message);
    }
  };

  const deleteAllTablesview = () => {
    const tablesRef2 = ref(database, `Events/${user.uid}/${id}/tablesPlace`);
    remove(tablesRef2).catch(() => {});
  };

  const [responses, setResponses] = useState({});
  useEffect(() => {
    if (!user) return;
    const responsesRef = ref(database, `Events/${user.uid}/${id}/responses`);
    onValue(responsesRef, (snapshot) => {
      const data = snapshot.val();
      setResponses(data || {});
    });
  }, [user, id]);

  const sizeLabelMap = React.useMemo(() => {
    return Object.fromEntries(buttons.map(b => [b.size, b.label.replace(/^שולחן\s+/, '')]));
  }, []);

  const renderItem = ({ item, index }) => {
    const backgroundColor = index % 2 === 0 ? '#f5f5f5' : '#ffffff';
    const tableIcon  = item?.size ? sizeIconMap[item.size] : null;
    const tableLabel = item?.size ? sizeLabelMap[item.size] : null;
    const currentCount = item?.guests?.length ?? 0;
    const maxCount = item?.size ?? null;
    const isFull = maxCount != null && currentCount >= maxCount;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openEditModal(item)}
        style={[styles.itemContainer, { backgroundColor }]}
      >
        <View style={styles.rowHeader}>
          <View style={styles.tableThumbCol}>
            {tableIcon ? <Image source={tableIcon} style={styles.tableThumb} resizeMode="contain" /> : null}
            {tableLabel ? <Text style={styles.tableCatText}>{tableLabel}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tableNumber}>{item.numberTable || `שולחן ${index + 1}`}</Text>
            <Text style={styles.tableName}>{item.displayName || 'ללא שם'}</Text>
          </View>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countLabel}>מספר אנשים:</Text>
          <Text style={[styles.countValue, isFull && styles.countValueFull]}>
            {maxCount ? `${currentCount} / ${maxCount}` : `${currentCount}`}
          </Text>
          {isFull && <Text style={styles.fullChip}>מלא</Text>}
        </View>

        <View style={styles.guestListHorizontal}>
          {item.guests && item.guests.length > 0 ? (
            item.guests.map((guest, guestIndex) => {
              const responseStatus = responses[guest.recordID]?.response;
              let textColor = '#333';
              if (responseStatus === 'מגיע') textColor = '#4CAF50';
              else if (responseStatus === 'לא מגיע') textColor = '#FF6F61';
              else if (responseStatus === 'אולי') textColor = '#FFD700';
              return (
                <Text key={guestIndex} style={[styles.guestName, { color: textColor }]}>
                  {guest.displayName || 'ללא שם'}{guestIndex !== item.guests.length - 1 ? ' , ' : ''}
                </Text>
              );
            })
          ) : (
            <Text style={styles.guestName}>אין אורחים</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar backgroundColor="rgba(108, 99, 255, 0.9)" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>ניהול שולחנות</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== דף בודד אנכי (Web/Mobile) ===== */}
      <View style={styles.page}>

        {/* כפתורי פעולה עליונים */}

        {/* תמונה / העלאה */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            onPress={handleButtonPress}
            style={[styles.imagePlaceholder, { height: imageBoxHeight }]}
            activeOpacity={0.7}
          >
            {selectedImage ? (
              <Image
                key={selectedImage}
                source={{ uri: selectedImage }}
                style={[styles.imageBackground2, { width: '100%', height: '100%' }]}
                resizeMode="contain"
              />
            ) : (
              <>
                <Text style={[styles.noItemsText, { marginBottom: 10 }]}>
                  לחץ על התמונה להעלות תרשים אולם
                </Text>
                <Image
                  source={require('../assets/uploadimg.png')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </>
            )}
          </TouchableOpacity>

          {/* שכבתBusy */}
          {imgBusy && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              {!!busyText && <Text style={styles.busyText}>{busyText}</Text>}
              {uploadProgress != null && (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
                  </View>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelUpload}>
                    <Text style={styles.cancelBtnText}>בטל העלאה</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* מחיקת תמונה */}
          {selectedImage && (
            <TouchableOpacity onPress={deleteImage} style={[styles.deleteImageButton, styles.deleteImageButtonWeb]}>
              <Text style={styles.deleteImageButtonText}>✕</Text>
            </TouchableOpacity>
          )}

          <View style={styles.topActionsRow}>
          <Text style={styles.tableCountText}>({contacts.length})</Text>

          <TouchableOpacity
            style={[styles.deleteAllButton, contacts.length === 0 && styles.disabledButton]}
            onPress={openDeleteModal}
            disabled={contacts.length === 0}
          >
            <Text style={styles.dummyButtonText}>מחק הכל</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteAllButton2, contacts.length === 0 && styles.disabledButton]}
            onPress={printAllTables}
            disabled={contacts.length === 0}
          >
            <Text style={styles.dummyButtonText}>הדפס הכל</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAllButton2}
            onPress={() => {
              if (selectedImage) {
                const tableData = contacts.map((contact) => ({
                  id: contact.recordID,
                  name: contact.displayName,
                }));
                props.navigation.navigate('TablePlanningScreen', {
                  id,
                  selectedImage,
                  tableData,
                  selectedSize,
                });
              } else {
                Alert.alert('נא לטעון תמונה חדשה', 'יש ללחוץ על כפתור העלאת תמונה כדי להעלות תרשים אולם.');
              }
            }}
          >
            <Text style={styles.dummyButtonText}>תכנון שולחנות</Text>
          </TouchableOpacity>
        </View>

        </View>

        {/* חיפוש */}
        <TextInput
          style={[styles.searchInput, { width: '100%' }]}
          placeholder="חפש שולחן..."
          value={searchText}
          onChangeText={setSearchText}
        />

        {/* רשימה */}
        <View style={[styles.tableContainer, { maxHeight: 'unset', flex: 1, width: '100%' }]}>
          <FlatList
            data={filteredContacts}
            renderItem={renderItem}
            keyExtractor={(item) => item.recordID}
            style={[styles.list]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        </View>

        {/* הוסף שולחן */}
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addButton, { width: '50%' }]}>
          <Text style={styles.addButtonText}>הוסף שולחן +</Text>
        </TouchableOpacity>
      </View>

      {/* ===== מודלים ===== */}
      <Modal visible={editModalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.modalContentWebNarrow]}>
            <Text style={styles.modalTitle}>{selectedTable?.displayName || 'עריכת שולחן'}</Text>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>מספר שולחן</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input4, { flex: 1 }]}
                  placeholder="מספר חדש לשולחן"
                  value={editedTableNumber}
                  onChangeText={setEditedTableNumber}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.actionButton2} onPress={updateTableNumber}>
                  <Text style={styles.actionButtonText}>שמור מספר</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>שם שולחן</Text>
              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input4, { flex: 1 }]}
                  placeholder="שם שולחן חדש"
                  value={editedTableName}
                  onChangeText={setEditedTableName}
                />
                <TouchableOpacity style={styles.actionButton2} onPress={updateTableName}>
                  <Text style={styles.actionButtonText}>שמור שם</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonRow2}>
              <TouchableOpacity style={styles.actionButton2} onPress={openAddGuestsModal}>
                <Text style={styles.actionButtonText}>הוסף אנשים</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton2}
                onPress={() => {
                  const tableNumber = contacts.findIndex((c) => c.recordID === selectedTable?.recordID) + 1;
                  const guestNames =
                    selectedTable?.guests?.map((g) => g.displayName || 'ללא שם').join(', ') || 'אין אורחים';
                  const guestCount = selectedTable?.guests?.length || 0;
                  const tableName = selectedTable?.displayName || 'ללא שם';
                  handlePrint(tableNumber, guestNames, guestCount, tableName);
                }}
              >
                <Text style={styles.actionButtonText}>הדפס שולחן</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton3} onPress={() => deleteTable(selectedTable?.recordID)}>
                <Text style={styles.actionButtonText}>מחיקת שולחן</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedTable?.guests || []}
              keyExtractor={(item) => item.recordID}
              style={styles.guestList}
              contentContainerStyle={{ paddingBottom: 10 }}
              renderItem={({ item }) => {
                const responseStatus = responses[item.recordID]?.response;
                let backgroundColor = '#f5f5f5';
                if (responseStatus === 'מגיע') backgroundColor = '#4CAF50';
                else if (responseStatus === 'לא מגיע') backgroundColor = '#FF6F61';
                else if (responseStatus === 'אולי') backgroundColor = '#FFD700';
                return (
                  <View style={[styles.guestContainer, { backgroundColor }]}>
                    <TouchableOpacity style={styles.deleteGuestButton} onPress={() => deleteSpecificGuest(item.recordID)}>
                      <Image source={require('../assets/delete.png')} style={styles.deleteIcon} />
                    </TouchableOpacity>
                    <Text style={styles.guestName}>{item.displayName || 'ללא שם'}</Text>
                  </View>
                );
              }}
            />

            <Modal visible={addGuestsModalVisible} animationType="fade" transparent>
              <View style={styles.modalContainer}>
                <View style={[styles.modalContent, styles.modalContentWebNarrow]}>
                  <Text style={styles.modalTitle}>בחר אנשים להוספה</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="חפש איש קשר..."
                    value={searchContactText}
                    onChangeText={setSearchContactText}
                  />
                  <FlatList
                    data={filteredModalContacts}
                    keyExtractor={(item) => item.recordID}
                    style={styles.flatList}
                    renderItem={({ item }) => {
                      const responseStatus = responses[item.recordID]?.response;
                      let backgroundColor = '#f5f5f5';
                      if (responseStatus === 'מגיע') backgroundColor = '#4CAF50';
                      else if (responseStatus === 'לא מגיע') backgroundColor = '#FF6F61';
                      else if (responseStatus === 'אולי') backgroundColor = '#FFD700';

                      const selected = selectedContacts.includes(item.recordID);
                      return (
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedContacts((prev) =>
                              prev.includes(item.recordID)
                                ? prev.filter((id2) => id2 !== item.recordID)
                                : [...prev, item.recordID]
                            )
                          }
                          style={[
                            styles.contactItem,
                            { backgroundColor },
                            selected && styles.contactItemSelected,
                          ]}
                        >
                          <Text style={styles.contactName}>{item.displayName}</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />

                  <TouchableOpacity
                    style={styles.addGuestButton}
                    onPress={() => {
                      const newGuests = selectedContacts.map((contactId) =>
                        allContacts.find((contact) => contact.recordID === contactId)
                      );
                      const updatedGuests = [...(selectedTable?.guests || []), ...newGuests];
                      const tableRef = ref(database, `Events/${user.uid}/${id}/tables/${selectedTable?.recordID}`);
                      set(tableRef, { ...selectedTable, guests: updatedGuests })
                        .then(() => {
                          setContacts((prevContacts) =>
                            prevContacts.map((table) =>
                              table.recordID === selectedTable?.recordID
                                ? { ...table, guests: updatedGuests }
                                : table
                            )
                          );
                          Alert.alert('האורחים נוספו בהצלחה!');
                        })
                        .catch((error) => {
                          console.error('Error adding guests:', error.message);
                          Alert.alert('שגיאה בהוספת אורחים:', error.message);
                        });
                      setAddGuestsModalVisible(false);
                    }}
                  >
                    <Text style={styles.addGuestButtonText}>שמור</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelButton2} onPress={() => setAddGuestsModalVisible(false)}>
                    <Text style={styles.modalButtonText}>סגור</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <TouchableOpacity style={styles.cancelButton2} onPress={closeEditModal}>
              <Text style={styles.modalButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* מודל הוספת שולחן */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalCenter}>
            <View style={[styles.addTableCard, { maxHeight: Math.min(720, Math.round(winH * 0.85)) }]}>
              <Text style={styles.modalTitle}>הוספת שולחן</Text>

              <TextInput
                style={styles.input4}
                placeholder="שם שולחן (לדוגמה: משפחת כהן)"
                value={newContactName}
                onChangeText={setNewContactName}
              />

              <Text style={styles.sectionLabel}>בחר סוג שולחן</Text>
              <View style={styles.sizeButtonsRow}>
                {buttons.map((b, idx) => {
                  const selected = selectedSize === b.size;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedSize(b.size)}
                      style={[styles.sizeBtn, selected && styles.sizeBtnSelected]}
                    >
                      <Image source={b.icon} style={styles.sizeIcon} />
                      <Text style={styles.sizeLabel}>{b.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>בחר אנשים לשולחן</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="חפש איש קשר..."
                value={searchContactText}
                onChangeText={setSearchContactText}
              />

              <View style={styles.counterRow}>
                <Text style={[styles.counterPill, overCapacity ? styles.counterPillOver : styles.counterPillOk]}>
                  {selectedContacts.length}{selectedSize ? ` / ${selectedSize}` : ''}
                </Text>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.selectListBox}>
                  <FlatList
                    data={filteredModalContacts}
                    keyExtractor={(item) => item.recordID}
                    keyboardShouldPersistTaps="handled"
                    style={{ flex: 1 }}
                    renderItem={({ item }) => {
                      const selected = selectedContacts.includes(item.recordID);
                      const responseStatus = responses[item.recordID]?.response;
                      let backgroundColor = '#f5f5f5';
                      if (responseStatus === 'מגיע') backgroundColor = '#4CAF50';
                      else if (responseStatus === 'לא מגיע') backgroundColor = '#FF6F61';
                      else if (responseStatus === 'אולי') backgroundColor = '#FFD700';
                      return (
                        <TouchableOpacity
                          onPress={() => {
                            const willSelect = !selected;
                            const nextCount = willSelect ? selectedContacts.length + 1 : selectedContacts.length - 1;
                            if (selectedSize && nextCount > selectedSize) {
                              const msg = `בחרת ${nextCount} מוזמנים, אבל גודל השולחן הוא ${selectedSize}.`;
                              Platform.OS === 'web' ? window.alert(msg) : Alert.alert('קיבולת שולחן', msg);
                            }
                            setSelectedContacts((prev) =>
                              selected ? prev.filter((id2) => id2 !== item.recordID) : [...prev, item.recordID]
                            );
                          }}
                          style={[
                            styles.contactItem,
                            { backgroundColor },
                            selected && styles.contactItemSelected,
                          ]}
                        >
                          <Text style={styles.contactName}>{item.displayName}</Text>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={<Text style={styles.emptyListText}>אין אנשי קשר להצגה</Text>}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={[styles.actionButton2, { flex: 1 }]} onPress={addContact}>
                  <Text style={styles.modalButtonText}>שמור</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton2, { backgroundColor: '#808080', flex: 1 }]}
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedContacts([]);
                  }}
                >
                  <Text style={styles.modalButtonText}>סגור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* מודל מחיקת הכל */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>אישור מחיקה</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20 }}>האם אתה בטוח שברצונך למחוק את כל השולחנות?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.actionButton2, { backgroundColor: '#808080' }]} onPress={closeDeleteModal}>
                <Text style={styles.modalButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton2, { backgroundColor: '#f44336' }]} onPress={confirmDeleteAllTables}>
                <Text style={styles.modalButtonText}>מחק</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 0,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerButtons: {
    marginBottom: -30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    marginTop: 55,
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: -20,
  },
  backButton: {},
  backButtonText: { fontSize: 29, color: '#fff', marginBottom: 20 },

  /* ===== דף אנכי יחיד ===== */
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
  },

  /* כפתורי פעולה עליונים */
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 15
  },
  tableCountText: { fontSize: 17, fontWeight: 'bold', color: '#333', textAlign: 'center', marginLeft: 10 },
  deleteAllButton: {
    backgroundColor: '#f44336',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  deleteAllButton2: {
    backgroundColor: '#000',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  disabledButton: { backgroundColor: '#ccc' },
  dummyButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  /* תמונה */
  imageContainer: { position: 'relative', width: '100%' },
  imagePlaceholder: { width: '100%' },
  imageBackground2: { width: '100%', height: '100%' },
  noItemsText: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 10 },

  deleteImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f44336',
    width: 26,
    height: 26,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteImageButtonWeb: { top: 10, right: 10 },
  deleteImageButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  /* חיפוש + רשימה */
  searchInput: {
    width: '100%',
    alignSelf: 'center',
    textAlign: 'right',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tableContainer: { flex: 1, width: '100%', marginVertical: 5 },
  list: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' } : {}),
  },
  itemContainer: {
    flexDirection: 'column',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  separator: { height: 10 },
  tableNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  tableName: { fontSize: 16, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 5 },
  guestListHorizontal: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  guestName: { fontSize: 14, color: '#555', marginRight: 10 },

  /* כפתור הוספה */
  addButton: {
    padding: 6,
    height: 40,
    backgroundColor: '#000',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 6,
  },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  /* Busy overlay */
  progressBar: {
    width: '70%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 999 },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
  },
  cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  busyOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  busyText: { color: '#fff', marginTop: 8, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  /* כותרת רשומה */
  rowHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  tableThumb: { width: 40, height: 40, marginLeft: 6 },
  tableThumbCol: { width: 64, alignItems: 'center', justifyContent: 'center' },
  tableCatText: { marginTop: 4, fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 14 },

  /* מונה/קיבולת */
  countRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  countLabel: { fontSize: 14, color: '#777', marginHorizontal: 4 },
  countValue: { fontSize: 14, color: '#777', marginHorizontal: 4, writingDirection: 'ltr' },
  countValueFull: { color: '#C62828', fontWeight: '700' },
  fullChip: {
    marginStart: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFECEC',
    color: '#C62828',
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },

  /* מודלים */
  modalContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%', maxHeight: '80%', backgroundColor: '#fff',
    borderRadius: 15, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
  },
  modalContentWebNarrow: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cancelButton2: {
    backgroundColor: '#808080', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f44336', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 5,
  },
  input4: {
    width: '100%', padding: 10, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 10, marginBottom: 0, backgroundColor: '#f7f7f7', textAlign: 'right',
  },
  buttonRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, paddingHorizontal: 10 },
  actionButton2: {
    flex: 1, backgroundColor: 'rgba(77, 88, 90, 0.9)', paddingVertical: 7,
    marginHorizontal: 5, borderRadius: 5, alignItems: 'center', padding: 5,
  },
  actionButton3: {
    flex: 1, backgroundColor: '#f44336', paddingVertical: 7,
    marginHorizontal: 5, borderRadius: 5, alignItems: 'center', padding: 5,
  },
  guestList: { marginTop: 10 },
  guestContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, marginVertical: 5, backgroundColor: '#f5f5f5', borderRadius: 5,
  },
  deleteGuestButton: { paddingVertical: 5, paddingHorizontal: 0, borderRadius: 5 },
  contactItem: {
    padding: 12, borderBottomWidth: 3, borderColor: '#ddd',
    borderRadius: 5, marginVertical: 2,
  },
  contactItemSelected: { borderWidth: 4, borderColor: 'blue' },
  contactName: { fontSize: 16, color: '#000', textAlign: 'right' },
  flatList: { maxHeight: 200, flexGrow: 0 },
  addGuestButton: {
    backgroundColor: '#000', paddingVertical: 15, borderRadius: 10,
    alignItems: 'center', marginVertical: 20, width: '100%',
  },
  addGuestButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  /* מודל הוספת שולחן */
  sectionLabel: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 6, textAlign: 'right' },
  sizeButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sizeBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#fff',
  },
  sizeBtnSelected: { borderColor: '#6C63FF', backgroundColor: '#F3F2FF' },
  sizeIcon: { width: 36, height: 36, marginRight: 8, resizeMode: 'contain' },
  sizeLabel: { fontSize: 14, color: '#333' },

  modalCenter: { width: '100%', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  addTableCard: {
    width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 15, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 5, overflow: 'hidden',
  },
  modalBody: { flex: 1, minHeight: 0, marginTop: 6, overflow: 'hidden' },
  selectListBox: {
    flex: 1, minHeight: 160, maxHeight: '100%', borderWidth: 1, borderColor: '#eee',
    borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff',
  },
  emptyListText: { textAlign: 'center', paddingVertical: 16, color: '#777', fontSize: 14 },

editSection: {
  marginTop: 8,
  marginBottom: 10,
},
editLabel: {
  fontSize: 14,
  color: '#555',
  marginBottom: 6,
  textAlign: 'right',
},
inlineRow: {
  flexDirection: 'row-reverse', // RTL
  alignItems: 'center',
  gap: 8,                       // אם gap לא נתמך – תן marginLeft קטן ל־button
},
actionButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

  topRightButtons: { position: 'absolute', right: 0 },
  smallButton: { backgroundColor: 'transparent', borderRadius: 5, padding: 10, margin: 5, alignItems: 'center', justifyContent: 'center', minWidth: 50, minHeight: 50 },
  deleteIcon: { width: 24, height: 24 },
  /* מונה נבחרים */
  counterRow: { alignItems: 'flex-end', marginTop: 4, marginBottom: 6 },
  counterPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 14, fontWeight: '700', overflow: 'hidden' },
  counterPillOk: { backgroundColor: '#EAFCEF', color: '#1E824C', borderWidth: 1, borderColor: '#BEEBD1' },
  counterPillOver: { backgroundColor: '#FFECEC', color: '#C62828', borderWidth: 1, borderColor: '#F5B7B1' },
});

export default SeatedAtTable;
