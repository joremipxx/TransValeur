import React, { useState, useRef, useEffect } from 'react';
import { Message, Transcript, FileError } from '../types/types';
import { getAIResponse } from '../services/aiService';
import { saveConversationData } from '../services/dataCollectionService';
import { cleanTranscript } from '../services/transcriptProcessor';
import { FeedbackModal } from './FeedbackModal';
import TypewriterEffect from './TypewriterEffect';
import { saveChatToHistory, getChatHistory, loadChatSession, deleteChatSession } from '../services/chatHistoryService';
import Header from './Header';
import SettingsModal from './SettingsModal';
import { useAISettings } from '../contexts/AISettingsContext';
import { useCoaching } from '../contexts/CoachingContext';
import CoachingProgress from './CoachingProgress';

interface ContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDelete, onClose }) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className="fixed bg-[#2A2A2A] rounded shadow-lg py-1 z-50"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        className="w-full px-4 py-2 text-left text-white hover:bg-[#333333] transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        Supprimer
      </button>
    </div>
  );
};

const ChatInterface: React.FC = () => {
  const { settings } = useAISettings();
  const [sessionStartTime] = useState<Date>(new Date());
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<Transcript | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [transcriptContent, setTranscriptContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<FileError | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [currentFeedbackMessageId, setCurrentFeedbackMessageId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [transcriptTitle, setTranscriptTitle] = useState('French-coaching-dialogue');
  const [view, setView] = useState<'chat' | 'history'>('history');
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    title: string;
    date: Date;
    preview: string;
    isFavorite: boolean;
  }>>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string } | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { progress, moveToNextStep, completeStep, canProceedToNext } = useCoaching();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'inherit';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const validateFile = (file: File): FileError | null => {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    
    if (file.size > MAX_SIZE) {
      return {
        type: 'size',
        message: 'Ton fichier est trop volumineux. Taille maximum: 5MB'
      };
    }

    if (file.type !== 'text/plain') {
      return {
        type: 'format',
        message: 'Tu dois utiliser uniquement des fichiers .txt'
      };
    }

    return null;
  };

  const handleTranscriptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
        reader.readAsText(file);
      });

      // Clean the transcript
      const cleanedTranscript = cleanTranscript(content);
      console.log('Transcript cleaning stats:', cleanedTranscript.stats);

      // Get file name without extension
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTranscriptTitle(fileName);

      setTranscriptContent(cleanedTranscript.content);
      setView('chat');
      setCurrentTranscript({
        id: Date.now().toString(),
        content: cleanedTranscript.content,
        title: fileName,
        uploadDate: new Date()
      });
      setIsFavorite(false);

      // Initiate conversation with AI analysis
      setIsLoading(true);
      try {
        const aiResponseText = await getAIResponse(
          "Analyse cette transcription et commence notre conversation en partageant tes observations sur les valeurs et motivations qui ressortent. Aide-moi à explorer ce qui me motive vraiment, en te basant sur la réalité de mes actions et de mes choix quotidiens.",
          cleanedTranscript.content,
          settings
        );
        
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: aiResponseText,
          sender: 'ai',
          timestamp: new Date()
        };

        setMessages([aiResponse]);
      } catch (error) {
        console.error('Error:', error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: 'Désolé, j\'ai rencontré une erreur lors de l\'analyse initiale. Peux-tu me poser directement ta première question?',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages([errorMessage]);
      } finally {
        setIsLoading(false);
      }

    } catch (error) {
      setUploadError({
        type: 'read',
        message: 'Il y a eu une erreur lors de la lecture de ton fichier. Peux-tu réessayer?'
      });
      event.target.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentTranscript || isLoading) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '52px';
    }

    try {
      // Include current step information in the prompt
      const currentStepInfo = settings.coachingSteps[progress.currentStep];
      if (!currentStepInfo) {
        console.error('Current step not found:', progress.currentStep);
        return;
      }

      const stepContext = `Nous sommes à l'étape "${currentStepInfo.title}" du processus de coaching. 
        ${currentStepInfo.description}
        Question actuelle : ${currentStepInfo.questions[0]}
        
        Règles importantes:
        1. Reste concentré sur l'objectif de cette étape
        2. Ne passe pas à l'étape suivante tant que celle-ci n'est pas complétée
        3. Quand l'étape est complétée, termine ta réponse par la phrase exacte: "[ÉTAPE_COMPLÉTÉE]"`;

      const aiResponseText = await getAIResponse(
        `${stepContext}\n\nMessage de l'utilisateur: ${inputMessage}`, 
        currentTranscript.content,
        settings
      );
      
      // Check if the step is completed
      if (aiResponseText.includes('[ÉTAPE_COMPLÉTÉE]')) {
        completeStep(progress.currentStep);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText.replace('[ÉTAPE_COMPLÉTÉE]', '').trim(),
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Désolé, j\'ai rencontré une erreur. Peux-tu réessayer?',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, type: 'positive' | 'negative') => {
    // Find current message and its feedback
    const currentMessage = messages.find(msg => msg.id === messageId);
    
    // If clicking the same feedback type again, remove the feedback
    if (currentMessage?.feedback === type) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback: 'none' } : msg
      ));
      // Don't call saveFeedback when removing feedback
      return;
    }

    // Otherwise, handle feedback as before
    if (type === 'negative') {
      setCurrentFeedbackMessageId(messageId);
      setFeedbackModalOpen(true);
      return;
    }

    await saveFeedback(messageId, type);
  };

  const saveFeedback = async (messageId: string, type: 'positive' | 'negative', detailedFeedback?: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback: type } : msg
    ));

    const feedbackData = {
      messageId,
      type,
      timestamp: new Date(),
      messageContent: messages.find(m => m.id === messageId)?.content || '',
      transcriptContext: currentTranscript?.content || '',
      detailedFeedback
    };

    try {
      await saveConversationData({
        transcript: currentTranscript?.content || '',
        conversation: messages.map(msg => ({
          role: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          feedback: msg.feedback === 'none' ? undefined : msg.feedback
        })),
        metadata: {
          uploadDate: currentTranscript?.uploadDate || new Date(),
          transcriptTitle: currentTranscript?.title || '',
          sessionDuration: new Date().getTime() - sessionStartTime.getTime(),
          lastFeedback: feedbackData
        }
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const handleDetailedFeedback = async (feedback: string) => {
    if (currentFeedbackMessageId) {
      await saveFeedback(currentFeedbackMessageId, 'negative', feedback);
      setCurrentFeedbackMessageId(null);
    }
  };

  const handleTitleEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  // Add data collection when conversation ends or component unmounts
  useEffect(() => {
    return () => {
      if (currentTranscript && messages.length > 0) {
        const sessionDuration = new Date().getTime() - sessionStartTime.getTime();
        
        saveConversationData({
          transcript: currentTranscript.content,
          conversation: messages.map(msg => ({
            role: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          metadata: {
            uploadDate: currentTranscript.uploadDate,
            transcriptTitle: currentTranscript.title,
            sessionDuration
          }
        });
      }
    };
  }, [sessionStartTime, currentTranscript, messages]);

  const handleBackClick = () => {
    if (view === 'chat') {
      setView('history');
    }
  };

  // Load chat history when component mounts
  useEffect(() => {
    const history = getChatHistory();
    setChatHistory(history.map(chat => ({
      id: chat.id,
      title: chat.title,
      date: chat.date,
      preview: chat.preview,
      isFavorite: chat.isFavorite
    })));
  }, []);

  // Save chat to history when transcript or messages change
  useEffect(() => {
    if (currentTranscript && messages.length > 0) {
      saveChatToHistory(messages, currentTranscript, isFavorite);
    }
  }, [messages, currentTranscript, isFavorite]);

  const loadChat = (chatId: string) => {
    const chat = loadChatSession(chatId);
    if (chat) {
      setCurrentTranscript(chat.transcript);
      setMessages(chat.messages);
      setTranscriptContent(chat.transcript.content);
      setTranscriptTitle(chat.title);
      setIsFavorite(chat.isFavorite || false);
      setView('chat');
    }
  };

  const handleHistoryTitleEdit = (chatId: string, newTitle: string) => {
    setChatHistory(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    ));
    setEditingChatId(null);
    
    // Update in storage
    const chat = loadChatSession(chatId);
    if (chat) {
      chat.title = newTitle;
      saveChatToHistory(chat.messages, { ...chat.transcript, title: newTitle }, chat.isFavorite);
      // Show save indicator
      setSaveIndicator('Enregistré');
      setTimeout(() => setSaveIndicator(''), 2000);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      chatId
    });
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChatSession(chatId);
    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedHistory);
    setContextMenu(null);
  };

  const handleFavoriteToggle = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatHistory(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, isFavorite: !chat.isFavorite } : chat
    ));
    
    // Update in storage
    const chat = loadChatSession(chatId);
    if (chat) {
      saveChatToHistory(chat.messages, chat.transcript, !chat.isFavorite);
    }
  };

  const handleCurrentFavoriteToggle = () => {
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);
    if (currentTranscript && messages.length > 0) {
      saveChatToHistory(messages, currentTranscript, newFavoriteStatus);
    }
  };

  const renderSidebarContent = () => {
    if (view === 'history') {
      const filteredHistory = chatHistory.filter(chat => {
        const query = searchQuery.toLowerCase().trim();
        
        // Handle favorite filtering
        if (query.startsWith('fav:')) {
          // Extract search term after 'fav:'
          const searchTerm = query.slice(4).trim();
          
          // If just 'fav:', show all favorites
          if (searchTerm === '') {
            return chat.isFavorite;
          }
          
          // If there's a search term, filter favorites by title
          return chat.isFavorite && chat.title.toLowerCase().includes(searchTerm);
        }
        
        // Regular search
        return chat.title.toLowerCase().includes(query);
      });

      return (
        <div className="text-white text-base h-full flex flex-col">
          <div className="sticky top-0 bg-[#222222] z-10 px-4 pt-4 pb-[25px]">
            <div className="flex items-center justify-center mb-4">
              <h2 className="text-xl font-semibold">Historique des conversations</h2>
              {saveIndicator && (
                <span className="text-sm text-gray-400 animate-fade-out absolute right-4">
                  {saveIndicator}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une conversation..."
                className="w-full bg-[#2A2A2A] text-white px-4 py-2 rounded-lg pr-10 focus:outline-none focus:ring-1 focus:ring-[#818DF7] placeholder-gray-400"
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-3 mt-2">
              {filteredHistory.length === 0 ? (
                <p className="text-gray-400">
                  {chatHistory.length === 0 ? "Aucune conversation enregistrée" : "Aucun résultat trouvé"}
                </p>
              ) : (
                filteredHistory.map((chat) => (
                  <div 
                    key={chat.id}
                    className="p-3 bg-[#2A2A2A] rounded shadow cursor-pointer hover:bg-[#333333] transition-colors"
                    onClick={() => loadChat(chat.id)}
                    onContextMenu={(e) => handleContextMenu(e, chat.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={chat.title}
                          onChange={(e) => {
                            setChatHistory(prev => prev.map(c => 
                              c.id === chat.id ? { ...c, title: e.target.value } : c
                            ));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleHistoryTitleEdit(chat.id, chat.title);
                            }
                          }}
                          onBlur={() => handleHistoryTitleEdit(chat.id, chat.title)}
                          className="bg-[#222222] text-white px-2 py-1 rounded w-full mr-2 focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center w-full">
                          <h3 
                            className="conversation-title flex-1 truncate pr-2 cursor-text hover:text-gray-300 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                            }}
                          >
                            {chat.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={(e) => handleFavoriteToggle(chat.id, e)}
                              className="hover:text-[#8D2146] transition-colors flex-shrink-0"
                            >
                              {chat.isFavorite ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#8D2146]">
                                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                </svg>
                              )}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChatId(chat.id);
                              }}
                              className="hover:text-gray-300 transition-colors flex-shrink-0"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{chat.date.toLocaleDateString('fr-FR')}</p>
                    <p className="text-sm text-gray-300 mt-2 line-clamp-1">{chat.preview}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 text-white text-base flex-grow">
        {view === 'chat' && !currentTranscript ? (
          <div className="space-y-3">
            <div className="p-3 bg-[#2A2A2A] rounded shadow">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{transcriptTitle}</h3>
              </div>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="p-3 bg-[#2A2A2A] rounded shadow">
              <p className="text-gray-400">Importe une transcription pour commencer la conversation.</p>
            </div>
          </div>
        ) : currentTranscript && (
          <div className="space-y-3">
            <div className="p-3 bg-[#2A2A2A] rounded shadow">
              <div className="flex items-center justify-between">
                {isEditing ? (
                  <input
                    type="text"
                    value={transcriptTitle}
                    onChange={(e) => setTranscriptTitle(e.target.value)}
                    onKeyDown={handleTitleEdit}
                    onBlur={() => setIsEditing(false)}
                    className="bg-[#222222] text-white px-2 py-1 rounded w-full mr-2 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center w-full">
                    <h3 
                      className="conversation-title flex-1 truncate pr-2 cursor-text hover:text-gray-300 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      {transcriptTitle}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={handleCurrentFavoriteToggle}
                        className="hover:text-[#8D2146] transition-colors flex-shrink-0"
                      >
                        {isFavorite ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#8D2146]">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                        )}
                      </button>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="hover:text-gray-300 transition-colors flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {currentTranscript.uploadDate.toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="p-3 bg-[#2A2A2A] rounded shadow">
              <div className="flex items-center justify-between cursor-pointer">
                <h4 className="font-medium text-lg">Profil Avatar</h4>
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Résumé des découvertes et insights personnels</p>
            </div>
            <div className="p-3 bg-[#2A2A2A] rounded shadow">
              <div className="flex items-center justify-between cursor-pointer">
                <h4 className="font-medium text-lg">Visualisations</h4>
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Graphiques et cartes mentales pour visualiser les insights clés</p>
            </div>
            <div className="p-3 bg-[#2A2A2A] rounded shadow">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}>
                <h4 className="font-medium text-lg">Transcription</h4>
                <button className="text-gray-400 hover:text-gray-300 transition-colors">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className={`w-5 h-5 transform transition-transform duration-200 ${isTranscriptOpen ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
              {isTranscriptOpen && (
                <>
                  <div className={`mt-4 text-base text-gray-300 ${isTranscriptExpanded ? 'max-h-[500px]' : 'max-h-[200px]'} overflow-y-auto pr-4 transition-all duration-300`}>
                    <div className="space-y-4">
                      {transcriptContent.split('\n\n').map((paragraph, index) => (
                        <div key={index} className="leading-relaxed">
                          {paragraph.split('\n').map((line, lineIndex) => (
                            <p key={lineIndex} className={`${lineIndex > 0 ? 'mt-2' : ''} text-[15px]`}>
                              {line}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                    className="mt-2 text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1 ml-auto"
                  >
                    {isTranscriptExpanded ? (
                      <>
                        Réduire
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </>
                    ) : (
                      <>
                        Étendre
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActionButton = () => {
    if (view === 'chat') {
      return (
        <div className="p-4 border-t border-[#2A2A2A] flex justify-center">
          <button 
            className="w-[300px] bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-lg py-3 px-4 flex items-center gap-2 transition-colors"
            onClick={handleBackClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Retour
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="px-4 pb-4 pt-4 flex justify-center">
          <button 
            className="w-[300px] bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-lg py-3 px-4 flex items-center gap-2 transition-colors"
            onClick={() => {
              setCurrentTranscript(null);
              setMessages([]);
              setTranscriptContent('');
              setView('chat');
              setTranscriptTitle('Nouvelle conversation');
              setUploadError(null);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle conversation
          </button>
        </div>
        <div className="pb-4 px-4 border-t border-[#2A2A2A] flex justify-center">
          <button 
            className="w-[300px] bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-lg py-3 px-4 flex items-center gap-2 transition-colors"
            onClick={() => setSettingsModalOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Paramètres
          </button>
        </div>
      </>
    );
  };

  const renderNextStepButton = () => {
    if (!canProceedToNext || progress.isComplete) return null;

    return (
      <div className="flex justify-center my-4">
        <button
          onClick={moveToNextStep}
          className="bg-[#818DF7] text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2"
        >
          Passer à l'étape suivante
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F2F1EA] font-['Clash_Grotesk']">
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={() => handleDeleteChat(contextMenu.chatId)}
          onClose={() => setContextMenu(null)}
        />
      )}
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'w-[335px]' : 'w-0'
        } bg-[#222222] transition-all duration-300 ease-in-out overflow-hidden flex flex-col relative z-40 h-screen fixed left-0 top-0`}
      >
        {/* Sidebar Content */}
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            {renderSidebarContent()}
          </div>
          <div className="flex flex-col border-t border-[#2A2A2A] mt-auto pt-4">
            {view === 'history' ? (
              <>
                <div className="px-4 pb-2 flex justify-center">
                  <button 
                    className="w-[300px] bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-lg py-3 px-4 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      setCurrentTranscript(null);
                      setMessages([]);
                      setTranscriptContent('');
                      setView('chat');
                      setTranscriptTitle('Nouvelle conversation');
                      setUploadError(null);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Nouvelle conversation
                  </button>
                </div>
                <div className="px-4 pb-4 flex justify-center">
                  <button 
                    className="w-[300px] bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-lg py-3 px-4 flex items-center gap-2 transition-colors"
                    onClick={() => setSettingsModalOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Paramètres
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4 py-4 flex justify-center">
                <button 
                  className="w-[300px] bg-[#2A2A2A] hover:bg-[#333333] text-white rounded-lg py-3 px-4 flex items-center gap-2 transition-colors"
                  onClick={handleBackClick}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Retour
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="relative">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`fixed ${isSidebarOpen ? 'left-[335px]' : 'left-0'} bottom-[15px] bg-[#222222] hover:bg-[#2A2A2A] text-white py-3 px-4 rounded-r-lg shadow-lg z-50 transition-all duration-300`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform duration-300 ${
              isSidebarOpen ? 'rotate-0' : 'rotate-180'
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col relative ${!isSidebarOpen ? 'pl-12' : ''}`}>
        {/* Header */}
        <div className="h-[96px] flex-shrink-0 bg-[#F2F1EA]">
          <Header />
        </div>

        {/* Coaching Progress */}
        {currentTranscript && <CoachingProgress />}

        {/* Adjust the top margin to account for the progress bar */}
        <div className={`h-[20px] flex-shrink-0 ${currentTranscript ? 'mt-[60px]' : ''}`}></div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-32">
          {messages.length === 0 && !currentTranscript && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 -mt-20">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Bienvenue sur TransValeur</h1>
                <div className="space-y-6 text-gray-600">
                  <p className="text-lg">
                    Ton assistant personnel pour explorer tes valeurs, tes forces et ta mission de vie.
                  </p>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Comment ça marche ?</h2>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-[#818DF7] rounded-full flex items-center justify-center text-white font-medium">1</div>
                        <p className="text-left">Importe une transcription de conversation</p>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-[#818DF7] rounded-full flex items-center justify-center text-white font-medium">2</div>
                        <p className="text-left">L'IA analysera ton texte et engagera un dialogue constructif</p>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-[#818DF7] rounded-full flex items-center justify-center text-white font-medium">3</div>
                        <p className="text-left">Explore tes valeurs et tesmotivations profondes à travers une conversation guidée</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Commence en important une transcription en utilisant le bouton ci-dessous
                  </div>
                </div>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <React.Fragment key={message.id}>
              {index > 0 && (
                <div className="flex justify-center">
                  <div className="w-[992px] flex justify-center">
                    <div className="w-[80%] h-[1px] bg-[#E4E4E7] my-4" />
                  </div>
                </div>
              )}
              <div className="flex justify-center">
                <div className="w-[992px] min-h-[72px] flex">
                  <div className="w-[48px] flex-shrink-0">
                    {message.sender === 'ai' && (
                      <div className="w-[25px] h-[25px] rounded-full bg-[#F2F1EA] border border-[#E4E4E7] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#222222" className="w-4 h-4">
                          <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div
                      className={`${
                        message.sender === 'user' ? 'flex items-center justify-end' : 'text-left pr-[471.5px]'
                      }`}
                    >
                      {message.sender === 'user' && (
                        <div className="w-[25px] h-[25px] rounded-full bg-[#F2F1EA] border border-[#E4E4E7] mr-3 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#222222" className="w-4 h-4">
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`inline-block rounded-3xl ${
                          message.sender === 'user'
                            ? 'bg-[#818DF7] text-white p-4 text-[16px] leading-[24px]'
                            : 'bg-[#F2F1EA] hover:bg-[#E7E6DF] transition-colors duration-200 p-4 text-[16px] leading-[24px] text-[#374151] w-[738.5px]'
                        } max-w-[80%]`}
                      >
                        <div className="flex flex-col">
                          {message.sender === 'user' ? (
                            message.content.split('\n').map((line, index) => (
                              <p key={index} className={`${index > 0 ? 'mt-3' : ''} whitespace-pre-wrap`}>
                                {line}
                              </p>
                            ))
                          ) : (
                            <>
                              <TypewriterEffect 
                                text={message.content} 
                                speed={15} 
                                shouldAnimate={message.id === messages[messages.length - 1]?.id && 
                                  message.sender === 'ai' && 
                                  message.timestamp.getTime() > Date.now() - 1000}
                                onComplete={() => {
                                  setMessages(prev => prev.map(msg => 
                                    msg.id === message.id ? { ...msg, animationComplete: true } : msg
                                  ));
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          {renderNextStepButton()}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-[18px] left-0 right-0 bg-transparent flex flex-col items-center z-10">
          {uploadError && (
            <div className="mb-2 text-red-500 bg-red-100 px-4 py-2 rounded-lg">
              {uploadError.message}
            </div>
          )}
          <div className="w-[992px] flex justify-center">
            <div className="w-[718px]">
              {!currentTranscript ? (
                <div className="flex bg-[#818DF7] rounded-[8px] h-[54px] items-center justify-center">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleTranscriptUpload}
                    className="hidden"
                    id="transcript-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="transcript-upload"
                    className={`flex items-center gap-2 text-white cursor-pointer hover:opacity-90 transition-opacity w-full h-full justify-center ${
                      isUploading ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    {isUploading ? (
                      <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                    {isUploading ? 'Je charge...' : 'Importe ta transcription'}
                  </label>
                </div>
              ) : (
                <div className="flex gap-2 bg-[#E4E4E7] rounded-[8px] h-[54px] p-2">
                  <textarea
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-2 py-2 bg-transparent border-0 focus:outline-none resize-none text-[16px] leading-[24px] max-h-[200px] overflow-y-auto"
                    placeholder="Parle-moi de tes réflexions..."
                    disabled={isLoading}
                    rows={1}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={sendMessage}
                      className={`p-2 rounded-lg ${
                        isLoading || !inputMessage.trim()
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-[#818DF7] hover:bg-opacity-10'
                      }`}
                      disabled={isLoading || !inputMessage.trim()}
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onSubmit={handleDetailedFeedback}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};

export default ChatInterface; 