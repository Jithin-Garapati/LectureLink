'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

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

          <h3 className="font-semibold mt-4 mb-2">Transcript:</h3>
          {/* Render markdown for transcript */}
          <ReactMarkdown
            className="whitespace-pre-wrap p-2 bg-gray-100 rounded text-sm mb-4"
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {lecture.transcript}
          </ReactMarkdown>

          <h3 className="font-semibold mt-4 mb-2">Enhanced Notes:</h3>
          {/* Render markdown for enhanced notes */}
          <ReactMarkdown
            className="whitespace-pre-wrap p-2 bg-gray-100 rounded text-sm"
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {lecture.enhanced_notes}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  )
}
