import { Box } from '@/components/ui/box';
import { Text as UIText } from '@/components/ui/text';
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface AddressInputProps extends TextInputProps {
  label: string;
  error?: string;
  multiline?: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  label,
  error,
  multiline = false,
  ...props
}) => {
  return (
    <Box style={styles.container}>
      <UIText style={styles.label}>{label}</UIText>
      <View style={[styles.inputContainer, !multiline && styles.inputContainerSingleLine, error && styles.inputError]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? "top" : "center"}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputContainerSingleLine: {
    height: 48,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  inputMultiline: {
    minHeight: 100,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  errorText: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
});


