import React, { useState, useEffect } from 'react';
import { useAISettings, defaultAISettings } from '../contexts/AISettingsContext';
import { CoachingStep } from '../types/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'user'>('ai');
  const { settings, updateSettings } = useAISettings();
  const [expandedSteps, setExpandedSteps] = useState<{[key: string]: boolean}>({});
  const [localSettings, setLocalSettings] = useState({
    useTutoiement: settings.useTutoiement,
    customInstructions: settings.customInstructions,
    tonality: settings.tonality,
    maxFollowUps: settings.maxFollowUps,
    boldWords: settings.boldWords,
    responseLength: settings.responseLength,
    coachingSteps: settings.coachingSteps,
    stepOrder: settings.stepOrder,
  });

  useEffect(() => {
    setLocalSettings({
      useTutoiement: settings.useTutoiement,
      customInstructions: settings.customInstructions,
      tonality: settings.tonality,
      maxFollowUps: settings.maxFollowUps,
      boldWords: settings.boldWords,
      responseLength: settings.responseLength,
      coachingSteps: settings.coachingSteps,
      stepOrder: settings.stepOrder,
    });
  }, [settings, isOpen]);

  const moveStep = (currentIndex: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= localSettings.stepOrder.length) return;
    
    const newOrder = [...localSettings.stepOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    
    setLocalSettings(prev => ({
      ...prev,
      stepOrder: newOrder
    }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const addNewStep = () => {
    const newStepId = `custom_step_${Object.keys(localSettings.coachingSteps).length}` as CoachingStep;
    setLocalSettings(prev => ({
      ...prev,
      coachingSteps: {
        ...prev.coachingSteps,
        [newStepId]: {
          title: "",
          description: "",
          questions: [""]
        }
      },
      stepOrder: [...prev.stepOrder, newStepId]
    }));
    setExpandedSteps(prev => ({
      ...prev,
      [newStepId]: true
    }));
  };

  const addQuestionToStep = (stepKey: CoachingStep) => {
    const step = localSettings.coachingSteps[stepKey];
    if (!step) return;
    
    // Only allow adding questions up to maxFollowUps + 1 (main question + follow-ups)
    if (step.questions.length >= localSettings.maxFollowUps + 1) return;

    setLocalSettings(prev => ({
      ...prev,
      coachingSteps: {
        ...prev.coachingSteps,
        [stepKey]: {
          ...prev.coachingSteps[stepKey]!,
          questions: [...step.questions, "Nouvelle question de suivi ?"]
        }
      }
    }));
  };

  const removeQuestionFromStep = (stepKey: CoachingStep, questionIndex: number) => {
    const step = localSettings.coachingSteps[stepKey];
    if (!step || step.questions.length <= 1) return; // Always keep at least one question

    setLocalSettings(prev => ({
      ...prev,
      coachingSteps: {
        ...prev.coachingSteps,
        [stepKey]: {
          ...prev.coachingSteps[stepKey]!,
          questions: step.questions.filter((_, index) => index !== questionIndex)
        }
      }
    }));
  };

  const deleteStep = (stepKey: CoachingStep) => {
    setLocalSettings(prev => {
      const newCoachingSteps = { ...prev.coachingSteps };
      delete newCoachingSteps[stepKey];
      
      return {
        ...prev,
        coachingSteps: newCoachingSteps,
        stepOrder: prev.stepOrder.filter(key => key !== stepKey)
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[800px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Paramètres</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-4 px-6 text-center font-medium ${
              activeTab === 'ai'
                ? 'text-[#818DF7] border-b-2 border-[#818DF7]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('ai')}
          >
            Comportement de l'IA
          </button>
          <button
            className={`flex-1 py-4 px-6 text-center font-medium ${
              activeTab === 'user'
                ? 'text-[#818DF7] border-b-2 border-[#818DF7]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('user')}
          >
            Contrôle Utilisateur
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'ai' ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Style de Communication</h3>
                    <div className="group relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                        <p className="font-medium mb-2">Style de communication de l'IA :</p>
                        <ul className="space-y-2">
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Langage</span>
                              <p className="text-gray-300">Choix du style de communication</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Mise en forme</span>
                              <p className="text-gray-300">Formatage des réponses pour une meilleure lisibilité</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        className="form-checkbox h-5 w-5 text-[#818DF7]"
                        checked={localSettings.useTutoiement}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          useTutoiement: e.target.checked
                        }))}
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-700">Utiliser le tutoiement</span>
                        <div className="group relative">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 cursor-help">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                            <p className="font-medium mb-2">Choix du niveau de langage :</p>
                            <ul className="space-y-2">
                              <li className="flex items-start space-x-2">
                                <span className="text-[#818DF7]">•</span>
                                <div>
                                  <span className="font-medium">Tutoiement (Tu)</span>
                                  <p className="text-gray-300">Style informel, crée une atmosphère plus personnelle</p>
                                </div>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-[#818DF7]">•</span>
                                <div>
                                  <span className="font-medium">Vouvoiement (Vous)</span>
                                  <p className="text-gray-300">Style formel, maintient une distance professionnelle</p>
                                </div>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        className="form-checkbox h-5 w-5 text-[#818DF7]"
                        checked={localSettings.boldWords}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          boldWords: e.target.checked
                        }))}
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-700">Mettre en gras les mots clés</span>
                        <div className="group relative">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 cursor-help">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                            <p className="font-medium mb-2">Mise en évidence des éléments clés :</p>
                            <ul className="space-y-2">
                              <li className="flex items-start space-x-2">
                                <span className="text-[#818DF7]">•</span>
                                <div>
                                  <span className="font-medium">Valeurs et moments clés</span>
                                  <p className="text-gray-300">Met en gras les valeurs identifiées et moments significatifs</p>
                                </div>
                              </li>
                              <li className="flex items-start space-x-2">
                                <span className="text-[#818DF7]">•</span>
                                <div>
                                  <span className="font-medium">Insights importants</span>
                                  <p className="text-gray-300">Souligne les découvertes et réflexions principales</p>
                                </div>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Nombre maximum de questions de suivi</h3>
                    <div className="group relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                        <p className="font-medium mb-2">Gestion du dialogue :</p>
                        <ul className="space-y-2">
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Questions consécutives</span>
                              <p className="text-gray-300">Limite le nombre de questions sans réponse de l'utilisateur</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Équilibre du dialogue</span>
                              <p className="text-gray-300">Assure une conversation interactive et naturelle</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <select
                      value={localSettings.maxFollowUps}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        maxFollowUps: parseInt(e.target.value)
                      }))}
                      className="w-32 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-[#818DF7] focus:ring-1 focus:ring-[#818DF7]"
                    >
                      {[0, 1, 2, 3, 4].map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500">Limite le nombre de questions consécutives que l'IA peut poser.</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Instructions</h3>
                    <div className="group relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                        <p className="font-medium mb-2">Configuration du comportement :</p>
                        <ul className="space-y-2">
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Processus de coaching</span>
                              <p className="text-gray-300">Définit les étapes et objectifs de l'accompagnement</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Style d'interaction</span>
                              <p className="text-gray-300">Guide la manière dont l'IA engage et maintient le dialogue</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      value={localSettings.customInstructions}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        customInstructions: e.target.value
                      }))}
                      placeholder="Ajoute des instructions spécifiques pour guider le comportement de l'IA..."
                      className="w-full h-32 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-[#818DF7] focus:ring-1 focus:ring-[#818DF7]"
                    />
                    <p className="text-sm text-gray-500">Ces instructions seront utilisées pour personnaliser les réponses de l'IA.</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Tonalité</h3>
                    <div className="group relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                        <p className="font-medium mb-2">Style émotionnel des réponses :</p>
                        <ul className="space-y-2">
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Types de tonalité</span>
                              <p className="text-gray-300">Empathique, encourageant, professionnel, amical</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Impact</span>
                              <p className="text-gray-300">Influence la manière dont l'IA exprime ses idées et feedback</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={localSettings.tonality}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        tonality: e.target.value
                      }))}
                      placeholder="Ex: Professionnel, Amical, Encourageant..."
                      className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-[#818DF7] focus:ring-1 focus:ring-[#818DF7]"
                    />
                    <p className="text-sm text-gray-500">Définis le ton général des réponses de l'IA.</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Longueur des réponses</h3>
                    <div className="group relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                        <p className="font-medium mb-2">Contrôle la longueur des réponses de l'IA :</p>
                        <ul className="space-y-2">
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Concis</span>
                              <span className="text-gray-300"> (300 mots max)</span>
                              <p className="text-gray-300">Réponses brèves et directes</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Équilibré</span>
                              <span className="text-gray-300"> (600 mots max)</span>
                              <p className="text-gray-300">Niveau de détail modéré</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Détaillé</span>
                              <span className="text-gray-300"> (1000 mots max)</span>
                              <p className="text-gray-300">Explications approfondies</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          value={
                            localSettings.responseLength === 'concise' ? 0 :
                            localSettings.responseLength === 'balanced' ? 1 : 2
                          }
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setLocalSettings(prev => ({
                              ...prev,
                              responseLength: value === 0 ? 'concise' :
                                            value === 1 ? 'balanced' : 'detailed'
                            }));
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#818DF7]"
                        />
                        <div className="flex justify-between mt-2 text-sm text-gray-600">
                          <span>Concis</span>
                          <span>Équilibré</span>
                          <span>Détaillé</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {localSettings.responseLength === 'concise' && "Réponses courtes et directes"}
                      {localSettings.responseLength === 'balanced' && "Réponses équilibrées avec un niveau de détail modéré"}
                      {localSettings.responseLength === 'detailed' && "Réponses détaillées avec des explications approfondies"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Étapes du Coaching</h3>
                    <div className="group relative">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                      <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-50">
                        <p className="font-medium mb-2">Configuration des étapes du coaching :</p>
                        <ul className="space-y-2">
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Personnalisation</span>
                              <p className="text-gray-300">Modifie les étapes selon tes besoins</p>
                            </div>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-[#818DF7]">•</span>
                            <div>
                              <span className="font-medium">Structure</span>
                              <p className="text-gray-300">Définit le parcours de coaching</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                    {localSettings.stepOrder.map((stepKey, index) => {
                      const step = localSettings.coachingSteps[stepKey];
                      if (!step) return null;
                      
                      return (
                        <div key={stepKey} className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm">
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => moveStep(index, 'up')}
                              disabled={index === 0}
                              className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveStep(index, 'down')}
                              disabled={index === localSettings.stepOrder.length - 1}
                              className={`p-1 rounded hover:bg-gray-200 ${index === localSettings.stepOrder.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div className="text-sm text-gray-500">Étape {index + 1}</div>
                                <button
                                  onClick={() => deleteStep(stepKey)}
                                  className="text-red-500 hover:text-red-600 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                              <button
                                onClick={() => setExpandedSteps(prev => ({
                                  ...prev,
                                  [stepKey]: !prev[stepKey]
                                }))}
                                className="text-gray-500 hover:text-gray-600 transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className={`w-5 h-5 transform transition-transform ${expandedSteps[stepKey] ? 'rotate-180' : ''}`}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              </button>
                            </div>
                            {!expandedSteps[stepKey] && (
                              <p className="text-sm text-gray-500">{step.description}</p>
                            )}
                            {expandedSteps[stepKey] && (
                              <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Titre
                                  </label>
                                  <input
                                    type="text"
                                    value={step.title}
                                    placeholder="Nouvelle étape"
                                    onChange={(e) => setLocalSettings(prev => ({
                                      ...prev,
                                      coachingSteps: {
                                        ...prev.coachingSteps,
                                        [stepKey]: {
                                          ...prev.coachingSteps[stepKey]!,
                                          title: e.target.value
                                        }
                                      }
                                    }))}
                                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-[#818DF7] focus:ring-1 focus:ring-[#818DF7]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={step.description}
                                    placeholder="Description de la nouvelle étape"
                                    onChange={(e) => setLocalSettings(prev => ({
                                      ...prev,
                                      coachingSteps: {
                                        ...prev.coachingSteps,
                                        [stepKey]: {
                                          ...prev.coachingSteps[stepKey]!,
                                          description: e.target.value
                                        }
                                      }
                                    }))}
                                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-[#818DF7] focus:ring-1 focus:ring-[#818DF7]"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Questions
                                    </label>
                                    <span className="text-xs text-gray-500">
                                      {step.questions.length} / {localSettings.maxFollowUps + 1} questions
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {step.questions.map((question, qIndex) => (
                                      <div key={qIndex} className="flex gap-2">
                                        <input
                                          type="text"
                                          value={question}
                                          placeholder={qIndex === 0 ? "Question principale pour cette étape" : `Question de suivi ${qIndex + 1}`}
                                          onChange={(e) => {
                                            const newQuestions = [...step.questions];
                                            newQuestions[qIndex] = e.target.value;
                                            setLocalSettings(prev => ({
                                              ...prev,
                                              coachingSteps: {
                                                ...prev.coachingSteps,
                                                [stepKey]: {
                                                  ...prev.coachingSteps[stepKey]!,
                                                  questions: newQuestions
                                                }
                                              }
                                            }));
                                          }}
                                          className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:border-[#818DF7] focus:ring-1 focus:ring-[#818DF7]"
                                        />
                                        {step.questions.length > 1 && (
                                          <button
                                            onClick={() => removeQuestionFromStep(stepKey, qIndex)}
                                            className="text-red-500 hover:text-red-600 transition-colors p-2"
                                            title="Supprimer la question"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {step.questions.length <= localSettings.maxFollowUps && (
                                      <button
                                        onClick={() => addQuestionToStep(stepKey)}
                                        className="mt-2 text-sm text-[#818DF7] hover:text-[#717DE7] transition-colors flex items-center gap-1"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Ajouter une question de suivi
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={addNewStep}
                      className="px-4 py-2 bg-[#818DF7] text-white rounded-lg hover:bg-[#717DE7] transition-colors flex items-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span>Ajouter une étape</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Gestion des Utilisateurs</h3>
                  <div className="space-y-4">
                    {/* User List */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-700">Utilisateurs</h4>
                          <button className="px-3 py-1 bg-[#818DF7] text-white rounded-lg hover:bg-[#717DE7] transition-colors text-sm">
                            + Ajouter un utilisateur
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {/* Example users - replace with actual user data */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-[#818DF7] text-white flex items-center justify-center font-medium">
                              JD
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">John Doe</p>
                              <p className="text-sm text-gray-500">john@example.com</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#818DF7]">
                              <option value="admin">Admin</option>
                              <option value="user">Utilisateur</option>
                            </select>
                            <button className="text-red-600 hover:text-red-700">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-[#818DF7] text-white flex items-center justify-center font-medium">
                              JS
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Jane Smith</p>
                              <p className="text-sm text-gray-500">jane@example.com</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#818DF7]">
                              <option value="user">Utilisateur</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button className="text-red-600 hover:text-red-700">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Permissions</h3>
                  <div className="space-y-2">
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Admin</span>
                          <span className="text-sm text-gray-500">Accès complet à toutes les fonctionnalités</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Utilisateur</span>
                          <span className="text-sm text-gray-500">Accès limité aux conversations personnelles</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-gray-200 bg-white p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#818DF7] text-white rounded-lg hover:bg-[#717DE7] transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 