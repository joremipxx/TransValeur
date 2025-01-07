export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  feedback?: 'positive' | 'negative' | 'none';
  animationComplete?: boolean;
}

export interface Transcript {
  id: string;
  content: string;
  title: string;
  uploadDate: Date;
}

export interface FileError {
  type: 'size' | 'format' | 'read' | 'unknown';
  message: string;
}

export interface Feedback {
  messageId: string;
  type: 'positive' | 'negative';
  timestamp: Date;
  userId: string;
}

export interface ConversationData {
  userId?: string;
  transcript: string;
  conversation: Array<{
    role: string;
    content: string;
    timestamp: Date;
    feedback?: 'positive' | 'negative';
  }>;
  metadata: {
    uploadDate: Date;
    transcriptTitle: string;
    sessionDuration: number;
    lastFeedback?: {
      userId?: string;
      messageId: string;
      type: 'positive' | 'negative';
      timestamp: Date;
      messageContent: string;
      transcriptContext: string;
      detailedFeedback?: string;
    };
  };
}

export interface ChatSession {
  id: string;
  title: string;
  date: Date;
  preview: string;
  messages: Message[];
  transcript: Transcript;
  isFavorite: boolean;
}

export type CoachingStep = `custom_step_${number}`;

export interface CoachingStepData {
  title: string;
  description: string;
  questions: string[];
}

export const COACHING_STEPS: { [key in CoachingStep]?: CoachingStepData } = {};

export interface CoachingProgress {
  currentStep: CoachingStep;
  completedSteps: CoachingStep[];
  isComplete: boolean;
}

export interface ChatHistoryService {
  getChatHistory: (userId: string) => ChatSession[];
  saveChatToHistory: (messages: Message[], transcript: Transcript, userId: string) => void;
  loadChatSession: (id: string) => ChatSession | null;
} 