import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Image, FlatList, Alert } from 'react-native';
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
        setSelectedContacts(data);
      }
    } else {
      Alert.alert('Permission to access contacts was denied');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={selectedContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.contactItem}>
            <Text style={styles.contactName}>{item.name}</Text>
            {item.phoneNumbers && (
              <Text style={styles.contactNumber}>{item.phoneNumbers[0].number}</Text>
            )}
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={pickContacts}
      >
        <Text style={styles.buttonText}>Select Contacts</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('ListItem', { id: props.route.params.id })}
        style={styles.backButton}
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
    padding: 20,
  },
  contactItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
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
    position: 'absolute',
    bottom: 80,
    width: '80%',
    alignItems: 'center',
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
});

export default RSVPs;
