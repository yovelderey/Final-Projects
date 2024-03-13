import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ImageBackground, StyleSheet, StatusBar, ScrollView, Image, Settings } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Main from './screens/Main';
import Login from './screens/Login';
import Register from './screens/Register';
import RePassword from './screens/RePassword';
import LoginEmail from './screens/LoginEmail';
import Setting from './screens/Setting';
import Manager from './screens/Manager';
import Home from './screens/Home';
import ListItem from './screens/ListItem';

const App = () => {
  const Stack = createNativeStackNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={Main} options={{ title: "" }} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="RePassword" component={RePassword} />
        <Stack.Screen name="LoginEmail" component={LoginEmail} />
        <Stack.Screen name="Setting" component={Setting} />
        <Stack.Screen name="Manager" component={Manager} />
        <Stack.Screen name="ListItem" component={ListItem} />


        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            headerShown: true,
            headerTitle: "Event Planning App",
            headerTitleStyle: {
              fontSize: 24,
              fontWeight: 'bold',
            },
            headerRight: () => (
              <TouchableOpacity
                style={{ marginRight: 15 }}
                onPress={() => navigation.navigate('CreateEvent')}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>Create Event</Text>
              </TouchableOpacity>
            ),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
