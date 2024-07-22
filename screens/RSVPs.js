import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // לוודא שיש לך את הספריה הזו מותקנת

const RSVPs = () => {
  const [response, setResponse] = useState(null);
  const navigation = useNavigation(); // גישה לניווט

  const sendMessageAndFetchResponse = async () => {
    try {
      const phoneNumber = '+972542455869';
      const message = 'האם אתה זמין?';
      const apiUrl = `https://your-api-url.com/send-message`; // ודא שכתובת ה-URL נכונה
  
      // שליחה של ההודעה
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: message
        }),
      });
  
      // בדוק קוד סטטוס התגובה
      if (response.ok) {
        const text = await response.text();
        console.log('Server response:', text);
  
        // אם התגובה היא JSON, ניתוח התשובה
        try {
          const result = JSON.parse(text);
          if (result.success) {
            setResponse(result.reply); // תשובה מהשירות שלך
          } else {
            Alert.alert('Error', 'Failed to send message.');
          }
        } catch (jsonError) {
          console.error('JSON Parse error:', jsonError);
          Alert.alert('Error', 'Received non-JSON response from server.');
        }
      } else {
        Alert.alert('Error', `Server returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };
  
  

  const navigateBack = () => {
    navigation.goBack(); // ניווט חזרה
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={sendMessageAndFetchResponse}>
        <Text style={styles.buttonText}>Send Question via WhatsApp</Text>
      </TouchableOpacity>
      {response && <Text style={styles.responseText}>Response: {response}</Text>}
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
    backgroundColor: '#25D366',
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
    top: 20,
    left: 20,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  responseText: {
    marginTop: 20,
    fontSize: 18,
  },
});

export default RSVPs;