import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './screens/SplashScreen';
import Main from './screens/Main';
import LoginEmail from './screens/LoginEmail';
import Register from './screens/Register';
import RePassword from './screens/RePassword';
import ListItem from './screens/ListItem';
import Home from './screens/Home';
import Setting from './screens/Setting';
import EditHome from './screens/EditHome';
import Manager from './screens/Manager';
import Budget from './screens/Budget';
import Task from './screens/Task';
import ProvidersScreen from './screens/ProvidersScreen';
import Providers from './screens/Providers';
import Gift from './screens/Gift';
import Management from './screens/Management';
import ContactsList from './screens/ContactsList';
import SeatedAtTable from './screens/SeatedAtTable';
import TablePlanningScreen from './screens/TablePlanningScreen';
import Document from './screens/Document';
import RSVPstwo from './screens/RSVPstwo';
import RSVPsthree from './screens/RSVPsthree';
import RSVPsfour from './screens/RSVPsfour';
import RSVPsfive from './screens/RSVPsfive';
import RSVPs from './screens/RSVPs';
import ResponsesScreen from './screens/ResponsesScreen';
import Login from './screens/Login';
import TabsScreen from './screens/TabsScreen';
import HomeOne from './screens/HomeOne';
import HomeTwo from './screens/HomeTwo';
import HomeThree from './screens/HomeThree';


const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={Main} />
        <Stack.Screen name="LoginEmail" component={LoginEmail} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="RePassword" component={RePassword} />
        <Stack.Screen name="ListItem" component={ListItem} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Setting" component={Setting} />
        <Stack.Screen name="EditHome" component={EditHome} />
        <Stack.Screen name="Manager" component={Manager} />
        <Stack.Screen name="Budget" component={Budget} />
        <Stack.Screen name="Task" component={Task} />
        <Stack.Screen name="Providers" component={Providers} />
        <Stack.Screen name="ProvidersScreen" component={ProvidersScreen} />
        <Stack.Screen name="Gift" component={Gift} />
        <Stack.Screen name="Management" component={Management} />
        <Stack.Screen name="ContactsList" component={ContactsList} />
        <Stack.Screen name="SeatedAtTable" component={SeatedAtTable} />
        <Stack.Screen name="TablePlanningScreen" component={TablePlanningScreen} />
        <Stack.Screen name="Document" component={Document} />
        <Stack.Screen name="RSVPs" component={RSVPs} />
        <Stack.Screen name="RSVPstwo" component={RSVPstwo} />
        <Stack.Screen name="RSVPsthree" component={RSVPsthree} />
        <Stack.Screen name="RSVPsfour" component={RSVPsfour} />
        <Stack.Screen name="RSVPsfive" component={RSVPsfive} />
        <Stack.Screen name="ResponsesScreen" component={ResponsesScreen} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="TabsScreen" component={TabsScreen} />
        <Stack.Screen name="HomeOne" component={HomeOne} />
        <Stack.Screen name="HomeTwo" component={HomeTwo} />
        <Stack.Screen name="HomeThree" component={HomeThree} />

        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
