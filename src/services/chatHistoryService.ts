import { Message, Transcript } from '../types/types';

interface ChatSession {
  id: string;
  title: string;
  date: Date;
  preview: string;
  messages: Message[];
  transcript: Transcript;
  isFavorite: boolean;
}

const STORAGE_KEY = 'chat_history';

export const saveChatToHistory = (messages: Message[], transcript: Transcript, isFavorite: boolean = false) => {
  const chatHistory = getChatHistory();
  const existingChatIndex = chatHistory.findIndex(chat => chat.id === transcript.id);
  
  const chatSession: ChatSession = {
    id: transcript.id,
    title: transcript.title,
    date: transcript.uploadDate,
    preview: messages[messages.length - 1]?.content || '',
    messages,
    transcript,
    isFavorite
  };

  if (existingChatIndex !== -1) {
    // Only update favorite status if it's explicitly provided
    if (isFavorite !== undefined) {
      chatSession.isFavorite = isFavorite;
    } else {
      chatSession.isFavorite = chatHistory[existingChatIndex].isFavorite;
    }
    chatHistory[existingChatIndex] = chatSession;
  } else {
    chatHistory.unshift(chatSession);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
};

export const getChatHistory = (): ChatSession[] => {
  const history = localStorage.getItem(STORAGE_KEY);
  if (!history) return [];
  
  return JSON.parse(history).map((chat: any) => ({
    ...chat,
    date: new Date(chat.date),
    messages: chat.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    })),
    transcript: {
      ...chat.transcript,
      uploadDate: new Date(chat.transcript.uploadDate)
    }
  }));
};

export const loadChatSession = (id: string): ChatSession | null => {
  const history = getChatHistory();
  return history.find(chat => chat.id === id) || null;
};

export const deleteChatSession = (id: string): void => {
  const history = getChatHistory();
  const updatedHistory = history.filter(chat => chat.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
}; 