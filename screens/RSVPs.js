import React, { useRef, useState } from 'react';
import { View, Text, Image, ImageBackground, TextInput, StyleSheet , TouchableOpacity,ScrollView,Alert } from 'react-native';
import { firebaseConfig } from '../config';
import { getDatabase, ref, set } from 'firebase/database';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useNavigation } from '@react-navigation/native';

const RSVPs = (props) => {
  const id = props.route.params.id; // Accessing the passed id
  
  return (
    <ImageBackground 
    source={require('../assets/magia.png')} // Adjust the path accordingly
    style={styles.background}
>
    <View style={styles.container}>


      <TouchableOpacity 
        onPress={() => props.navigation.navigate('ListItem', { id })}
        style={[styles.showPasswordButton, { position: 'absolute', top: '85%', left: '-5%' }]}
      >
        <Image source={require('../assets/backicon.png')} style={styles.backIcon} />
      </TouchableOpacity>
    </View>
  </ImageBackground>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  backIcon: {
    width: 50,
    height: 50,

  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RSVPs;