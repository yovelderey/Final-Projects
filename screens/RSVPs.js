import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';

const RSVPs = (props) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const navigation = useNavigation();

  const pickContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      if (data.length > 0) {
        navigation.navigate('ContactsList', {
          contacts: data,
          selectedContacts,
          onSelectContacts: handleSelectContacts,
        });
      }
    } else {
      alert('Permission to access contacts was denied');
    }
  };

  const handleSelectContacts = (contacts) => {
    setSelectedContacts(contacts);
    const contactDetails = contacts.map(contact => {
      const phoneNumber = contact.phoneNumbers ? contact.phoneNumbers[0].number : 'No phone number';
      return `${contact.name}: ${phoneNumber}`;
    });
    console.log("Selected Contacts:", contactDetails);
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickContacts}>
        <Text style={styles.buttonText}>Open Contacts</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
      <View style={styles.selectedContactsContainer}>
        {selectedContacts.map((contact) => (
          <Text key={contact.id} style={styles.selectedContactText}>{contact.name}</Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 50,
    height: 50,
  },
  selectedContactsContainer: {
    marginTop: 20,
    width: '100%',
  },
  selectedContactText: {
    fontSize: 18,
    marginVertical: 5,
  },
});

export default RSVPs;
