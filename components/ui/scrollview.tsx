import React from 'react';
import { ScrollView as RNScrollView } from 'react-native';

export const ScrollView = ({ children, ...props }: any) => {
  return <RNScrollView {...props}>{children}</RNScrollView>;
};
