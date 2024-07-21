import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';

const ContactsList = ({ route, navigation }) => {
  const { contacts, selectedContacts, onSelectContacts } = route.params;
  const [localSelectedContacts, setLocalSelectedContacts] = useState(selectedContacts);
  const [searchQuery, setSearchQuery] = useState('');

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


  const filteredContacts = contacts.filter((contact) => {
    return contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase());
  });
  

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="חיפוש איש קשר..."
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
      />
      <Text style={styles.title}>האנשי קשר שלי:</Text>
      <FlatList
        data={filteredContacts}
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
        <Text style={styles.buttonText}>הוסף אנשי קשר</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={navigateBack}
        style={[styles.showPasswordButton, { position: 'absolute', top: '90%', left: '1%' }]}
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
  searchInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
    marginTop: 45, // הוסף שורה זו כדי להוריד את שדה החיפוש מעט למטה
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
    backgroundColor: '#ff69b4',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    width: '90%',

  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 50,
    height: 50,

  },
});


export default ContactsList;
