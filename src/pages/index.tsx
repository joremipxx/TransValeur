import React from 'react';
import ChatInterface from '../components/ChatInterface';
import { AISettingsProvider } from '../contexts/AISettingsContext';
import { CoachingProvider } from '../contexts/CoachingContext';

export default function Home() {
  return (
    <AISettingsProvider>
      <CoachingProvider>
        <ChatInterface />
      </CoachingProvider>
    </AISettingsProvider>
  );
} 