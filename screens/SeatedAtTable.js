import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal,FlatList, TextInput,Alert, StyleSheet,StatusBar , TouchableOpacity, } from 'react-native';
import { getDatabase, ref, push, remove, set } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import auth methods
import { onValue } from 'firebase/database';
import 'firebase/compat/storage';

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





  const addContact = () => {
    const recordidd = String(new Date().getTime());
    const databaseRef = ref(database, `Events/${user.uid}/${id}/tables/${recordidd}`);

    if (newContactName.trim() && newContactPhone.trim()) {
      const newContact = {
        recordID: recordidd,
        displayName: newContactName,
        phoneNumbers: newContactPhone,
      };
      set(databaseRef, newContact); // שימור האיש קשר במסד הנתונים כאיבר חדש
      setContacts([...contacts, newContact]);
      setModalVisible(false);
      setNewContactName('');
      setNewContactPhone('');
    } else {
      Alert.alert('Error', 'Please fill in both fields');
    }
  };

  const deleteContact = async (contactId) => {
    if (user) {

      const contactRef = ref(database, `Events/${user.uid}/${id}/contacts/${contactId}`);
      try {
        
        await remove(contactRef);
        setContacts((prevContacts) => prevContacts.filter((contact) => contact.recordID !== contactId));
      } catch (error) {
        console.error('Error deleting contact from Firebase:', error);
        Alert.alert('Error', 'Failed to delete contact. Please try again.');
      }
    } else {
      Alert.alert('Error', 'User not authenticated. Please log in.');
    }
  };
  


  const renderItem = ({ item, index }) => (
    <View style={[styles.itemContainer, { backgroundColor: index % 2 === 0 ? '#f5f5f5' : '#ffffff' }]}>
  <TouchableOpacity onPress={() => deleteContact(item.recordID)}>
    <Image source={require('../assets/delete.png')} style={styles.deleteIcon} />
  </TouchableOpacity>


  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
    <View>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={styles.itemText}>{item.displayName}</Text>
      <Text style={styles.itemText}>{item.phoneNumbers}</Text>
    </View>
  </View>
</View>

  );

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
      <Text style={styles.noItemsText2}>פורמט jpeg, png, jpg</Text>
  
      <View style={styles.tableContainer}>
        <FlatList
          data={contacts}
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
  
      <Text style={styles.contactCount}>מספר שולחנות: {contacts.length}</Text>
    
      <Modal visible={modalVisible} animationType="slide">
        <Image source={require('../assets/Signbac.png')} style={styles.backIcon2} />
  
        <View style={styles.modalContainer}>
          <View style={styles.buttonContainer3}>
            <Text style={styles.modalTitle}>הוסף שולחן חדש</Text>
  
            <TextInput
              style={styles.input}
              placeholder=" שם שולחן"
              value={newContactName}
              onChangeText={setNewContactName}
            />
          </View>
  
          <View style={styles.buttonContainer2}>
            <TextInput
              style={styles.input2}
              placeholder="שם אורח"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
            />
          </View>
  
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.modalButton} onPress={addContact}>
              <Text style={styles.modalButtonText}>הוסף</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 18,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
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
});

export default SeatedAtTable;
