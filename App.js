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
import Budget from './screens/Budget';
import Management from './screens/Management';
import Task from './screens/Task';
import SeatedAtTable from './screens/SeatedAtTable';
import RSVPs from './screens/RSVPs';
import Providers from './screens/Providers';
import ContactsList from './screens/ContactsList';


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
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Budget" component={Budget} />
        <Stack.Screen name="Management" component={Management} />
        <Stack.Screen name="Task" component={Task} />
        <Stack.Screen name="SeatedAtTable" component={SeatedAtTable} />
        <Stack.Screen name="RSVPs" component={RSVPs} />
        <Stack.Screen name="Providers" component={Providers} />
        <Stack.Screen name="ContactsList" component={ContactsList} />

        
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
