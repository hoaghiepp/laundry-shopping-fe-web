import React from 'react';
import { View } from 'react-native';

export const HStack = ({ children, style, ...props }: any) => {
  return (
    <View style={[{ flexDirection: 'row' }, style]} {...props}>
      {children}
    </View>
  );
};
