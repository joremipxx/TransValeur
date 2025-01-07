import type { AppProps } from 'next/app';
import { AISettingsProvider } from '../contexts/AISettingsContext';
import { CoachingProvider } from '../contexts/CoachingContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AISettingsProvider>
      <CoachingProvider>
        <Component {...pageProps} />
      </CoachingProvider>
    </AISettingsProvider>
  );
} 