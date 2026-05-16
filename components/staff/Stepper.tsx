import React from 'react';
import { Text, View } from 'react-native';

interface Step {
  label: string;
  active: boolean;
}

interface StepperProps {
  steps: Step[];
}

export const Stepper: React.FC<StepperProps> = ({ steps }) => {
  return (
    <View className="flex-row justify-between items-center px-2 mt-3 pt-3 border-t border-dashed border-gray-200">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <View className="flex-col items-center relative z-10">
            <View
              className={`w-3 h-3 rounded-full mb-1 border-2 ${
                step.active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
              }`}
            />
            <Text className={`text-[9px] font-bold ${step.active ? 'text-blue-600' : 'text-gray-400'}`}>
              {step.label}
            </Text>
          </View>
          {index < steps.length - 1 && (
            <View
              className={`flex-1 h-0.5 -mt-4 ${step.active ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

