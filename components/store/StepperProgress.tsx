import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Step {
  label: string;
  isActive: boolean;
}

interface StepperProgressProps {
  steps: Step[];
}

export const StepperProgress: React.FC<StepperProgressProps> = ({ steps }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <View style={styles.stepWrapper}>
            <View
              style={[
                styles.stepDot,
                step.isActive ? styles.activeDot : styles.inactiveDot,
              ]}
            />
            <Text style={[styles.stepLabel, step.isActive ? styles.activeLabel : styles.inactiveLabel]}>
              {step.label}
            </Text>
          </View>
          {index < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                steps[index + 1].isActive ? styles.activeLine : styles.inactiveLine,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  stepWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 2,
  },
  activeDot: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  inactiveDot: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  activeLabel: {
    color: '#2563EB',
  },
  inactiveLabel: {
    color: '#9CA3AF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginTop: -16,
  },
  activeLine: {
    backgroundColor: '#2563EB',
  },
  inactiveLine: {
    backgroundColor: '#E5E7EB',
  },
});

