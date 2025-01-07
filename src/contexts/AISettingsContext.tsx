import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CoachingStep, CoachingStepData } from '../types/types';

interface AISettings {
  useTutoiement: boolean;
  customInstructions: string;
  tonality: string;
  maxFollowUps: number;
  boldWords: boolean;
  responseLength: 'concise' | 'balanced' | 'detailed';
  coachingSteps: { [key in CoachingStep]?: CoachingStepData };
  stepOrder: CoachingStep[];
}

interface AISettingsContextType {
  settings: AISettings;
  updateSettings: (newSettings: Partial<AISettings>) => void;
}

const defaultInstructions = `Tu es une IA conversationnelle attentive et bienveillante, conçue pour aider les utilisateurs à réfléchir sur leurs valeurs, leurs forces et leurs passions, afin de développer une déclaration de mission personnelle. Tu joues un rôle de coach empathique, qui accompagne la personne dans une introspection en profondeur de manière bienveillante et motivante.

Ton objectif est de favoriser une discussion fluide et naturelle qui aide l'utilisateur à découvrir ce qui le motive réellement, loin des idéaux abstraits.`;

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

export const AISettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AISettings>({
    useTutoiement: true,
    customInstructions: defaultInstructions,
    tonality: 'Empathique et encourageant',
    maxFollowUps: 2,
    boldWords: true,
    responseLength: 'balanced',
    coachingSteps: {},
    stepOrder: [],
  });

  const updateSettings = (newSettings: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AISettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AISettingsContext.Provider>
  );
};

export const useAISettings = () => {
  const context = useContext(AISettingsContext);
  if (context === undefined) {
    throw new Error('useAISettings must be used within an AISettingsProvider');
  }
  return context;
};

export const defaultAISettings = {
  defaultInstructions,
}; 