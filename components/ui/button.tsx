import React from 'react';
import { Pressable, PressableProps, Text, TextProps } from 'react-native';

export const Button = Pressable;
export const ButtonText = Text;
export const ButtonIcon = ({ as: Icon, ...props }: any) => {
  return Icon ? <Icon {...props} /> : null;
};

export type ButtonProps = PressableProps;
export type ButtonTextProps = TextProps;
