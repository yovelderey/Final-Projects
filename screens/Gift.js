import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert, TextInput, Modal, PermissionsAndroid, StatusBar, Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import 'firebase/database';
import firebase from 'firebase/compat/app';
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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

const Gift = (props) => {
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [user, setUser] = useState(null);
  const id = props.route.params.id;
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
      }

      onAuthStateChanged(auth, (currentUser) => {
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
        newPrice: ''
      };
      set(databaseRef, newContact);
      setContacts([...contacts, newContact]);
      setModalVisible(false);
      setNewContactName('');
      setNewContactPhone('');
    } else {
      Alert.alert('Error', 'Please fill in both fields');
    }
  };

  const updatePrice = (recordID, price) => {
    const databaseRef = ref(database, `Events/${user.uid}/${id}/contacts/${recordID}`);
    const updatedContacts = contacts.map(contact =>
      contact.recordID === recordID ? { ...contact, newPrice: price } : contact
    );
    setContacts(updatedContacts);
    set(databaseRef, { ...contacts.find(contact => contact.recordID === recordID), newPrice: price });
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
      <StatusBar backgroundColor="#FFC0CB" barStyle="dark-content" />
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={styles.title}>רשומת מתנות</Text>
      </View>

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

      <Text style={styles.contactCount}>כמות אנשי קשר: {contacts.length}</Text>

      <Modal visible={modalVisible} animationType="slide">
        <Image source={require('../assets/Signbac.png')} style={styles.backIcon2} />
        <View style={styles.modalContainer}>
          <View style={styles.buttonContainer3}>
            <Text style={styles.modalTitle}>הוסף איש קשר חדש</Text>
            <TextInput
              style={styles.input}
              placeholder="שם"
              value={newContactName}
              onChangeText={setNewContactName}
            />
          </View>
          <View style={styles.buttonContainer2}>
            <TextInput
              style={styles.input2}
              placeholder="מספר טלפון"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
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

      <TouchableOpacity
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.showPasswordButton, { position: 'absolute', top: '92%', left: '4%' }]}
      >
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  topBar: {
    width: '120%',
    backgroundColor: '#ff69b4',
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
    flex: 1,
    width: '100%',
    maxHeight: '50%',
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
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginRight: 10,
  },
  itemText: {
    fontSize: 16,
  },
  separator: {
    height: 2,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 50,
    height: 50,
  },
});

export default Gift;
