'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { ChevronDown, ChevronUp, Share2, Copy, Link2, Loader2 } from "lucide-react"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

// Import react-markdown and plugins for rendering math and formatted content
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface Lecture {
  id: string
  subject_id: string
  heading: string
  subject_tag: string
  transcript: string
  enhanced_notes: string
  recorded_at: string
  status: string
  transcription_progress: number
}

interface Subject {
  id: string
  name: string
}

export default function LecturePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const { toast } = useToast()
  const [shareUrl, setShareUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchLectureAndSubject = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const lectureResponse = await axios.get<Lecture>(`/api/lectures/${id}`)
      setLecture(lectureResponse.data)

      // Start polling if the lecture is still processing
      if (lectureResponse.data.status === 'processing' || 
          lectureResponse.data.status === 'transcribing') {
        setIsProcessing(true)
        startPolling()
      }

      const subjectResponse = await axios.get<Subject>(`/api/subjects/${lectureResponse.data.subject_id}`)
      setSubject(subjectResponse.data)
    } catch (error) {
      console.error('Error fetching lecture details:', error)
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || 'Failed to load lecture details'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get<Lecture>(`/api/lectures/${id}`)
        setLecture(response.data)

        if (response.data.status === 'completed') {
          setIsProcessing(false)
          clearInterval(pollInterval)
          toast({
            title: 'Processing Complete',
            description: 'Your lecture has been fully processed!',
          })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 5000) // Poll every 5 seconds

    // Cleanup on component unmount
    return () => clearInterval(pollInterval)
  }

  useEffect(() => {
    if (id) {
      fetchLectureAndSubject()
    }
  }, [id, fetchLectureAndSubject])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/shared/${id}`)
    }
  }, [id])

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, 'PPpp')
    } catch (error) {
      console.error('Error parsing date:', error)
      return 'Invalid date'
    }
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied!",
        description: "Share this link with your classmates",
      })
    } catch (_) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4">Loading lecture...</p>
        </div>
      </div>
    )
  }

  if (error || !lecture) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Failed to load lecture details.'}</p>
          <Button 
            onClick={() => fetchLectureAndSubject()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <Link href="/">
          <Button>← Back to Lectures</Button>
        </Link>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share with Mates
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Share with your study buddies 🎓
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="select-all font-mono text-sm"
                />
                <Button onClick={copyShareLink} type="submit">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Anyone with this link can view these notes
                </p>
                <p className="flex items-center gap-2">
                  <span role="img" aria-label="rocket">🚀</span>
                  Share and study together!
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{lecture.heading}</CardTitle>
          {isProcessing && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing... {Math.round(lecture.transcription_progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${lecture.transcription_progress}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-2">
            Subject: {subject?.name || 'Unknown Subject'}
          </p>
          <p className="text-sm text-gray-500 mb-2">
            Tag: <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
              {lecture.subject_tag || 'Untagged'}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Recorded on: {formatDate(lecture.recorded_at)}
          </p>

          {lecture.transcript && (
            <Collapsible
              open={isTranscriptOpen}
              onOpenChange={setIsTranscriptOpen}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Transcript</h3>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    {isTranscriptOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle transcript</span>
                  </Button>
                </CollapsibleTrigger>
              </div>
　　 　 　 　 <div className="rounded-md border border-gray-200 bg-slate-50 p-4">
                <div className={`${isTranscriptOpen ? '' : 'max-h-16 overflow-hidden relative'}`}>
                  <ReactMarkdown
                    className="prose prose-sm max-w-none"
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {lecture.transcript}
                  </ReactMarkdown>
                  {!isTranscriptOpen && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                  className="mt-2"
                >
                  {isTranscriptOpen ? 'Show Less' : 'Read More'}
                </Button>
              </div>
            </Collapsible>
          )}

          {lecture.enhanced_notes && (
            <>
              <h3 className="font-semibold mt-6 mb-2">Enhanced Notes:</h3>
              <div className="rounded-md border border-gray-200 bg-slate-50 p-4">
                <ReactMarkdown
                  className="prose prose-sm max-w-none 
                    [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-6
                    [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-5
                    [&>h3]:text-lg [&>h3]:font-medium [&>h3]:mt-4
                    [&>h4]:mt-4 
                    [&>p]:mt-2"
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {lecture.enhanced_notes}
                </ReactMarkdown>
              </div>
            </>
          )}

          {!lecture.transcript && !lecture.enhanced_notes && !isProcessing && (
            <div className="text-center py-8 text-gray-500">
              <p>Processing has not started yet.</p>
              <Button 
                onClick={fetchLectureAndSubject}
                className="mt-4"
              >
                Refresh Status
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}