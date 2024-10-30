'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Import react-markdown and plugins for rendering math and formatted content
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css' // For styling the formulas

interface Lecture {
  id: string
  subject_id: string
  heading: string
  subject_tag: string
  transcript: string
  enhanced_notes: string
  recorded_at: string
}

interface Subject {
  id: string
  name: string
}

export default function LecturePage() {
  const { id } = useParams()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)

  useEffect(() => {
    const fetchLectureAndSubject = async () => {
      setIsLoading(true)
      setError(null)
      try {
        console.log('Fetching lecture with ID:', id)
        const lectureResponse = await axios.get<Lecture>(`/api/lectures/${id}`)
        console.log('Lecture data:', lectureResponse.data)
        setLecture(lectureResponse.data)

        console.log('Fetching subject with ID:', lectureResponse.data.subject_id)
        const subjectResponse = await axios.get<Subject>(`/api/subjects/${lectureResponse.data.subject_id}`)
        console.log('Subject data:', subjectResponse.data)
        setSubject(subjectResponse.data)
      } catch (error) {
        console.error('Error fetching lecture details:', error)
        if (axios.isAxiosError(error)) {
          console.error('Response data:', error.response?.data)
          console.error('Response status:', error.response?.status)
        }
        setError('Failed to load lecture details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchLectureAndSubject()
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

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error || !lecture) {
    return <div>{error || 'Failed to load lecture details.'}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/">
        <Button className="mb-4">← Back to Lectures</Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{lecture.heading}</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  )
}
