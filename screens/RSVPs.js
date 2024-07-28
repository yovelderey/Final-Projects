import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';

const RSVPs = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [responses, setResponses] = useState([]);
  const [yesCount, setYesCount] = useState(0);
  const [noCount, setNoCount] = useState(0);
  const [noResponseCount, setNoResponseCount] = useState(0);

  // פונקציה לספירת התגובות
  const countResponses = (responses) => {
    let yes = 0;
    let no = 0;
    let noResponse = 0;

    responses.forEach(response => {
      if (response.response === 'כן') {
        yes += 1;
      } else if (response.response === 'לא') {
        no += 1;
      } else if (response.response === 'No response') {
        noResponse += 1;
      }
    });

    setYesCount(yes);
    setNoCount(no);
    setNoResponseCount(noResponse);
  };

  // פונקציה לשליחת הודעות לכל אנשי הקשר ולהמתין לתגובות
  const sendMessageToRecipients = async () => {
    try {
      const apiUrl = 'http://127.0.0.1:5000/send-messages';

      // שלח את ההודעה לכל אנשי הקשר
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: phoneNumbers.filter(num => num.trim() !== ''), // סנן מספרים ריקים
          message,
        }),
      });

      console.log('Received response from server:', response);

      if (response.ok) {
        const result = await response.json();
        console.log('Response JSON:', result);
        if (result.success) {
          setResponses(result.responses); // הצג את התגובות
          countResponses(result.responses); // בצע ספירה של התגובות
        } else {
          Alert.alert('Error', 'Failed to send messages.');
        }
      } else {
        console.log('Server returned status:', response.status);
        Alert.alert('Error', `Server returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  const handlePhoneNumberChange = (index, text) => {
    const updatedNumbers = [...phoneNumbers];
    updatedNumbers[index] = text;
    setPhoneNumbers(updatedNumbers);
  };

  const addPhoneNumberField = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const renderResponseItem = ({ item }) => (
    <View style={styles.responseItem}>
      <Text>{item.response}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>הכנס הודעה לשליחה</Text>
      <TextInput
        style={styles.input}
        placeholder="הכנס את ההודעה שלך"
        value={message}
        onChangeText={setMessage}
      />
      <Text style={styles.header}>הכנס מספרי טלפון של אנשי קשר</Text>
      {phoneNumbers.map((phone, index) => (
        <TextInput
          key={index}
          style={styles.input}
          placeholder="מספר טלפון"
          value={phone}
          onChangeText={(text) => handlePhoneNumberChange(index, text)}
        />
      ))}
      <TouchableOpacity onPress={addPhoneNumberField} style={styles.button}>
        <Text style={styles.buttonText}>הוסף מספר טלפון</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={sendMessageToRecipients} style={styles.button}>
        <Text style={styles.buttonText}>שלח הודעה</Text>
      </TouchableOpacity>
      <FlatList
        data={responses}
        renderItem={renderResponseItem}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={<Text style={styles.responsesHeader}>תגובות</Text>}
      />
      <View style={styles.counterContainer}>
        <Text>כן: {yesCount}</Text>
        <Text>לא: {noCount}</Text>
        <Text>no response: {noResponseCount}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.button}>
        <Text style={styles.buttonText}>חזור</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  responseItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  responsesHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  counterContainer: {
    marginTop: 20,
    marginBottom: 20,
  }
});

export default RSVPs;
