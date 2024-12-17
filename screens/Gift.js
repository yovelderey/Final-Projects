import React, { useState, useEffect } from 'react';
import { View, Text,ImageBackground, FlatList, StyleSheet, TouchableOpacity, Image, Alert, TextInput, Modal, PermissionsAndroid, StatusBar, Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';



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

const Gift = (props) => {
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [user, setUser] = useState(null);
  const id = props.route.params.id;
  const [searchQuery, setSearchQuery] = useState('');
  const auth = getAuth();
  const database = getDatabase();
  const [totalPrice, setTotalPrice] = useState(0); // סטייט לסכום הכולל
  const insets = useSafeAreaInsets();

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
    };

    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/contacts`);
        onValue(databaseRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const contactsArray = Object.values(data);
            setContacts(contactsArray);
            calculateTotalPrice(contactsArray);
          } else {
            setContacts([]);
            setTotalPrice(0); // אפס את הסכום הכולל אם אין אנשי קשר
          }
        });
      } else {
        setUser(null);
        setContacts([]);
        setTotalPrice(0);
      }
    });

    requestPermissions();
  }, []);




const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const exportToExcel = async () => {
  try {
    // המרת אנשי הקשר למבנה המתאים לייצוא
    const data = contacts.map(contact => ({
      Name: contact.displayName,
      Phone: contact.phoneNumbers,
      Price: contact.newPrice || 0,
    }));

    // יצירת דף עבודה וחוברת עבודה
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");

    // המרת חוברת העבודה למערך של bytes
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // המרת buffer ל-base64
    const base64 = arrayBufferToBase64(excelBuffer);
    const fileName = 'Contacts.xlsx';
    const path = FileSystem.documentDirectory + fileName; // השתמש ב-documentDirectory

    // שמירה כקובץ ב-documentDirectory
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });

    // בדוק אם שיתוף אפשרי
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path);
    } else {
      Alert.alert('Sharing not available', 'Sharing is not available on this device');
    }

    //Alert.alert('Success', `Excel file saved successfully at ${path}`);
  } catch (error) {
    console.error('Error saving file:', error);
    Alert.alert('Error', 'There was a problem saving the file');
  }
};


const updatePrice = (recordID, price) => {
  // המרת הקלט למספר
  const numericPrice = parseFloat(price) || 0;

  // בדיקה אם המחיר חורג מהסכום המותר
  if (numericPrice > 100000) {
    Alert.alert('הגבלת מחיר', 'לא ניתן להזין מחיר גבוה מ-100,000.');
    return;
  }

  const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordID}`);
  const updatedContacts = contacts.map(contact =>
    contact.recordID === recordID ? { ...contact, newPrice: price } : contact
  );

  setContacts(updatedContacts);
  set(databaseRef, { ...contacts.find(contact => contact.recordID === recordID), newPrice: price });

  // חישוב מחדש של הסכום הכולל
  const total = updatedContacts.reduce((sum, contact) => {
    return sum + (parseFloat(contact.newPrice) || 0);
  }, 0);
  setTotalPrice(total);
};


  const filteredContacts = contacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumbers.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.newPrice && contact.newPrice.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderItem = ({ item, index }) => (
    <View style={[styles.itemContainer, { backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#ffffff' }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={styles.itemInput}
          placeholder="מחיר"
          keyboardType="numeric"
          value={item.newPrice}
          onChangeText={(text) => updatePrice(item.recordID, text)}
        />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.itemText}>{item.displayName}</Text>
          <Text style={styles.itemText}>{item.phoneNumbers}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
          <ImageBackground
          source={require('../assets/backgruond_gift.png')} // טוען את ה-GIF מהתיקייה המקומית
          style={styles.gif}
          resizeMode="cover" // כדי שה-GIF יכסה את כל המסך
        />    
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>רשימת מתנות</Text>
      </View>

      <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })}>
        <Image source={require('../assets/back_icon2.png')} style={styles.imageback} />
      </TouchableOpacity>

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
            onChangeText={text => setSearchQuery(text)}
          />
          <FlatList
            data={filteredContacts}
            renderItem={renderItem}
            keyExtractor={(item) => item.recordID}
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      <View style={styles.backgroundContainer}>
        <View style={styles.row}>
          <View style={styles.section}>
            <Text style={styles.header}>כמות מוזמנים</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.textPrice}> {contacts.length}</Text>
            </View>
          </View>
          <View style={styles.section}>
            <Text style={styles.header}>סך הכל</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.textPrice}>{totalPrice}₪</Text>
            </View>
          </View>
        </View>
      </View>



      <TouchableOpacity onPress={exportToExcel} style={styles.exportButton}>
        <Image source={require('../assets/excel.png')} style={styles.backIcon2} />
        <Text style={styles.exportButtonText}>ייצא לקובץ אקסל</Text>

      </TouchableOpacity>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  topBar: {
    width: '70%',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    top: 0, 
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tableContainer: {
    width: '100%',
    maxHeight: '60%',
    alignItems: 'center', // למרכז את התוכן אופקית
    position: 'absolute',
    top: 110, 
  },
  list: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  },
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
    borderColor: '#000',
    borderRadius: 5,
    marginRight: 10,
    fontWeight: 'bold',

  },
  itemText: {
    fontSize: 16,
    fontWeight: 'bold',

  },
  separator: {
    height: 2,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  noItemsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 16,
    color: '#000',
    position: 'absolute',
    top: 200, 
    zIndex: 1000, 

  },
  noItemsText: {
    fontSize: 18,
    color: '#999',
  },
  contactCount: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  input2: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  totalPriceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: 'red',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
  },
  imageback: {
    width: 40,
    height: 40,
    position: 'absolute',
    top: -800, 
    left: -190, 
    zIndex: 0, 
  },
  buttonContainer3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  buttonContainer2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  searchInput: {
    width: '90%', // רוחב 80% מהמסך
    height: 40, // גובה הקלט
    borderColor: '#ccc', // צבע הגבול
    borderWidth: 1, // עובי הגבול
    borderRadius: 8, // עיגול הפינות
    paddingHorizontal: 10, // מרווח פנימי אופקי
    fontSize: 16, // גודל הפונט
    color: '#333', // צבע הטקסט
    backgroundColor: '#fff', // צבע הרקע
    textAlign: 'right', // יישור הטקסט לימין
    marginBottom: 20, // מרווח תחתון
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  showPasswordButton: {
    backgroundColor: '#ff69b4',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  backIcon2: {
    width: 30,
    height: 30,
    marginRight: 8, // Small space between the image and text

  },
  exportButton: {
    flexDirection: 'row', // Make sure items are aligned horizontally
    alignItems: 'center', // Center items vertically
    backgroundColor: '#4CAF50', // Background color for the button
    padding: 10,
    borderRadius: 10,
    position: 'absolute',
    top: 750, 
    zIndex: 1000,     paddingHorizontal: 95, // Increase horizontal padding for wider button

  },
  icon2: {
    width: 24, // Size of the image
    height: 24,
    marginRight: 8, // Small space between the image and text
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backgroundContainer: {
    backgroundColor: '#ff69b4', // Background color for the whole row
    padding: 10,
    borderRadius: 10,
    width: '90%',
    position: 'absolute',
    top: 650, 
    zIndex: 1000, 
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // Add padding to create space between the sections
  },
  section: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  header: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  priceContainer: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    width: '100%',
    alignItems: 'center',

  },
  textPrice: {
    fontSize: 16,
    color: '#000000',
  },
  gif: {
    width: '100%',
    height: '100%',

  },
});

export default Gift;
