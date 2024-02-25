// CreateEvent.js

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';

const CreateEvent = () => {
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventTags, setEventTags] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const handleCreateEvent = () => {
    // Implement your logic to create the event with the provided details
    // This is where you can use the state variables like eventName, eventCategory, etc.
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create New Event</Text>

      <TextInput
        style={styles.input}
        placeholder="Event Name"
        value={eventName}
        onChangeText={(text) => setEventName(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Category"
        value={eventCategory}
        onChangeText={(text) => setEventCategory(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Tags"
        value={eventTags}
        onChangeText={(text) => setEventTags(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Date"
        value={eventDate}
        onChangeText={(text) => setEventDate(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Time"
        value={eventTime}
        onChangeText={(text) => setEventTime(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Location"
        value={eventLocation}
        onChangeText={(text) => setEventLocation(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Event Description"
        multiline
        numberOfLines={4}
        value={eventDescription}
        onChangeText={(text) => setEventDescription(text)}
      />

      <Button title="Create Event" onPress={handleCreateEvent} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    padding: 10,
    width: '100%',
  },
});

export default CreateEvent;
