import { Alert } from 'react-native';

export class VoiceService {
  private static isSpeaking: boolean = false;
  private static isListening: boolean = false;

  /**
   * Starts speech-to-text recording (mock).
   * Supports random simulation of multi-lingual voice queries.
   */
  static startListening(onResult: (text: string) => void): void {
    if (this.isListening) return;
    this.isListening = true;
    console.log('[VoiceService] Mock Speech Recognition Started');

    // Simulate speech input after 2.0 seconds
    setTimeout(() => {
      if (this.isListening) {
        const mockPhrases = [
          // Search / Other Commands
          'Show me modern living room designs',
          'Find contractors in my area',
          'Compare project estimates',
          'Show my project updates',
          'Search for skilled carpenters',
        ];
        const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
        console.log('[VoiceService] Mock Speech Result (Multi-lingual):', randomPhrase);
        onResult(randomPhrase);
        this.isListening = false;
      }
    }, 2000);
  }

  /**
   * Stops speech-to-text recording (mock)
   */
  static stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;
    console.log('[VoiceService] Mock Speech Recognition Stopped');
  }

  /**
   * Plays text-to-speech audio (mock)
   */
  static speak(text: string): void {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }
    this.isSpeaking = true;
    console.log('[VoiceService] Mock speaking:', text);
  }

  /**
   * Stops text-to-speech audio playback (mock)
   */
  static stopSpeaking(): void {
    if (!this.isSpeaking) return;
    this.isSpeaking = false;
    console.log('[VoiceService] Mock speaking stopped');
  }
}
