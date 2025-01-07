import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CoachingStep, CoachingProgress } from '../types/types';
import { useAISettings } from './AISettingsContext';

interface CoachingContextType {
  progress: CoachingProgress;
  moveToNextStep: () => void;
  completeStep: (step: CoachingStep) => void;
  resetProgress: () => void;
  canProceedToNext: boolean;
}

const CoachingContext = createContext<CoachingContextType | undefined>(undefined);

export const CoachingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useAISettings();
  const [progress, setProgress] = useState<CoachingProgress>({
    currentStep: settings.stepOrder[0] || ('custom_step_0' as CoachingStep),
    completedSteps: [],
    isComplete: false
  });

  const [canProceedToNext, setCanProceedToNext] = useState(false);

  const moveToNextStep = () => {
    if (!canProceedToNext) return;

    const currentIndex = settings.stepOrder.indexOf(progress.currentStep);
    if (currentIndex < settings.stepOrder.length - 1) {
      const nextStep = settings.stepOrder[currentIndex + 1];
      setProgress(prev => ({
        ...prev,
        currentStep: nextStep,
        completedSteps: [...prev.completedSteps, prev.currentStep]
      }));
      setCanProceedToNext(false);
    } else {
      setProgress(prev => ({
        ...prev,
        isComplete: true,
        completedSteps: [...prev.completedSteps, prev.currentStep]
      }));
    }
  };

  const completeStep = (step: CoachingStep) => {
    if (step === progress.currentStep) {
      setCanProceedToNext(true);
    }
  };

  const resetProgress = () => {
    setProgress({
      currentStep: settings.stepOrder[0] || ('custom_step_0' as CoachingStep),
      completedSteps: [],
      isComplete: false
    });
    setCanProceedToNext(false);
  };

  return (
    <CoachingContext.Provider 
      value={{ 
        progress, 
        moveToNextStep, 
        completeStep,
        resetProgress,
        canProceedToNext
      }}
    >
      {children}
    </CoachingContext.Provider>
  );
};

export const useCoaching = () => {
  const context = useContext(CoachingContext);
  if (context === undefined) {
    throw new Error('useCoaching must be used within a CoachingProvider');
  }
  return context;
}; 