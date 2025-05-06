import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ImageBackground, StyleSheet, TouchableOpacity, Image, Alert, TextInput, Modal, Button, PermissionsAndroid, StatusBar, Platform } from 'react-native';
import { getDatabase, ref, push, remove, set } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import auth methods
import { onValue } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import 'firebase/database'; // Import the Realtime Database module
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';


const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// קבלת ה-Auth instance
const database = getDatabase();

const Management = (props) => {
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [user, setUser] = useState(null); // State to hold user info
  const id = props.route.params.id; // Accessing the passed id
  const insets = useSafeAreaInsets();
  const [selectedContacts, setSelectedContacts] = useState([]);
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const auth = getAuth();
  const [modalVisible2, setModalVisible2] = useState(false);
  const [selectedPrefix, setSelectedPrefix] = useState(''); // ברירת מחדל לקידומת

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
          title: 'Contacts Permission',
          message: 'This app needs access to your contacts.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        });
      }


      onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/contacts`);




          onValue(databaseRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              const contactsArray = Object.values(data);
              setContacts(contactsArray);
            } else {
              setContacts([]);
            }
          });
        } else {
          setUser(null);
          setContacts([]);
        }
      });
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if (user && id) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      let myVariable = 0;
      let previousCounter = null; // משתנה לשמירת המצב האחרון

      const unsubscribe = onValue(databaseRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Contacts 1:');
          const contactsArray = Object.values(data);
          setContacts(contactsArray);
  
          myVariable = contactsArray.length;
          const currentCounter = contactsArray.length;
          if (currentCounter !== previousCounter) {
            console.log('Updating counter_contacts in database:', currentCounter);
            const counterRef = ref(database, `Events/${user.uid}/${id}/counter_contacts`);
            set(counterRef, currentCounter);
            previousCounter = currentCounter; // עדכון המצב האחרון
          }
        } else {
          console.log('No contacts found');
          setContacts([]);
          myVariable = 0;
  
          const counterRef = ref(database, `Events/${user.uid}/${id}/counter_contacts`);
          set(counterRef, 0);
        }
      });
  
      // Cleanup logic
      return () => {
        const counterRef = ref(database, `Events/${user.uid}/${id}/counter_contacts`);
        set(counterRef, myVariable); // עדכון הערך האחרון של מספר אנשי הקשר
        console.log('Contacts 2:');
        unsubscribe();
      };
    }
  }, [user, id]);
  
  
  

  const handleImportContacts = () => {
    // כאן תוסיף את הפונקציה שלך לייבוא אנשי קשר
    console.log('ייבא אנשי קשר');
    setModalVisible2(false);
  };

  const addContact = () => {
    const recordidd = String(new Date().getTime());
    const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordidd}`);
    const fullPhoneNumber = `${selectedPrefix}${newContactPhone}`; // יצירת מספר מלא

    if (newContactName.trim() && newContactPhone.trim()&& selectedPrefix.trim()) {
      const newContact = {
        recordID: recordidd,
        displayName: newContactName,
        phoneNumbers: fullPhoneNumber,
        price: newPrice,
      };
      set(databaseRef, newContact); // שימור האיש קשר במסד הנתונים כאיבר חדש
      setContacts([...contacts, newContact]);
      setModalVisible(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewPrice('');
  
      // עדכון מספר המוזמנים
      updateCounterContacts();
    } else {
      Alert.alert('שגיאה', 'נא למלא את כל השדות', [
        {
          text: 'הבנתי',
          onPress: () => {}, // פעולה לאחר לחיצה
        },
      ]);
      return;
        }
  };
  

  const deleteContact = async (contactId) => {
    if (user) {
      const contactRef = ref(database, `Events/${user.uid}/${id}/contacts/${contactId}`);
      try {
        await remove(contactRef);
        setContacts((prevContacts) => prevContacts.filter((contact) => contact.recordID !== contactId));
  
        // עדכון מספר המוזמנים
        updateCounterContacts();
      } catch (error) {
        console.error('Error deleting contact from Firebase:', error);
        Alert.alert('Error', 'Failed to delete contact. Please try again.');
      }
    } else {
      Alert.alert('Error', 'User not authenticated. Please log in.');
    }
  };
  
  const pickContacts = async () => {
    try {
      console.log('מתחיל לבקש הרשאות');
      const { status } = await Contacts.requestPermissionsAsync();
      console.log('סטטוס ההרשאה שהתקבל:', status);
  
      if (status === 'granted') {
        console.log('הרשאה ניתנה, מבצע קריאה לאנשי קשר...');
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        console.log('אנשי קשר שהובאו:', data);
  
        if (data.length > 0) {
          navigation.navigate('ContactsList', {
            contacts: data,
            selectedContacts,
            onSelectContacts: handleSelectContacts,
          });
        } else {
          Alert.alert('שגיאה', 'לא נמצאו אנשי קשר');
        }
      } else {
        console.log('הרשאה לא ניתנה');
        Alert.alert('שגיאה', 'הרשאה לא ניתנה');
      }
    } catch (error) {
      console.error('שגיאה במהלך בקשת הרשאות:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת ייבוא אנשי הקשר');
    }
  };
  
  const downloadExcelTemplate = async () => {
    const data = [
      { שם: 'דני דוגמה', טלפון: '0501234567' },
      { שם: 'רותי דוגמה', טלפון: '0527654321' },
    ];
  
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מוזמנים');
  
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.documentDirectory + 'template.xlsx';
  
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
  
    await Sharing.shareAsync(uri);
  };


  const uploadExcelFile = async () => {
  
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
        multiple: false,
      });
  
  
      // בדיקה לפי פורמט חדש של Expo (assets)
      const fileUri = result.assets?.[0]?.uri;
  
      if (!result.canceled && fileUri) {
  
        const b64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
  
        const workbook = XLSX.read(b64, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
  
  
        data.forEach((row, index) => {
          const recordId = String(new Date().getTime() + index);
          const contact = {
            recordID: recordId,
            displayName: row["שם"] || 'No Name',
            phoneNumbers: row["טלפון"] || 'No Phone',
          };
  
  
          const dbRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordId}`);
          set(dbRef, contact);
        });
      } else {
        console.log('בוטל או לא נבחר קובץ');
      }
  
      console.log('7');
    } catch (error) {
      console.error('❌ שגיאה בקריאת קובץ:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לקרוא את הקובץ. ודא שהוא בפורמט תקין.');
    }
  
  };
  

  const handleSelectContacts = (contacts) => {
    setSelectedContacts(contacts);
    console.log('Selected contacts:', contacts);

    contacts.forEach((contact, index) => {
      const recordid = String(new Date().getTime()) + index;
      const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordid}`);
  
      const newContact = {
        recordID: recordid,
        displayName: contact.name,
        phoneNumbers: contact.phoneNumbers ? contact.phoneNumbers[0].number : 'No phone number',
        newPrice: newPrice,
      };
      set(databaseRef, newContact);
    });
  
    // עדכון מספר המוזמנים
    updateCounterContacts();
  };
  

  const updateCounterContacts = () => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/counter_contacts`);
    set(databaseRef, contacts.length);
  };

  
  

  const deleteAllContacts = async () => {
    if (user) {
      const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts`);
      try {
        await remove(databaseRef);
        setContacts([]);
  
        // עדכון מספר המוזמנים
        updateCounterContacts();
      } catch (error) {
        console.error('Error deleting all contacts from Firebase:', error);
        Alert.alert('Error', 'Failed to delete all contacts. Please try again.');
      }
    } else {
      Alert.alert('Error', 'User not authenticated. Please log in.');
    }
  };
  

  const showAlert = () => {
    Alert.alert(
      'הסר הכל', // כותרת ההודעה
      'האם אתה בטוח שברצונך להסיר את כל המוזמנים?', // תוכן ההודעה
      [
        { 
          text: 'הסר', 
          onPress: () => deleteAllContacts(), // פעולה שמתבצעת כאשר לוחצים על 'הסר'
          style: 'destructive', // עיצוב כפתור שלילי (מסומן באדום ב-iOS)
        },
        { 
          text: 'ביטול', 
          onPress: () => console.log('cancel'), // פעולה שמתבצעת כאשר לוחצים על 'ביטול'
          style: 'cancel', // עיצוב כפתור ביטול (מסומן בהדגשה ב-iOS)
        },
      ],
      { cancelable: true } // מאפשר לבטל את הדיאלוג על ידי לחיצה מחוץ לדיאלוג (באנדרואיד)
    );
  };
  

  const filteredContacts = contacts.filter((contact) =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumbers.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <ImageBackground source={require('../assets/backgruondcontact.png')} style={styles.background}>
      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
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
            onChangeText={(text) => setSearchQuery(text)}
          />
          <View style={styles.rowContainer}>
            <Text style={styles.textPrice}>מספר מוזמנים {contacts.length}</Text>

            <TouchableOpacity style={styles.deleteAllButton} onPress={showAlert}>
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
      <View style={styles.topB}>

      <TouchableOpacity style={styles.mainButton} onPress={() => setModalVisible2(true)}>
        <Text style={styles.mainButtonText}>הוסף מוזמנים +</Text>
      </TouchableOpacity>
      
      </View>

      <Modal
        visible={modalVisible2}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible2(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>בחר אפשרות</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setModalVisible(true); // פותח את המודל להוספת מספר ידני
                setModalVisible2(false); // סוגר את המודל הראשי
              }}
            >
              <Text style={styles.optionButtonText}>הוסף מספר ידני</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.optionButton} onPress={() => {
              //setModalVisible2(false);
              pickContacts(); // פתח את פונקציית ייבוא אנשי קשר
            }}>
              <Text style={styles.optionButtonText}>ייבא אנשי קשר</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 18, marginVertical: 8 }}>או</Text>

                <TouchableOpacity style={[styles.optionButton1, { marginHorizontal: 5 }]} onPress={downloadExcelTemplate}>
                  <Text style={styles.optionButtonText}>הורד טמפלייט מוזמנים באקסל</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionButton1, { marginHorizontal: 5 }]} onPress={uploadExcelFile}>
                  <Text style={styles.optionButtonText}>העלה קובץ אקסל</Text>
                </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible2(false)}>
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {modalVisible && (
  <View style={styles.overlay}>
    <View style={styles.modalContent2}>
      <Text style={styles.modalTitle2}>הוסף איש קשר חדש</Text>
      <TextInput
        style={styles.modalInput2}
        placeholder="שם"
        value={newContactName}
        onChangeText={(text) => setNewContactName(text)}
      />
      <View style={styles.phoneInputContainer}>
        <TextInput
          style={styles.prefixInput}
          placeholder="קידומת"
          value={selectedPrefix}
          keyboardType="numeric"
          maxLength={3}
          onChangeText={(text) => setSelectedPrefix(text)}
        />
        <TextInput
          style={styles.phoneInput}
          placeholder="טלפון"
          value={newContactPhone}
          onChangeText={(text) => setNewContactPhone(text)}
        />
      </View>
      <View style={styles.modalButtonsContainer2}>
        <TouchableOpacity style={styles.modalButtonCancel2} onPress={() => setModalVisible(false)}>
          <Text style={styles.modalButtonText2}>ביטול</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalButtonSave2}
          onPress={() => {
            const fullPhoneNumber = `${selectedPrefix}${newContactPhone}`;
            setNewContactPhone(fullPhoneNumber);
            addContact();
          }}
        >
          <Text style={styles.modalButtonText2}>שמור</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}

        </View>
    </ImageBackground>
    
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    resizeMode: 'cover',
    padding: 16,
  },
  topBar: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 30,

  },
  topB: {

    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 20,
    color: '#000',
  },
  tableContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    
  },
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
  deleteIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  addButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  pickContactsButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  pickContactsButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // מיקומים בקצוות השורה
    marginVertical: 20,
    paddingHorizontal: 20, // רווח פנימי מכל צד
  },
  
  
  
  deleteAllButton: {
    position: 'absolute',
    paddingHorizontal: 10, 
    paddingVertical: 5,
    backgroundColor: 'red', // צבע רקע אדום לכפתור
    borderRadius: 5,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'right', // יישור טקסט לימין

    borderWidth: 1,
    borderColor: '#ddd',
  },
  imageback: {
    width: 40,
    height: 40,
    marginTop: -50,
    marginBottom: 20,

    marginRight: 300,
  },
  textPrice: {
    position: 'absolute',
    right: 0, // מיקום קבוע מצד ימין
    fontSize: 16,
    color: 'black', // צבע הטקסט
    fontWeight: 'bold', // משקל הטקסט (מודגש)
    textAlign: 'right', // יישור הטקסט לימין
    paddingHorizontal: 10, // מרווח אופקי
    paddingVertical: 5, // מרווח אנכי
    borderRadius: 5, // פינות מעוגלות
  },
  mainButton: {
    backgroundColor: '#28A745', // צבע ירוק יפה

    borderRadius: 20,
    paddingHorizontal: 15, // מרחקים מצדדים
    paddingVertical: 8,    // מרחק מלמעלה ומלמטה
    alignItems: 'center',
    justifyContent: 'center',
    width: '40%',

  },
  mainButtonText: {
    color: '#FFFFFF', // צבע טקסט לבן
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalContainer2: {
    width: '80%',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',

  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  optionButton: {
    padding: 10,
    backgroundColor: '#000', // צבע כפתור אופציה
    borderRadius: 5,
    marginVertical: 5,
    width: '100%',
  },
  optionButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
  },
  optionButton1: {
    padding: 10,
    backgroundColor: '#28A745', // צבע כפתור אופציה
    borderRadius: 5,
    marginVertical: 5,
    width: '100%',
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#808080', // צבע כפתור סגירה
    borderRadius: 5,
    width: '100%',
  },
  closeButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
  },
  modalBackground2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // צבע רקע כהה עם שקיפות
  },
  modalContent2: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5, // עבור אנדרואיד כדי להוסיף צל
    alignItems: 'center',
  },

  modalTitle2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333', // צבע טקסט כהה
  },
  modalInput2: {
    width: '100%',
    height: 40,
    borderColor: '#DDDDDD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
    color: '#333333',
    textAlign: 'right', // יישור טקסט לימין

  },
  modalButtonsContainer2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel2: {
    flex: 1,
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 10,
    marginRight: 5,
    alignItems: 'center',
  },
  modalButtonSave2: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    marginLeft: 5,
    alignItems: 'center',
  },
  modalButtonText2: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,

  },
  
  picker: {
    height: 100,
    width: 100,

    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    textAlign: 'right', // יישור לימין

  },

  prefixInput: {
    width: 70, // רוחב מתאים לקידומת
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10, // רווח בין הקידומת לשדה הטלפון
    backgroundColor: '#f5f5f5',
    textAlign: 'center', // יישור מרכזי
    
  },
  header: {
    width: '100%',
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingTop: 50, // מרווח עליון מתחשב ב-Safe Area
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20, // ממקם את הכפתור בתחתית ה-`header`
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // מבטיח שהאזור יישב מעל כל התוכן
  },
  modalContent2: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalInput2: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    textAlign: 'right',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  prefixInput: {
    width: 70,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  modalButtonsContainer2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel2: {
    flex: 1,
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 10,
    marginRight: 5,
    alignItems: 'center',
  },
  modalButtonSave2: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    marginLeft: 5,
    alignItems: 'center',
  },
  modalButtonText2: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

  


export default Management;
