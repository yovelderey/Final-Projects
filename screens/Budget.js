import React, { useRef, useState } from 'react';
import { View, Text, Image, Button, TouchableOpacity,StyleSheet,ScrollView, Alert } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { v4 as uuidv4 } from 'uuid';
import { useNavigation } from '@react-navigation/native';

const Budget = (props) => {

    const id = props.route.params.id; // Accessing the passed id


  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>

    <View style={styles.container}>
      <Text style={styles.text}>budget</Text>



      <TouchableOpacity 
         onPress={() => props.navigation.navigate('ListItem', { id })}
            style={[styles.showPasswordButton, { position: 'absolute', top: '10%', left: '8%' }]}>
            <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
        </TouchableOpacity>
    </View>

    </ScrollView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,

  },
  scrollViewContainer: {
    flexGrow: 1 // עשוי להיות חשוב לגליל בתוך ScrollView
  },
});

export default Budget;
