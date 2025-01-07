import React from 'react';
import { useCoaching } from '../contexts/CoachingContext';
import { useAISettings } from '../contexts/AISettingsContext';
import { CoachingStep } from '../types/types';

const CoachingProgress: React.FC = () => {
  const { progress, canProceedToNext } = useCoaching();
  const { settings } = useAISettings();
  const stepOrder = settings.stepOrder;
  const currentStep = settings.coachingSteps[progress.currentStep];

  if (!stepOrder.length || !currentStep) {
    return null;
  }

  return (
    <div className="fixed top-[96px] left-0 right-0 bg-[#F2F1EA] z-30 border-b border-[#E4E4E7]">
      <div className="max-w-[992px] mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">
            {currentStep.title}
          </h2>
          <span className="text-sm text-gray-500">
            Étape {stepOrder.indexOf(progress.currentStep) + 1} sur {stepOrder.length}
          </span>
        </div>
        
        <div className="relative">
          {/* Progress bar background */}
          <div className="h-2 bg-[#E4E4E7] rounded-full">
            {/* Progress bar fill */}
            <div 
              className="h-full bg-[#818DF7] rounded-full transition-all duration-300"
              style={{ 
                width: `${(progress.completedSteps.length / stepOrder.length) * 100}%`,
              }}
            />
          </div>

          {/* Step indicators */}
          <div className="absolute top-0 left-0 w-full flex justify-between -mt-1">
            {stepOrder.map((step, index) => {
              const isCompleted = progress.completedSteps.includes(step);
              const isCurrent = progress.currentStep === step;
              const stepInfo = settings.coachingSteps[step];
              
              if (!stepInfo) return null;
              
              return (
                <div 
                  key={step}
                  className={`w-4 h-4 rounded-full border-2 ${
                    isCompleted || isCurrent
                      ? 'bg-[#818DF7] border-[#818DF7]'
                      : 'bg-white border-[#E4E4E7]'
                  }`}
                  title={stepInfo.title}
                />
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          {currentStep.description}
        </p>

        {progress.isComplete ? (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
            Félicitations ! Vous avez complété toutes les étapes du processus de coaching.
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500">
            {canProceedToNext 
              ? "✓ Cette étape est complétée. Vous pouvez passer à la suivante."
              : `Question actuelle : ${currentStep.questions[0]}`
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachingProgress; 