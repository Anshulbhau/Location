import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export const LocationDataBox = ({ label, value }) => {
  const handlePress = () => {
    Alert.alert('Info', `${label}: ${value}`);
  };

  return (
    <TouchableOpacity style={styles.dataBox} onPress={handlePress}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </TouchableOpacity>
  );
};

export const LocationDataDisplay = ({ latitude, longitude, speed, updates }) => {
  return (
    <View style={styles.container}>
      <LocationDataBox label="Latitude" value={latitude} />
      <LocationDataBox label="Longitude" value={longitude} />
      <LocationDataBox label="Speed (km/h)" value={speed} />
      <View style={styles.dataBox}>
        <Text style={styles.dataLabel}>Updates Sent</Text>
        <Text style={styles.dataValue}>{updates}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataBox: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
});
