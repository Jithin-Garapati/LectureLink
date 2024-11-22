'use client'

import React, { useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Mic, Loader2 } from 'lucide-react'
import { Session } from '@supabase/auth-helpers-nextjs'
import { AudioStorage } from '../lib/audioStorage'

interface AudioProcessorProps {
  subjectId: string
  onTranscriptUpdate: (transcript: string) => void
  audioStorage: AudioStorage
  session: Session | null
}

interface ProcessingState {
  status: 'idle' | 'processing' | 'completed' | 'error'
  message: string
  totalChunks: number
  processedChunks: number
}

const AudioProcessor: React.FC<AudioProcessorProps> = ({
  subjectId,
  onTranscriptUpdate,
  audioStorage,
  session
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    message: '',
    totalChunks: 0,
    processedChunks: 0
  })
  const { toast } = useToast()

  const getSupportedMimeType = () => {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg']
    return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm'
  }

  const startRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: getSupportedMimeType(),
        })

        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          try {
            await processRecording()
          } catch (error) {
            console.error('Error processing recording:', error)
          } finally {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop())
          }
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (error) {
        console.error('Error starting recording:', error)
        toast({
          title: 'Error',
          description: 'Failed to start recording. Please try again.',
          variant: 'destructive'
        })
      }
    }
  }

  const processRecording = async () => {
    if (!session?.user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to record lectures',
        variant: 'destructive',
      })
      return
    }

    try {
      let lecture = await audioStorage.createLecture(subjectId, session.user.id)

      if (audioChunksRef.current.length > 0) {
        setProcessingState({
          status: 'processing',
          message: 'Getting transcription...',
          totalChunks: 3, // 3 steps: transcribe, generate notes, generate heading
          processedChunks: 0
        })

        // Convert audio chunks to base64
        const audioBlob = new Blob(audioChunksRef.current, { type: getSupportedMimeType() })
        const base64Audio = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64String = reader.result as string
            resolve(base64String.split(',')[1]) // Remove data URL prefix
          }
          reader.readAsDataURL(audioBlob)
        })

        // Step 1: Get transcription from API route
        const transcriptionResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        })

        if (!transcriptionResponse.ok) {
          throw new Error('Failed to get transcription')
        }

        const transcription = await transcriptionResponse.json()
        if (!transcription || !transcription.text) {
          throw new Error('No transcription received')
        }

        onTranscriptUpdate(transcription.text)

        // Update lecture with transcription
        await audioStorage.updateLectureStatus(lecture.id, {
          status: 'transcribing',
          transcript: transcription.text
        })

        setProcessingState(prev => ({
          ...prev,
          message: 'Generating enhanced notes...',
          processedChunks: 1
        }))

        // Step 2: Generate enhanced notes
        const notesResponse = await fetch('/api/generate-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: transcription.text,
          }),
        })

        if (!notesResponse.ok) {
          throw new Error('Failed to generate notes')
        }

        const { notes } = await notesResponse.json()

        // Update lecture with enhanced notes
        await audioStorage.updateLectureStatus(lecture.id, {
          status: 'completed',
          enhanced_notes: notes
        })

        setProcessingState(prev => ({
          ...prev,
          status: 'completed',
          message: 'Processing complete!',
          processedChunks: prev.totalChunks
        }))

      } else {
        throw new Error('No audio recorded')
      }
    } catch (error) {
      console.error('Error processing recording:', error)
      setProcessingState({
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
        totalChunks: 0,
        processedChunks: 0
      })
      toast({
        title: 'Error',
        description: 'Failed to process recording',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={startRecording}
        disabled={processingState.status === 'processing'}
        variant={isRecording ? "destructive" : "outline"}
        className={`w-full ${isRecording ? 'animate-pulse' : ''}`}
      >
        <Mic className="w-4 h-4 mr-2" />
        {isRecording ? 'Recording...' : 'Start Recording'}
      </Button>

      {processingState.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" />
            <span className="text-sm">{processingState.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default AudioProcessor