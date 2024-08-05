import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';

const RSVPs = (props) => {
  const [message, setMessage] = useState('שלום, הוזמנתם לחתונה של יובל וליאור בתאריך 15.9.2024 פרטים ואישור הגעה, לחץ כן לאישור, לחץ לא לסרוב, תודה צוות EasyVent');
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [responses, setResponses] = useState([]);
  const [yesCount, setYesCount] = useState(0);
  const [noCount, setNoCount] = useState(0);
  const [noResponseCount, setNoResponseCount] = useState(0);
  const id = props.route.params.id; // Accessing the passed id

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

  // פונקציה לשליחת הודעות לכל אנשי הקשרים ולהמתין לתגובות
  const sendMessageToRecipients = async () => {
    try {
      const apiUrl = 'http://192.168.1.213:5000/send-messages';

      // שלח את ההודעה לכל אנשי הקשרים
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

  const renderPhoneNumberItem = ({ item, index }) => (
    <View style={[styles.phoneNumberItem, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
      <Text style={styles.phoneNumberText}>{item}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header2}>הכנס הודעה לשליחה</Text>
      <TextInput
        style={styles.input}
        placeholder="הכנס את ההודעה שלך"
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <Text style={styles.header}>הכנס מספרי טלפון של אנשי קשר</Text>
      {phoneNumbers.map((phone, index) => (
        <TextInput
          key={index}
          style={styles.input2}
          placeholder="מספר טלפון"
          value={phone}
          onChangeText={(text) => handlePhoneNumberChange(index, text)}
        />
      ))}
      <TouchableOpacity onPress={addPhoneNumberField} style={styles.addButton}>
        <Text style={styles.buttonText}>הוסף מספר טלפון</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={sendMessageToRecipients} style={styles.sendButton}>
        <Text style={styles.buttonText}>שלח הודעה</Text>
      </TouchableOpacity>

      {/* כפתור ניווט לדף התגובות */}
      <TouchableOpacity 
        onPress={() => props.navigation.navigate('ResponsesScreen', { responses })}
        style={styles.viewResponsesButton}
      >
        <Text style={styles.buttonText}>הצג תגובות</Text>
      </TouchableOpacity>

      <View style={styles.counterContainer}>
        <View style={styles.counterItemGreen}>
          <Text style={styles.counterText}>{yesCount}</Text>
          <Text style={styles.counterLabel}>כן</Text>
        </View>
        <View style={styles.counterItemYellow}>
          <Text style={styles.counterText}>{noResponseCount}</Text>
          <Text style={styles.counterLabel}>ללא מענה</Text>
        </View>
        <View style={styles.counterItemRed}>
          <Text style={styles.counterText}>{noCount}</Text>
          <Text style={styles.counterLabel}>לא</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => props.navigation.navigate('ListItem', { id })} style={styles.backButton}>
        <Text style={styles.buttonText}>חזור</Text>
      </TouchableOpacity>

      {/* טבלה להצגת המספרים */}
      <View style={styles.tableContainer}>
        <Text style={styles.tableHeader}>מספרי טלפון שנשלחה אליהם הודעה</Text>
        <FlatList
          data={phoneNumbers}
          renderItem={renderPhoneNumberItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  header2: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    marginTop: 40, // הוסף מרווח מעל התיבה
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  input: {
    height: 200, // גובה של 8 שורות
    minHeight: 200,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top', // מאפשר כתיבה מהחלק העליון של השדה
  },
  input2: {
    height: 50, // גובה של 8 שורות
    minHeight: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top', // מאפשר כתיבה מהחלק העליון של השדה
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  responseText: {
    fontSize: 16,
    color: '#495057',
  },
  responsesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#343a40',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  counterItemGreen: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemYellow: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterItemRed: {
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '30%',
  },
  counterText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 16,
    color: '#495057',
  },
  tableContainer: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    textAlign: 'center', // מרכז את הטקסט בתוך הרכיב
  },
  phoneNumberItem: {
    padding: 12,
  },
  evenRow: {
    backgroundColor: '#f8f9fa',
  },
  oddRow: {
    backgroundColor: '#ffffff',
  },
  phoneNumberText: {
    fontSize: 16,
  },
  viewResponsesButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
});

export default RSVPs;