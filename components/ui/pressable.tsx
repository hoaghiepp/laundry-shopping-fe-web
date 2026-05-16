import React from 'react';
import { Pressable as RNPressable } from 'react-native';

export const Pressable = ({ children, ...props }: any) => {
  return <RNPressable {...props}>{children}</RNPressable>;
};
