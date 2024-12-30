
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import axios from 'axios';

const Test2 = () => {
  const [phone, setPhone] = useState(''); // מספר טלפון
  const [variableText, setVariableText] = useState(''); // הטקסט למשתנה בתבנית

  const sendMessage = async () => {
    try {
      const response = await axios.post('http://localhost:3000/send-single-variable', {
        to: phone,
        variableText: variableText,
      });
      Alert.alert('הודעה נשלחה בהצלחה!', `מספר מזהה: ${response.data.sid}`);
    } catch (error) {
      Alert.alert('שגיאה', 'לא ניתן היה לשלוח את ההודעה.');
      console.error('Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>שליחת הודעה עם משתנה אחד</Text>
      <TextInput
        style={styles.input}
        placeholder="מספר טלפון (לדוגמה: +972542455869)"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="טקסט להודעה (משתנה {{1}})"
        value={variableText}
        onChangeText={setVariableText}
      />
      <TouchableOpacity style={styles.button} onPress={sendMessage}>
        <Text style={styles.buttonText}>שלח הודעה</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    width: '80%',
  },
  button: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'black',
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Test2;
