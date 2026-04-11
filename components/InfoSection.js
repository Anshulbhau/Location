import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const InfoSection = ({ lastUpdateTime, mode }) => {
  return (
    <>
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>
          • Ensure GPS is enabled on your device{'\n'}
          • Tap "Start Trip" to begin tracking{'\n'}
          • Location updates are sent every 2.5 seconds{'\n'}
          • Speed calculated from distance & time{'\n'}
          • Duplicate coordinates are skipped{'\n'}
          • Open terminal for detailed logs
        </Text>
      </View>

      <View style={styles.debugContainer}>
        <Text style={styles.debugLabel}>Mode: {mode}</Text>
        <Text style={styles.debugLabel}>
          Last Update: {lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString() : 'None'}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  infoContainer: {
    marginHorizontal: 15,
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 20,
  },
  debugContainer: {
    marginHorizontal: 15,
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  debugLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
  },
});
