import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';

const ResponsesScreen = ({ navigation, route }) => {
  const { responses } = route.params;

  const renderResponseItem = ({ item }) => (
    <View style={styles.responseContainer}>
      <Text style={styles.responseText}>{`${item.response} - ${item.recipient}`}</Text>
    </View>
  );

  const handleRefresh = () => {
    console.log('Refresh button pressed');
    // Add your refresh logic here
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>תגובות</Text>

      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>כן</Text>
        <FlatList
          data={responses.filter(item => item.response === 'כן')}
          renderItem={renderResponseItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>לא</Text>
        <FlatList
          data={responses.filter(item => item.response === 'לא')}
          renderItem={renderResponseItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>No response</Text>
        <FlatList
          data={responses.filter(item => item.response === 'No response')}
          renderItem={renderResponseItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
        <Text style={styles.buttonText}>רענן</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.buttonText}>חזור</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#343a40',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderColor: '#ced4da',
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#343a40',
  },
  responseContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  responseText: {
    fontSize: 16,
    color: '#495057',
  },
  separator: {
    height: 1,
    backgroundColor: '#ced4da',
    marginVertical: 16,
  },
  refreshButton: {
    backgroundColor: '#17a2b8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ResponsesScreen;
