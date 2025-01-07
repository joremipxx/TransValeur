import React from 'react';
import ChatInterface from './components/ChatInterface';
import { AISettingsProvider } from './contexts/AISettingsContext';
import { CoachingProvider } from './contexts/CoachingContext';

function App() {
  return (
    <AISettingsProvider>
      <CoachingProvider>
        <ChatInterface />
      </CoachingProvider>
    </AISettingsProvider>
  );
}

export default App; 