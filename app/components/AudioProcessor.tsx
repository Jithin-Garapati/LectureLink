'use client'

import React, { useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Mic, Loader2 } from 'lucide-react'
import { Session } from '@supabase/auth-helpers-nextjs'
import { AudioStorage } from '../lib/audioStorage'
import { transcribeAudio } from '@/utils/transcriptionClient'

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
            setProcessingState({
              status: 'processing',
              message: 'Getting transcription...',
              totalChunks: 3, // 3 steps: transcribe, generate notes, generate heading
              processedChunks: 0
            })

            // Step 1: Get transcription using client-side approach
            const audioBlob = new Blob(audioChunksRef.current, { type: getSupportedMimeType() })
            const audioFile = new File([audioBlob], 'recording.webm', { type: getSupportedMimeType() })
            
            try {
              const transcription = await transcribeAudio(audioFile)
              if (!transcription || !transcription.text) {
                throw new Error('No transcription received')
              }

              onTranscriptUpdate(transcription.text)

              setProcessingState(prev => ({
                ...prev,
                message: 'Generating enhanced notes...',
                processedChunks: 1
              }))

              // Step 2: Generate enhanced notes
              const notesResponse = await fetch('/api/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcription: transcription.text }),
              })

              if (!notesResponse.ok) {
                throw new Error('Failed to generate notes')
              }

              const { enhanced_notes: enhancedNotes } = await notesResponse.json()
              console.log('Enhanced notes received:', enhancedNotes)

              setProcessingState(prev => ({
                ...prev,
                message: 'Generating heading...',
                processedChunks: 2
              }))

              // Step 3: Generate heading
              const headingResponse = await fetch('/api/generate-heading', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  transcription: transcription.text,
                  enhancedNotes 
                }),
              })

              if (!headingResponse.ok) {
                throw new Error('Failed to generate heading')
              }

              const { heading, subjectTag } = await headingResponse.json()
              console.log('Heading and subject tag received:', { heading, subjectTag })

              // Create and update lecture in Supabase
              const lecture = await audioStorage.createLecture(subjectId, session?.user?.id || '')
              console.log('Created lecture:', lecture)

              // Update lecture in Supabase with all data at once
              const updateData = {
                status: 'completed' as const,
                transcript: transcription.text.trim(),
                enhanced_notes: enhancedNotes,
                heading,
                subject_tag: subjectTag
              }
              console.log('Updating lecture with data:', updateData)

              await audioStorage.updateLectureStatus(lecture.id, updateData)

              setProcessingState(prev => ({
                ...prev,
                status: 'completed',
                message: 'Processing complete',
                processedChunks: 3
              }))

              toast({
                title: 'Success',
                description: 'Audio processed and notes generated successfully'
              })

            } catch (error) {
              console.error('Error processing audio:', error)
              toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to process audio',
                variant: 'destructive'
              })

              setProcessingState(prev => ({
                ...prev,
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to process audio'
              }))
            } finally {
              // Stop all tracks
              stream.getTracks().forEach(track => track.stop())
            }
          } catch (error) {
            console.error('Error processing audio:', error)
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to process audio',
              variant: 'destructive'
            })

            setProcessingState(prev => ({
              ...prev,
              status: 'error',
              message: error instanceof Error ? error.message : 'Failed to process audio'
            }))
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