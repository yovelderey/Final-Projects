import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert, TextInput, Modal, Button } from 'react-native';
import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';

const Management = (props) => {
  const [contacts, setContacts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const id = props.route.params.id; // Accessing the passed id

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app would like to view your contacts.',
            buttonPositive: 'Please accept'
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          loadContacts();
        } else {
          Alert.alert('Permission Denied', 'Cannot access contacts without permission');
        }
      } else {
        loadContacts();
      }
    };

    requestPermissions();
  }, []);

  const loadContacts = () => {
    Contacts.getAll()
      .then((contacts) => {
        setContacts(contacts);
      })
      .catch((e) => {
        console.log(e);
        Alert.alert('Error', 'Failed to load contacts');
      });
  };

  const addContact = () => {
    if (newContactName.trim() && newContactPhone.trim()) {
      const newContact = {
        displayName: newContactName,
        phoneNumbers: [{ label: 'mobile', number: newContactPhone }],
      };
      Contacts.addContact(newContact)
        .then(() => {
          setContacts([...contacts, newContact]);
          setModalVisible(false);
          setNewContactName('');
          setNewContactPhone('');
          Alert.alert('Contact Added', 'Contact has been added successfully');
        })
        .catch((e) => {
          console.log(e);
          Alert.alert('Error', 'Failed to add contact');
        });
    } else {
      Alert.alert('Error', 'Please fill in both fields');
    }
  };

  const deleteContact = (contactId) => {
    Contacts.deleteContact({ recordID: contactId })
      .then(() => {
        setContacts((prevContacts) => prevContacts.filter((contact) => contact.recordID !== contactId));
        Alert.alert('Contact Deleted', 'Contact has been deleted successfully');
      })
      .catch((e) => {
        console.log(e);
        Alert.alert('Error', 'Failed to delete contact');
      });
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View>
        <Text style={styles.itemText}>{item.displayName}</Text>
        <Text style={styles.itemText}>{item.phoneNumbers[0]?.number}</Text>
      </View>
      <TouchableOpacity onPress={() => deleteContact(item.recordID)}>
        <Image source={require('../assets/delete.png')} style={styles.deleteIcon} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ניהול אנשי קשר</Text>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.recordID}
        style={styles.list}
      />
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  list: {
    width: '100%',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
