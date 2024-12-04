import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal,FlatList, TextInput,Alert, StyleSheet,StatusBar , TouchableOpacity, } from 'react-native';
import { getDatabase, ref, push, remove, set } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import auth methods
import { onValue } from 'firebase/database';
import 'firebase/compat/storage';
import * as Print from 'expo-print';

import 'firebase/database'; // Import the Realtime Database module
import  firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8LTCh_O_C0mFYINpbdEqgiW_3Z51L1ag",
  authDomain: "final-project-d6ce7.firebaseapp.com",
  projectId: "final-project-d6ce7",
  storageBucket: "final-project-d6ce7.appspot.com",
  messagingSenderId: "1056060530572",
  appId: "1:1056060530572:web:d08d859ca2d25c46d340a9",
  measurementId: "G-LD61QH3VVP"
};

if (!firebase.apps.length){
  firebase.initializeApp(firebaseConfig);
}




const SeatedAtTable = (props) => {

  const id = props.route.params.id; // Accessing the passed id
  const userId = props.route.params.id; // Accessing the unique user ID
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [user, setUser] = useState(null); // State to hold user info
  const [selectedImage, setSelectedImage] = useState(null);
  const auth = getAuth();
  const database = getDatabase();
  const storage = firebase.storage();
  const [images, setImages] = useState(Array(1).fill(null));
  const [userId2, setUserId2] = useState(null);
  const [allContacts, setAllContacts] = useState([]); // כל אנשי הקשר שנמצאים בנתיב
  const [selectedContacts, setSelectedContacts] = useState([]); // אנשי קשר שנבחרו
  const [searchText, setSearchText] = useState('');
  const filteredContacts = contacts.filter((item) => {
    const tableNameMatches = item.displayName.toLowerCase().includes(searchText.toLowerCase());
  
    const guestNameMatches =
      item.guests &&
      item.guests.some((guest) =>
        guest.displayName.toLowerCase().includes(searchText.toLowerCase())
      );
  
    return tableNameMatches || guestNameMatches;
  });
  


  useEffect(() => {
    const fetchUserId = async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        setUserId2(user.uid);
        loadImagesFromStorage(user.uid);
      } else {
        Alert.alert("משתמש לא מחובר");
      }
    };
    fetchUserId();

    const requestPermissions = async () => {


      onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const databaseRef = ref(database, `Events/${currentUser.uid}/${id}/tables`);

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

  const loadImagesFromStorage = async (userId) => {
    try {
      const imageName = 'image_0.jpg'; // חשוב לוודא ששימוש בשם התמונה מתאים
      const listRef = storage.ref().child(`users/${userId}/${id}/seatOnTables/${imageName}`);
      const downloadURL = await listRef.getDownloadURL();
      setSelectedImage(downloadURL);
    } catch (error) {
    }
  };
  

  const handleButtonPress = async (index) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri, `image_${index}.jpg`, index);
    }
  };

const uploadImage = async (uri, imageName, index) => {
  let alertShown = false;

  if (!userId2) {
    Alert.alert("User ID not found. Please log in.");
    return;
  }
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ref = storage.ref().child(`users/${userId2}/${id}/seatOnTables/${imageName}`);
    
    const uploadTask = ref.put(blob);

    uploadTask.on(
      'state_changed',
      () => {

        uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
          setSelectedImage(downloadURL);
        });
      },
      (error) => {
        console.error("כשל בטעינת התמונה:", error.message);
        Alert.alert("Image upload failed:", error.message);
      }
    );
    if (!alertShown) {
      Alert.alert("התמונה נטענה בהצלחה!");
      alertShown = true;
    }
  } catch (error) {
    console.error("Image upload failed:", error.message);
    Alert.alert("Image upload failed:", error.message);
  }
};


useEffect(() => {
  if (user) {
    const contactsRef = ref(database, `Events/${user.uid}/${id}/contacts`);
    onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAllContacts(Object.values(data)); // שמירת אנשי הקשר מהרשימה ב-state
      } else {
        setAllContacts([]);
      }
    });
  }
}, [user]);

const handlePrint = async (content) => {
  try {
    await Print.printAsync({
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              p { font-size: 14px; margin: 5px 0; }
            </style>
          </head>
          <body>
            <p>${content.replace(/\n/g, '<br/>')}</p>
          </body>
        </html>
      `,
    });
  } catch (error) {
    //Alert.alert('שגיאה בהדפסה', error.message);
  }
};
const addContact = () => {
  const recordidd = String(new Date().getTime());
  const databaseRef = ref(database, `Events/${user.uid}/${id}/tables/${recordidd}`);
  const tableNumber = contacts.length + 1;

  if (newContactName.trim()) {
    const newContact = {
      recordID: recordidd,
      numberTable: `שולחן ${tableNumber}`,
      displayName: newContactName,
      guests: selectedContacts.map((contactId) => {
        return allContacts.find((contact) => contact.recordID === contactId);
      }),
    };
    set(databaseRef, newContact);
    setContacts([...contacts, newContact]);
    setModalVisible(false);
    setNewContactName('');
    setSelectedContacts([]); // איפוס הבחירה
  } else {
    Alert.alert('Error', 'Please fill in the table name');
  }
};

const printAllTables = async () => {
  if (contacts.length === 0) {
    Alert.alert("אין שולחנות להדפסה");
    return;
  }

  const allTableData = contacts.map((item, index) => {
    const guestNames = item.guests?.map((guest) => guest.displayName || 'ללא שם').join(', ') || 'אין אורחים';
    return `
      <div style="page-break-after: always;">
        <h2>שולחן ${index + 1} - ${item.displayName || 'ללא שם'}</h2>
        <p><strong>מספר אנשים:</strong> ${item.guests?.length || 0}</p>
        <p><strong>אורחים:</strong> ${guestNames}</p>
      </div>
    `;
  });

  const printContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { color: #333; margin-bottom: 10px; }
          p { font-size: 14px; margin: 5px 0; }
          div { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        ${allTableData.join('')}
      </body>
    </html>
  `;

  await handlePrint(printContent);
};




const deleteTable = (recordID) => {
  const tableRef = ref(database, `Events/${user.uid}/${id}/tables/${recordID}`);
  remove(tableRef)
    .then(() => {
      setContacts((prevContacts) =>
        prevContacts.filter((contact) => contact.recordID !== recordID)
      );
      Alert.alert("השולחן נמחק בהצלחה!");
    })
    .catch((error) => {
      console.error("Error deleting table:", error);
      Alert.alert("שגיאה במחיקת שולחן:", error.message);
    });
};

const deleteAllTables = () => {
  const tablesRef = ref(database, `Events/${user.uid}/${id}/tables`);
  remove(tablesRef)
    .then(() => {
      setContacts([]);
      Alert.alert("כל השולחנות נמחקו בהצלחה!");
    })
    .catch((error) => {
      console.error("Error deleting all tables:", error);
      Alert.alert("שגיאה במחיקת כל השולחנות:", error.message);
    });
};



  
  const toggleContactSelection = (contactId) => {
    setSelectedContacts((prevSelected) => {
      if (prevSelected.includes(contactId)) {
        return prevSelected.filter((id) => id !== contactId); // הסרת איש קשר מהרשימה
      } else {
        return [...prevSelected, contactId]; // הוספת איש קשר לרשימה
      }
    });
  };

  const renderItem = ({ item, index }) => {
    const backgroundColor = index % 2 === 0 ? '#f5f5f5' : '#ffffff';
  
    return (
      <View style={[styles.itemContainer, { backgroundColor }]}>
        {/* מספר השולחן */}
        <Text style={styles.tableNumber}>{`שולחן ${index + 1}`}</Text>
  
        {/* שם השולחן */}
        <Text style={styles.tableName}>{item.displayName || 'ללא שם'}</Text>
  
        {/* מספר האנשים בשולחן */}
        <Text style={styles.guestCount}>
          {item.guests && item.guests.length > 0
            ? `מספר אנשים: ${item.guests.length}`
            : 'אין אנשים בשולחן'}
        </Text>
  
        {/* שמות האנשים לרוחב */}
        {item.guests && item.guests.length > 0 ? (
          <View style={styles.guestListHorizontal}>
            {item.guests.map((guest, guestIndex) => (
              <Text key={guestIndex} style={styles.guestName}>
                {guest.displayName || 'ללא שם'}
              </Text>
            ))}
          </View>
        ) : null}
  
        {/* כפתור מחיקה */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteTable(item.recordID)}
        >
          <Text style={styles.deleteButtonText}>מחק</Text>
        </TouchableOpacity>
  
        <TouchableOpacity
          style={styles.printButton}
          onPress={() => {
            const content = `
              שולחן ${index + 1} - ${item.displayName || 'ללא שם'}
              מספר אנשים: ${item.guests?.length || 0}
              אורחים: ${
                item.guests?.map((guest) => guest.displayName || 'ללא שם').join(', ') || 'אין אורחים'
              }
            `;
            handlePrint(content);
          }}
        >
          <Text style={styles.printButtonText}>הדפס</Text>
        </TouchableOpacity>


      </View>
    );
  };
  
  
  

  return (
    <View style={styles.container}>
  
      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>ניהול שולחנות</Text>
      </View>
  
      <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })}>
        <Image source={require('../assets/back_icon2.png')} style={styles.imageback} />
      </TouchableOpacity>

      {selectedImage ? (
        <TouchableOpacity onPress={() => handleButtonPress(0)} style={styles.imagePlaceholder}>
          <Image source={{ uri: selectedImage }} style={styles.imageBackground2} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => handleButtonPress(0)} style={styles.imagePlaceholder}>
          <Image source={require('../assets/uploadimg.png')} style={styles.imageBackground} />
        </TouchableOpacity>
      )}

      
      <Text style={styles.noItemsText}>לחץ על התמונה להעלות תרשים אולם</Text>
      <View style={styles.buttonsContainer}>
  {/* כפתור מחיקת כל השולחנות */}
  <TouchableOpacity
    style={styles.deleteAllButton}
    onPress={deleteAllTables}
  >
    <Text style={styles.deleteAllButtonText}>מחק הכל</Text>
  </TouchableOpacity>

  <TouchableOpacity
      style={styles.dummyButton}
      onPress={printAllTables}
    >
      <Text style={styles.dummyButtonText}>הדפס הכל</Text>
  </TouchableOpacity>

  {/* מספר השולחנות */}
  <Text style={styles.tableCountText}>({contacts.length})</Text>
</View>

      <TextInput
        style={styles.searchInput}
        placeholder="חפש שולחן..."
        value={searchText}
        onChangeText={setSearchText}
      />


      <View style={styles.tableContainer}>
        <FlatList
          data={filteredContacts}
          renderItem={renderItem}
          keyExtractor={(item) => item.recordID}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
  
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.addButton} >
        <Text style={styles.addButtonText}>הוסף שולחן +</Text>        
      </TouchableOpacity>
  
    
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>הוסף שולחן חדש</Text>
          <TextInput
            style={styles.input}
            placeholder="שם שולחן"
            value={newContactName}
            onChangeText={setNewContactName}
          />
          <FlatList
            data={allContacts}
            keyExtractor={(item) => item.recordID}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleContactSelection(item.recordID)}
                style={[
                  styles.contactItem,
                  selectedContacts.includes(item.recordID) && styles.contactItemSelected,
                ]}
              >
                <Text style={styles.contactName}>{item.displayName}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalButton} onPress={addContact}>
            <Text style={styles.modalButtonText}>הוסף</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
            <Text style={styles.modalButtonText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </Modal>

  

    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#ffffff', // רקע לבן לכל הקונטיינר
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center', // יישור למרכז
    marginBottom: 5,
  },
  
  backIcon: {
    width: 60,
    height: 60,
  },
  imageBackground: {
    width: '100%',
    height: '90%',
    marginBottom: -185,
  },
  imageBackground2: {
    width: '100%',
    height: '90%',
    marginBottom: -175,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    width: '100%',
    height: '30%',
    marginTop: 100, // Adjust margin to position correctly

    marginBottom: -80,
  },
  noItemsText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 80, // Adjust margin to position correctly
  },
  noItemsText2: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 5, // Adjust margin to position correctly
  },
  topBar: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'absolute',
    top: 0,
  },
  tableContainer: {
    flex: 1,
    width: '100%',
    maxHeight: '37%',
    marginVertical: 20,
  },
  list: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  },
  itemContainer: {
    flexDirection: 'column', // שורות במקום טורים
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative', // מיקום יחסי לכפתור המחיקה
  },
  itemText: {
    fontSize: 18,
  },
  deleteIcon: {
    width: 24,
    height: 24,
  },
  contactCount: {
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageback: {
    width: 40,
    height: 40,
    marginTop: 70,
    marginBottom: -90,

    marginRight: 300,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '80%',
    height: 40,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 370,
    backgroundColor: '#fff',
  },
  input2: {
    width: '80%',
    height: 40,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 370,
    backgroundColor: '#fff',
  },
  separator: {
    height: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer2: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer3: {
    position: 'absolute',
    bottom: 140,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  addButton: {
    padding: 6,
    width: '40%',
    height: 40,
    backgroundColor: '#000',
    borderRadius: 15,
    position: 'absolute',
    bottom: 30,
    justifyContent: 'center',
    alignItems: 'center',

  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,

  },
  backIcon: {
    width: 50,
    height: 50,
  },
  backIcon2: {
    width: 400,
    height: 850,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  contactItem: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  contactItemSelected: {
    backgroundColor: '#d0f0c0',
  },
  contactName: {
    fontSize: 16,
    color: '#333',
  },
  deleteButton: {
    position: 'absolute', // מיקום יחסי
    top: 10,
    right: 10, // בצד שמאל
    padding: 8,
    backgroundColor: '#f44336',
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  deleteAllButton: {
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 5,
    alignItems: 'center',
    margin: 10,
  },
  deleteAllButton: {
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 5,
    alignItems: 'center',
    flex: 1, // כפתור בגודל יחסי
    marginRight: 5, // מרווח בין הכפתורים
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center', // יישור למרכז
    marginBottom: 5,
  },
  guestCount: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center', // יישור למרכז
  },
  guestList: {
    marginTop: 10,
  },
  guestName: {
    fontSize: 14,
    color: '#555',
    marginRight: 10, // מרווח בין שמות
  },
  guestListHorizontal: {
    flexDirection: 'row', // הצגת שמות האורחים לרוחב
    flexWrap: 'wrap', // מעבר לשורה חדשה אם השורה ארוכה מדי
    marginTop: 5,
  },
  searchInput: {
    width: '90%', // שורת החיפוש תתפרס על רוב הרוחב
    alignSelf: 'center', // ממרכז את שורת החיפוש
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25, // פינות מעוגלות
    backgroundColor: '#fff',
    shadowColor: '#000', // אפקט צל קל
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2, // הצללה באנדרואיד
  },
  
  dummyButton: {
    padding: 10,
    backgroundColor: '#2196F3',
    borderRadius: 5,
    alignItems: 'center',
    flex: 1, // כפתור בגודל יחסי
    marginRight: 5, // מרווח בין הכפתור לטקסט
  },
  dummyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    flex: 1, // טקסט בגודל יחסי
  },
  buttonsContainer: {
    flexDirection: 'row', // יישור אופקי של הכפתורים והטקסט
    alignItems: 'center', // יישור אנכי של הכפתורים והטקסט
    justifyContent: 'space-between', // מרווחים בין האלמנטים
    marginVertical: 10,
    width: '90%',
    alignSelf: 'center',
  },
  tableCountText: {
    fontSize: 16, // גודל טקסט מתאים
    fontWeight: 'bold', // טקסט מודגש
    color: '#333', // צבע כהה
    textAlign: 'center', // מיושר למרכז
    marginLeft: 10, // מרווח קטן מהכפתורים האחרים
  },
  printButton: {
    padding: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginLeft: 10,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  
});

export default SeatedAtTable;
