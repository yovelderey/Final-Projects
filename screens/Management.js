import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert, TextInput, Modal, Button, PermissionsAndroid, Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, remove, set } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import auth methods
import { onValue } from 'firebase/database';


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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app); // Get the auth instance

const Management = (props) => {
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [user, setUser] = useState(null); // State to hold user info
  const id = props.route.params.id; // Accessing the passed id


  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
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

  const addContact = () => {
    const recordidd = String(new Date().getTime());
    const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordidd}`);

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
        Alert.alert('Contact Deleted', 'Contact has been deleted successfully');
      } catch (error) {
        console.error('Error deleting contact from Firebase:', error);
        Alert.alert('Error', 'Failed to delete contact. Please try again.');
      }
    } else {
      Alert.alert('Error', 'User not authenticated. Please log in.');
    }
  };
  

  const renderItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <View>
        <Text style={styles.itemText}>{item.displayName}</Text>
        <Text style={styles.itemText}>{item.phoneNumbers}</Text>

      </View>
      <TouchableOpacity onPress={() => deleteContact(item.recordID)}>
        <Image source={require('../assets/delete.png')} style={styles.deleteIcon} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ניהול אנשי קשר</Text>
      <View style={styles.tableContainer}>
        <FlatList
          data={contacts}
          renderItem={renderItem}
          keyExtractor={(item) => item.recordID}
          style={styles.list}
        />
      </View>
      <Text style={styles.contactCount}>כמות אנשי קשר: {contacts.length}</Text>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.addButton, { position: 'absolute', top: '91%', left: '4%' }]}
      >
        <Text style={styles.addButtonText}>הוסף אנשי קשר</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.backButton, { position: 'absolute', top: '91%', right: '4%' }]}
      >
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>הוסף איש קשר חדש</Text>
          <TextInput
            style={styles.input}
            placeholder="שם"
            value={newContactName}
            onChangeText={setNewContactName}
          />
          <TextInput
            style={styles.input}
            placeholder="מספר טלפון"
            value={newContactPhone}
            onChangeText={setNewContactPhone}
            keyboardType="phone-pad"
          />
          <Button title="הוסף" onPress={addContact} />
          <Button title="ביטול" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tableContainer: {
    flex: 1,
    width: '100%',
    maxHeight: '50%',
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
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  itemText: {
    fontSize: 18,
  },
  deleteIcon: {
    width: 24,
    height: 24,
  },
  addButton: {
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  contactCount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
  },
});

export default Management;
