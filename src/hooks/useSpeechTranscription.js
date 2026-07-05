import { useEffect, useRef, useState } from 'react';

export function useSpeechTranscription({ enabled, speakerName, onFinalLine, onInterimLine }) {
  const [liveText, setLiveText] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      if (!enabledRef.current) return;
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        if (onFinalLine) {
          onFinalLine({
            speaker: speakerName,
            text: finalTranscript.trim(),
          });
        }
        setLiveText('');
        if (onInterimLine) onInterimLine({ speaker: speakerName, text: '' });
      } else {
        setLiveText(interimTranscript);
        if (onInterimLine) onInterimLine({ speaker: speakerName, text: interimTranscript });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        enabledRef.current = false;
        setError('Microphone permission blocked. Please allow it in your browser settings.');
      } else if (event.error === 'no-speech') {
        // Just no speech detected, ignore
      } else if (event.error === 'audio-capture') {
        setError('No microphone was found. Ensure it is plugged in.');
        enabledRef.current = false;
      } else {
        setError(`Transcription error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Browser SpeechRecognition stops automatically after silence.
      // We must restart it if it's still supposed to be enabled.
      if (enabledRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore restart errors
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [speakerName, onFinalLine]);

  useEffect(() => {
    if (enabled && isSupported && recognitionRef.current) {
      try {
        setError(null);
        recognitionRef.current.start();
      } catch (e) {
        // already started
      }
    } else if (!enabled && recognitionRef.current) {
      recognitionRef.current.stop();
      setLiveText('');
    }
  }, [enabled, isSupported]);

  return { liveText, isSupported, error };
}