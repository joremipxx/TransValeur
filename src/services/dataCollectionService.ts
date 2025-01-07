interface ConversationData {
  transcript: string;
  conversation: {
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
    feedback?: 'positive' | 'negative';
  }[];
  metadata: {
    uploadDate: Date;
    transcriptTitle: string;
    sessionDuration: number;
    lastFeedback?: {
      messageId: string;
      type: 'positive' | 'negative';
      timestamp: Date;
      messageContent: string;
      transcriptContext: string;
      detailedFeedback?: string;
    };
  };
}

export async function saveConversationData(data: ConversationData) {
  try {
    // Here you would implement your data storage logic
    // This could be a call to your backend API
    console.log('Saving conversation data for future tuning:', data);
    
    // Example API call:
    // await fetch('/api/conversations', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data),
    // });
  } catch (error) {
    console.error('Error saving conversation data:', error);
  }
} 