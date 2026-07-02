import { Platform } from 'react-native';

const ITC_MAPPING: Record<string, string> = {
  hi: 'hi-t-i0-und',
  mr: 'mr-t-i0-und',
  ta: 'ta-t-i0-und',
  te: 'te-t-i0-und',
  kn: 'kn-t-i0-und',
  ml: 'ml-t-i0-und',
  bn: 'bn-t-i0-und',
  gu: 'gu-t-i0-und',
  pa: 'pa-t-i0-und',
};

/**
 * Transliterates a single word from phonetic English to the target language script
 * using the public Google Input Tools API.
 */
export async function transliterateWord(word: string, langCode: string): Promise<string> {
  if (!word || !word.trim()) return word;
  
  const itc = ITC_MAPPING[langCode];
  if (!itc) return word; // No transliteration needed or supported for this language (e.g. English)

  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=${itc}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
    const response = await fetch(url);
    if (!response.ok) return word;
    
    const data = await response.json();
    if (data && data[0] === 'SUCCESS') {
      const suggestions = data[1]?.[0]?.[1];
      if (suggestions && suggestions.length > 0) {
        return suggestions[0]; // Return the top suggestion
      }
    }
  } catch (err) {
    console.warn('Transliteration failed:', err);
  }
  return word;
}

/**
 * Process text change and transliterate the word before cursor if a space or punctuation is entered.
 * Returns the new text.
 */
export async function handleTransliteration(
  text: string,
  prevText: string,
  langCode: string
): Promise<string> {
  if (!langCode || langCode === 'en' || !ITC_MAPPING[langCode]) {
    return text;
  }

  // Detect if user added a space or punctuation at the end
  if (text.length > prevText.length) {
    const lastChar = text[text.length - 1];
    const isTriggerChar = lastChar === ' ' || lastChar === ',' || lastChar === '.' || lastChar === '\n';
    
    if (isTriggerChar) {
      // Find the last word before the trigger character
      const words = text.slice(0, -1).split(/\s+/);
      const lastWord = words[words.length - 1];
      
      // If the word has English letters, transliterate it
      if (lastWord && /[a-zA-Z]/.test(lastWord)) {
        const transliterated = await transliterateWord(lastWord, langCode);
        if (transliterated !== lastWord) {
          // Reconstruct the text with the transliterated word
          const prefix = text.slice(0, text.length - 1 - lastWord.length);
          return prefix + transliterated + lastChar;
        }
      }
    }
  }
  
  return text;
}
