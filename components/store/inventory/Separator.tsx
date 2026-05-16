import React from 'react';
import { StyleSheet, View } from 'react-native';

export const Separator: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  line: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});

