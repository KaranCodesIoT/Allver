import React, { useRef, useEffect } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useTranslation } from '../utils/i18n';
import { handleTransliteration } from '../utils/transliteration';

export interface TransliteratedTextInputProps extends TextInputProps {
  // Option to disable transliteration for specific inputs (e.g. passwords, numbers, email)
  disableTransliteration?: boolean;
}

export default function TransliteratedTextInput({
  disableTransliteration = false,
  value,
  onChangeText,
  ...props
}: TransliteratedTextInputProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  
  // Track previous text to check character additions
  const prevTextRef = useRef<string>(value || '');

  // Keep ref in sync when value is updated externally
  useEffect(() => {
    prevTextRef.current = value || '';
  }, [value]);

  const handleChangeText = async (text: string) => {
    // 1. Immediately update UI with typed value for lag-free typing
    onChangeText?.(text);
    prevTextRef.current = text;

    // 2. Skip transliteration if disabled or language is English
    if (disableTransliteration || currentLang === 'en') {
      return;
    }

    // 3. Process transliteration
    try {
      const transliteratedText = await handleTransliteration(text, prevTextRef.current, currentLang);
      if (transliteratedText !== text) {
        onChangeText?.(transliteratedText);
        prevTextRef.current = transliteratedText;
      }
    } catch (error) {
      console.warn('Transliteration error during change:', error);
    }
  };

  return (
    <TextInput
      value={value}
      onChangeText={handleChangeText}
      {...props}
    />
  );
}
