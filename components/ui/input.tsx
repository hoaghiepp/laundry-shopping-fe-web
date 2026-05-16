import React from 'react';
import { TextInput, TextInputProps, View, ViewProps } from 'react-native';

export const Input = View;
export const InputField = TextInput;
export const InputSlot = View;
export const InputIcon = ({ as: Icon, ...props }: any) => {
  return Icon ? <Icon {...props} /> : null;
};

export type InputProps = ViewProps;
export type InputFieldProps = TextInputProps;
export type InputSlotProps = ViewProps;
