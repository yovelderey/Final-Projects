import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    navigation.setOptions({
      onSelectContacts: () => {
        // כאן אפשר להחזיר את הבחירה
        return localSelectedContacts;
      },
    });
  }, [navigation, localSelectedContacts]);
  
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
<Text style={styles.title}>האנשי קשר שלי: ({contacts.length})</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="חיפוש איש קשר..."
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
      />
<FlatList
  data={filteredContacts}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        Array.isArray(localSelectedContacts) && 
        localSelectedContacts.some((c) => c.id === item.id) 
          ? styles.selectedContactItem 
          : null,
      ]}
      onPress={() => handleSelectContact(item)}
    >
      <Text style={styles.contactName}>{item.name || 'No Name'}</Text>
      {item.phoneNumbers?.[0]?.number ? (
        <Text style={styles.contactNumber}>{item.phoneNumbers[0].number}</Text>
      ) : (
        <Text style={styles.contactNumber}>No Phone Number</Text>
      )}
    </TouchableOpacity>
  )}
/>

      
      <TouchableOpacity style={styles.button} onPress={navigateBackWithSelection}>
        <Text style={styles.buttonText}>הוסף אנשי קשר</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={navigateBack}
        style={[styles.showPasswordButton, { position: 'absolute', top: '7%', left: '97%' }]}
      >
        <Image source={require('../assets/no.png')} style={styles.backIcon} />
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
    textAlign: 'right', // יישור טקסט לימין

    borderRadius: 5,
    marginBottom: 10,
    marginTop: 45, // הוסף שורה זו כדי להוריד את שדה החיפוש מעט למטה
  },
  title: {
    fontSize: 20,
    marginTop: 40,

    fontWeight: 'bold',
    marginBottom: -15,
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
    backgroundColor: '#000',
    padding: 5,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    width: '45%',
    height: 40,

  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 30,
    height: 30,

  },
});


export default ContactsList;
