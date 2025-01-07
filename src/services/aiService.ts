import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const rateLimiter = {
  tokens: 10,
  lastRefill: Date.now(),
  refillRate: 1000, // 1 second

  async checkLimit() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    this.tokens = Math.min(10, this.tokens + Math.floor(timePassed / this.refillRate));
    this.lastRefill = now;

    if (this.tokens <= 0) {
      throw new Error('Trop de requêtes. Attends un moment avant de réessayer.');
    }
    this.tokens--;
  }
};

function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
    .trim();
}

interface AISettings {
  useTutoiement: boolean;
  customInstructions: string;
  tonality: string;
  responseLength: string;
  boldWords: boolean;
}

export async function getAIResponse(
  message: string, 
  transcript: string, 
  settings?: AISettings,
  maxRetries = 3
) {
  await rateLimiter.checkLimit();
  
  const sanitizedMessage = sanitizeInput(message);
  const sanitizedTranscript = sanitizeInput(transcript);
  
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      if (!process.env.REACT_APP_OPENAI_API_KEY) {
        console.error('API key is missing');
        throw new Error('API key is not configured');
      }

      console.log('Starting API call with transcript length:', sanitizedTranscript.length);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `${settings?.customInstructions || ''}

Règles de Communication IMPORTANTES:
- ${settings?.useTutoiement ? 'Utilise EXCLUSIVEMENT le tutoiement (tu, ton, ta, tes), JAMAIS le vouvoiement' : 'Utilise EXCLUSIVEMENT le vouvoiement (vous, votre, vos), JAMAIS le tutoiement'}
- Pour la PREMIÈRE réponse uniquement: commence par "Bonjour !" de manière chaleureuse
- Pour TOUTES les autres réponses: NE commence PAS par des salutations, entre directement dans le sujet
- Structure tes réponses avec des sauts de ligne pour une meilleure lisibilité
- Évite les listes numérotées formelles, préfère une discussion fluide
- Pose des questions ouvertes et encourageantes
- Reformule les idées de manière empathique
- RÈGLE CRUCIALE: Réponds UNIQUEMENT aux questions en lien avec la transcription fournie. Si la question n'est pas liée à la transcription, réponds poliment: "Je suis désolé, mais je ne peux répondre qu'aux questions en lien avec la transcription fournie. Pourrais-tu me poser une question sur le contenu de la transcription ?"

${settings?.boldWords ? `RÈGLES DE MISE EN GRAS IMPORTANTES:
Utilise le format markdown **texte** pour mettre en gras de manière modérée:
1. Les valeurs et qualités principales:
   - Les valeurs personnelles importantes (ex: "**l'authenticité**")
   - Les qualités marquantes (ex: "**ta capacité d'adaptation**")

2. Les moments clés:
   - Les événements significatifs (ex: "**quand tu as pris cette décision**")
   - Les réalisations importantes (ex: "**lorsque tu as accompli**")

3. Les insights majeurs:
   - Les découvertes importantes (ex: "**je remarque que**")
   - Les conclusions significatives (ex: "**ce qui montre**")

4. Les questions essentielles:
   - Les questions de réflexion clés (ex: "**qu'est-ce qui te motive vraiment ?**")

5. Les émotions significatives:
   - Les émotions importantes (ex: "**tu sembles enthousiaste**")

IMPORTANT: Utilise le gras avec modération, en visant 1-2 éléments par paragraphe pour une meilleure lisibilité.` : ''}

Longueur des réponses:
${settings?.responseLength === 'concise' ? '- Sois bref et direct, va droit à l\'essentiel\n- Limite-toi à 2-3 phrases par point\n- Évite les détails non essentiels' :
  settings?.responseLength === 'detailed' ? '- Fournis des explications détaillées et approfondies\n- Développe chaque point avec des exemples\n- Explore les nuances et les implications' :
  '- Maintiens un équilibre entre concision et détail\n- Fournis suffisamment de contexte sans être verbeux\n- Reste pertinent et informatif'}

Tonalité à adopter: ${settings?.tonality || 'Empathique et encourageant'}

Voici la transcription à analyser: ${sanitizedTranscript}`
          },
          {
            role: "user",
            content: sanitizedMessage
          }
        ],
        temperature: 0.7,
        max_tokens: settings?.responseLength === 'concise' ? 300 :
                   settings?.responseLength === 'detailed' ? 1000 : 600,
      });

      console.log('API Response:', response);
      return response.choices[0]?.message?.content || 'Aucune réponse générée';
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} failed:`, error);
      
      if (attempts === maxRetries) {
        throw new Error('Désolé, je n\'arrive pas à obtenir une réponse après plusieurs essais. Peux-tu réessayer?');
      }
      
      // Exponential backoff: wait longer between each retry
      const delay = 1000 * Math.pow(2, attempts);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Erreur inattendue lors de la communication avec l\'IA');
} 