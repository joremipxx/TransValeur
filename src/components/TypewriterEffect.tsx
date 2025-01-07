import React, { useState, useEffect } from 'react';
import { useAISettings } from '../contexts/AISettingsContext';

interface TypewriterEffectProps {
  text: string;
  speed?: number;
  shouldAnimate: boolean;
  onComplete?: () => void;
}

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({ text, speed = 30, shouldAnimate, onComplete }) => {
  const { settings } = useAISettings();
  const [displayedText, setDisplayedText] = useState(shouldAnimate ? '' : text);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) return;
    
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, shouldAnimate, onComplete]);

  const renderText = (line: string) => {
    if (!settings.boldWords) {
      return <span className="font-medium">{line.replace(/\*\*/g, '')}</span>;
    }

    return line.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i} className="font-medium">{part}</span>;
    });
  };

  return (
    <div>
      {text.split('\n').map((line, index) => (
        <p key={index} className={`${index > 0 ? 'mt-3' : ''} whitespace-pre-wrap`}>
          {isComplete ? (
            renderText(line)
          ) : (
            <span className="font-medium">{displayedText.split('\n')[index] || ''}</span>
          )}
        </p>
      ))}
    </div>
  );
};

export default TypewriterEffect; 