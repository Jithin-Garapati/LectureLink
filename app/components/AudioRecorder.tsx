'use client';

import { useState } from 'react';
import { AudioStorage } from '../lib/audioStorage';

interface AudioRecorderProps {
  onData: (blob: Blob) => void;
  onRecordingStateChange: (recording: boolean) => void;
}

export function AudioRecorder({
  onData,
  onRecordingStateChange,
}: AudioRecorderProps) {

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      console.log('✅ Got media stream');

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000
      });
      console.log('✅ Created MediaRecorder');

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log(`📦 Got chunk of size: ${event.data.size} bytes`);
          onData(event.data);
        }
      };

      recorder.start(3000); // Send chunks every 3 seconds
      console.log('🎙️ Recorder started, chunk interval: 3000ms');
      setMediaRecorder(recorder);
      setIsRecording(true);
      onRecordingStateChange(true);
    } catch (error) {
      console.error('❌ Error starting recording:', error);
    }
  }, [onData, onRecordingStateChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      onRecordingStateChange(false);
    }
  }, [mediaRecorder, onRecordingStateChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-2 rounded-full ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white transition-colors`}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isRecording ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          )}
        </svg>
      </button>
      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-red-500">●</span>
          <span className="text-ssm text-gray-500">Recording...</span>
        </div>
      )}
    </div>
  );
}