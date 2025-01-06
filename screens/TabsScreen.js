import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();

const TabContent = ({ title, data, color }) => {
  const renderItem = ({ item }) => {
    const displayText =
      typeof item === 'string'
        ? item
        : item?.displayName || JSON.stringify(item);

    return (
      <View style={styles.listItemContainer}>
        <Text style={styles.listItem}>{displayText}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.tabContainer, { backgroundColor: color }]}>
      <Text style={styles.counterText}>0</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
};

const TabsScreen = ({ route, navigation }) => {
  const { eventDetails, contacts } = route.params;

  const tabsData = [
    { title: 'מגיעים', data: eventDetails.yes_caming || [], color: '#F0F4C3' },
    { title: 'אולי', data: [{ displayName: 'דוגמה 1' }, { displayName: 'דוגמה 2' }], color: '#FFECB3' },
    { title: 'לא מגיעים', data: eventDetails.no_cuming || [], color: '#FFCDD2' },
    { title: 'ללא מענה', data: eventDetails.maybe || [], color: '#D1C4E9' },
    { title: 'מוזמנים', data: contacts || [], color: '#B2DFDB' },
    { title: 'נשלח', data: eventDetails.maybe || [], color: '#C5CAE9' },
    { title: 'לא נשלח', data: eventDetails.no_cuming || [], color: '#B0BEC5' },
  ];

  return (
    <View style={styles.container}>
      {/* כותרת */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>נתונים בזמן אמת</Text>
      </View>

      {/* טאבים */}
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            tabBarScrollEnabled: true,
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabBarItem,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarIndicatorStyle: styles.tabBarIndicator,
          }}
        >
          {tabsData.map((tab, index) => (
            <Tab.Screen
              key={index}
              name={tab.title}
              children={() => <TabContent title={tab.title} data={tab.data} color={tab.color} />}
            />
          ))}
        </Tab.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'rgba(108, 99, 255, 0.9)',
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 0,
    marginTop: 0,


  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  backButtonText: {
    fontSize: 29,
    color: 'white',
  },
  title: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,

  },
  tabContainer: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  listItemContainer: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItem: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  counterText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  tabBar: {
    backgroundColor: '#ECEFF1',
  },
  tabBarItem: {
    minWidth: 120,
    alignItems: 'center',
  },
  tabBarLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: '#37474F',
  },
  tabBarIndicator: {
    backgroundColor: '#3949AB',
    height: 3,
  },
});

export default TabsScreen;
