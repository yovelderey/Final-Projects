import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image,StyleSheet } from 'react-native';

const ContactsList = ({ route, navigation }) => {
  const { contacts, selectedContacts, onSelectContacts } = route.params;
  const [localSelectedContacts, setLocalSelectedContacts] = useState(selectedContacts);

  const handleSelectContact = (contact) => {
    if (localSelectedContacts.some((c) => c.id === contact.id)) {
      setLocalSelectedContacts(localSelectedContacts.filter((c) => c.id !== contact.id));
    } else {
      setLocalSelectedContacts([...localSelectedContacts, contact]);
    }
  };

  const navigateBackWithSelection = () => {
    onSelectContacts(localSelectedContacts);
    navigation.goBack();
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Contacts:</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.contactItem, localSelectedContacts.some((c) => c.id === item.id) ? styles.selectedContactItem : null]}
            onPress={() => handleSelectContact(item)}
          >
            <Text style={styles.contactName}>{item.name}</Text>
            {item.phoneNumbers && (
              <Text style={styles.contactNumber}>{item.phoneNumbers[0].number}</Text>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.button} onPress={navigateBackWithSelection}>
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={navigateBack}
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
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  contactItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedContactItem: {
    backgroundColor: '#e0e0e0',
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactNumber: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ContactsList;
