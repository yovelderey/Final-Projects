import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // לוודא שהספריה מותקנת

const RSVPs = () => {
  const [response, setResponse] = useState(null); // שמירת התשובה מהשרת
  const navigation = useNavigation(); // גישה לניווט בין מסכים

  // פונקציה לשליחת הודעה ולקבל תשובה מהשרת
  const sendMessageAndFetchResponse = async () => {
    try {
      const phoneNumber = '+972542455869'; // מספר הטלפון של הלקוח
      const message = 'האם אתה זמין?'; // ההודעה שנשלחת
      const apiUrl = 'https://your-api-url.com/send-message'; // כתובת ה-URL של ה-API

      // שליחת ההודעה לשרת
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

      // בדיקת קוד הסטטוס של התגובה
      if (response.ok) {
        // קבלת סוג התוכן של התגובה
        const contentType = response.headers.get('Content-Type');
        
        if (contentType && contentType.includes('application/json')) {
          // אם התוכן הוא JSON, ניתוח התשובה
          const text = await response.text();
          try {
            const result = JSON.parse(text);
            if (result.success) {
              setResponse(result.reply); // שמירת התשובה שקיבלנו
            } else {
              Alert.alert('שגיאה', 'שליחת ההודעה נכשלה.');
            }
          } catch (jsonError) {
            console.error('שגיאת ניתוח JSON:', jsonError);
            Alert.alert('שגיאה', 'התקבלה תגובה שאינה בפורמט JSON מהשרת.');
          }
        } else {
          // הצגת התגובה לשם אבחון
          const text = await response.text();
          console.error('Unexpected response:', text);
          Alert.alert('שגיאה', 'התקבלה תגובה שאינה בפורמט JSON.');
        }
      } else {
        Alert.alert('שגיאה', `השרת החזיר סטטוס: ${response.status}`);
      }
    } catch (error) {
      console.error('שגיאה:', error);
      Alert.alert('שגיאה', 'משהו השתבש.');
    }
  };

  // פונקציה לחזרה למסך הקודם
  const navigateBack = () => {
    navigation.goBack(); // חזרה למסך הקודם
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={sendMessageAndFetchResponse}>
        <Text style={styles.buttonText}>שלח שאלה בוואטסאפ</Text>
      </TouchableOpacity>
      {response && <Text style={styles.responseText}>תשובה: {response}</Text>}
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
