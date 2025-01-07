interface CleanedTranscript {
  content: string;
  stats: {
    originalLength: number;
    cleanedLength: number;
    duplicatesRemoved: number;
    errorsFixed: number;
  };
}

export function cleanTranscript(text: string): CleanedTranscript {
  const originalLength = text.length;
  let cleanedText = text;
  let duplicatesRemoved = 0;
  let errorsFixed = 0;

  // Remove duplicate consecutive lines
  cleanedText = cleanedText.split('\n').reduce((acc, current) => {
    if (acc[acc.length - 1] !== current) {
      acc.push(current);
    } else {
      duplicatesRemoved++;
    }
    return acc;
  }, [] as string[]).join('\n');

  // Fix common errors and clean up text
  const errorPatterns = [
    { pattern: /\s{2,}/g, replacement: ' ' }, // Multiple spaces
    { pattern: /\n{3,}/g, replacement: '\n\n' }, // Excessive line breaks
    { pattern: /[^\S\r\n]+$/gm, replacement: '' }, // Trailing spaces
    { pattern: /^\s+/gm, replacement: '' }, // Leading spaces
    { pattern: /\b(\w+)\s+\1\b/g, replacement: '$1' }, // Repeated words
  ];

  errorPatterns.forEach(({ pattern, replacement }) => {
    const matches = cleanedText.match(pattern) || [];
    errorsFixed += matches.length;
    cleanedText = cleanedText.replace(pattern, replacement);
  });

  return {
    content: cleanedText.trim(),
    stats: {
      originalLength,
      cleanedLength: cleanedText.length,
      duplicatesRemoved,
      errorsFixed
    }
  };
} 