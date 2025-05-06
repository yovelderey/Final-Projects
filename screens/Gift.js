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
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';



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
  const [averagePrice, setAveragePrice] = useState(0);
  const [paidGuestsCount, setPaidGuestsCount] = useState(0); // ספירת אורחים ששילמו
  const navigation = useNavigation();
  const chartConfig = {
    backgroundGradientFrom: '#f5f5f5',
    backgroundGradientTo: '#f5f5f5',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };
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
    
      // חישוב הממוצע כערך שלם
      const validPrices = contactsArray.filter(contact => parseFloat(contact.newPrice));
      const average = validPrices.length > 0 ? Math.round(total / validPrices.length) : 0;
      setAveragePrice(average);
    
      // ספירת אורחים ששילמו
      const paidCount = contactsArray.filter(contact => parseFloat(contact.newPrice) > 0).length;
      setPaidGuestsCount(paidCount);
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
const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = מהגבוה לנמוך, 'asc' = מהנמוך לגבוה

const sortContactsByPrice = () => {
  const sortedContacts = [...contacts].sort((a, b) => {
    const priceA = parseFloat(a.newPrice) || 0;
    const priceB = parseFloat(b.newPrice) || 0;
    return sortOrder === 'desc' ? priceB - priceA : priceA - priceB;
  });
  setContacts(sortedContacts);
  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc'); // שינוי כיוון המיון
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
    <ImageBackground
      source={require('../assets/backgruond_gift.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>רשימת מתנות</Text>
        </View>
  
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
                placeholder="חפש מוזמנים"
                value={searchQuery}
                onChangeText={text => setSearchQuery(text)}
              />
            </View>
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
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchAndSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginBottom: 10, // מרווח קטן לפני ה-FlatList
  },
  tableContainer: {
    width: '100%',
    flex: 1, // נותן לטבלה לקחת את כל המקום הזמין
    alignItems: 'center',
    marginTop: 10, // מרווח קטן מתחת ל-header
    marginBottom: 10, // מרווח קטן לפני ה-FlatList

  },
  sortButton: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  sortIcon: {
    width: 26,
    height: 26,
    tintColor: 'black',
  },
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
    maxHeight: 450, // גובה מקסימלי לטבלה
    minHeight: 100, // גובה מינימלי לטבלה
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // להוספת צל באנדרואיד

  },
  
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  backgroundContainer: {
    padding: 10,
    borderRadius: 10,
    width: '90%',
    marginBottom: 60,
    marginTop: -10, // מרווח קטן מתחת ל-header
    marginBottom: 20, // מרווח קטן לפני ה-FlatList
    
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',  // פיזור אחיד של הסקשנים
    alignItems: 'center',
    width: '100%',                   // הרחבת השורה לרוחב מלא
    paddingHorizontal: 0,    
  },
  section: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,     // הקטנת המרווח בין הסקשנים כדי לתת יותר מקום לרוחב
  },

  header2: {
    fontSize: 19,
    color: 'rgba(108, 99, 255, 0.9)',
    marginBottom: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  priceContainer: {
    paddingVertical: 10,       // רווח פנימי אנכי
    paddingHorizontal: 10,     // רווח פנימי אופקי
    borderRadius: 15,          // פינות מעוגלות
    borderWidth: 1,
    width: '100%',             // הרחבת הרוחב למלוא הקונטיינר
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,             // גובה מינימלי לקונטיינר
    flexDirection: 'row',  
    borderColor: 'rgba(108, 99, 255, 0.9)',   // סידור אופקי של התוכן
  },
  
  textPrice: {
    fontSize: 30,              // גודל טקסט קטן יותר כדי להתאים מספרים גדולים
    color: 'rgba(108, 99, 255, 0.9)',
    textAlign: 'center',       // יישור מרכזי של הטקסט
    flexShrink: 1,     
    fontWeight: 'bold',
    // מניעת שבירת השורה על ידי הקטנת האלמנט במידת הצורך
  },
  separator: {
    height: 2,
    backgroundColor: '#ccc',
    marginVertical: 5,
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
    borderRadius: 5,
    marginRight: 10,
    fontWeight: 'bold',

  },
  itemText: {
    fontSize: 16,
    fontWeight: 'bold',

  },
  exportButton: {
    flexDirection: 'row', // Make sure items are aligned horizontally
    alignItems: 'center', // Center items vertically
    backgroundColor: '#4CAF50', // Background color for the button
    padding: 10,
    borderRadius: 10,
    paddingHorizontal: 85, // Increase horizontal padding for wider button
    marginBottom: 30, // מרווח קטן לפני ה-FlatList
  },
  backIcon2: {
    width: 30,
    height: 30,
    marginRight: 8, // Small space between the image and text

  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    padding: 0,
    borderRadius: 15,
    width: '90%',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,       // עובי השוליים
    borderColor: 'black', // צבע השוליים
    borderRadius: 10,  
  },
  
  chartBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // להוספת צל באנדרואיד
    width: '100%',
    alignItems: 'center',
  },
  
  chartTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  
  pieChart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  
});

export default Gift;