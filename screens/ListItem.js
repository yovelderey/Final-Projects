// ListItem.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ListItem = ({ item, navigation }) => {
  const onPressItem = () => {
    // Ensure 'navigation' exists before attempting to use it
    if (navigation) {
      // Navigate to the Details screen with the selected item
      navigation.navigate('Details', { item });
    }
  };

  return (
    <TouchableOpacity onPress={onPressItem}>
      <View style={styles.itemContainer}>
        <Text>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default ListItem;
