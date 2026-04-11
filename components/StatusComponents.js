import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PermissionStatus = ({ isGranted }) => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isGranted ? '#dcfce7' : '#fee2e2' },
      ]}
    >
      <Text style={[styles.text, { color: isGranted ? '#166534' : '#991b1b' }]}>
        {isGranted ? '✅ GPS Permission: Granted' : '❌ GPS Permission: Denied'}
      </Text>
    </View>
  );
};

export const StatusDisplay = ({ status }) => {
  return (
    <View style={styles.statusContainer}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: status === 'Sending' ? '#22c55e' : '#ef4444' },
        ]}
      />
      <Text style={styles.statusText}>Status: {status}</Text>
    </View>
  );
};

export const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
  },
});
