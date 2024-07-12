import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Image, Button, StyleSheet , TouchableOpacity,ScrollView } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';


    
    const Management = (props) => {
        const [inputDate, setInputDate] = useState('');
        const [daysLeft, setDaysLeft] = useState(null);
        const id = props.route.params.id; // Accessing the passed id

        const calculateDaysLeft = () => {
          const currentDate = new Date();
          const targetDate = new Date(inputDate);
      
          // Calculate the difference in time
          const timeDiff = targetDate.getTime() - currentDate.getTime();
          // Calculate the difference in days
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
          setDaysLeft(daysDiff);
        };
      
        return (
          <View style={styles.container}>
            <TextInput
              style={styles.input}
              placeholder="Enter date (YYYY-MM-DD)"
              onChangeText={setInputDate}
              value={inputDate}
            />
                        <TouchableOpacity 
              onPress={() => props.navigation.navigate('ListItem', { id })}
              style={[styles.showPasswordButton, { position: 'absolute', top: '94%', left: '3%' }]}
            >
              <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
            </TouchableOpacity>

            <Button title="Calculate Days Left" onPress={calculateDaysLeft} />
            {daysLeft !== null && (
              <Text style={styles.result}>
                {daysLeft} 
              </Text>
            )}
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
        input: {
          height: 40,
          borderColor: 'gray',
          borderWidth: 1,
          width: '100%',
          marginBottom: 20,
          paddingHorizontal: 10,
        },
        result: {
          marginTop: 20,
          fontSize: 18,
        },
      });
      
      export default Management;