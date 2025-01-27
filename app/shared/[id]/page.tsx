'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Button } from "@/components/ui/button"
import { Sparkles, Rocket, Brain, Zap, Clock } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Lecture {
  id: string
  heading: string
  enhanced_notes: string
  subject_name: string
  subject_tag: string
  formatted_date: string
  formatted_time: string
}

function ThinkingProcess({ content }: { content: string }) {
  const [showThinking, setShowThinking] = useState(false)
  const [timer, setTimer] = useState(30)

  useEffect(() => {
    if (showThinking && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [showThinking, timer])

  const match = content.match(/<think duration="(\d+)">([\s\S]*?)<\/think>/)
  if (!match) return null

  const [, , thoughts] = match

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-between p-4 mb-4"
          onClick={() => setShowThinking(prev => !prev)}
        >
          <span>View AI Thinking Process</span>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{timer}s</span>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mb-6 bg-slate-50">
          <CardContent className="p-4">
            <ReactMarkdown
              className="prose prose-sm max-w-none"
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {thoughts}
            </ReactMarkdown>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function SharedLecturePage() {
  const router = useRouter()
  const { id } = useParams()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharedLecture = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await axios.get<Lecture>(`/api/shared/${id}`)
        setLecture(response.data)
      } catch (error) {
        console.error('Error fetching lecture:', error)
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            setError('Lecture not found. It may have been deleted or you may not have permission to view it.')
          } else {
            setError('Failed to load the lecture. Please try again later.')
          }
        } else {
          setError('An unexpected error occurred. Please try again later.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchSharedLecture()
    }
  }, [id])

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4">
      <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      <Button onClick={() => router.push('/')} variant="outline">
        Return to Home
      </Button>
    </div>
  )

  if (!lecture) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-lg text-gray-600 dark:text-gray-400">
        Lecture not found
      </div>
    </div>
  )

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Main Title Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {lecture.subject_name}
          </h1>
          <span role="img" aria-label="notebook" className="text-2xl">
            📚
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {lecture.formatted_date} at {lecture.formatted_time} 
          <span role="img" aria-label="clock" className="ml-1">⏰</span>
        </p>
      </div>

      {/* Lecture Content Card */}
      <Card className="border border-gray-200 dark:border-gray-800 mb-8">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            {lecture.heading}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThinkingProcess content={lecture.enhanced_notes} />
          <div className="rounded-md border border-gray-200 bg-slate-50 p-4 sm:p-6">
            <ReactMarkdown
              className="prose prose-sm sm:prose max-w-none"
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {lecture.enhanced_notes.replace(/<think[\s\S]*?<\/think>/, '')}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Promotional Section */}
      <div className="rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-6 sm:p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Transform Your Lecture Notes! 
              </h2>
            </div>
            <div className="inline-flex items-center px-4 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
              <span className="mr-1">🎉</span>
              100% Free Forever
              <span className="ml-1">🎓</span>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
            Hey there! We&apos;re just getting started with LectureLink - a free tool I built to help students like you create better lecture notes using AI. Would love to have you try it out! 
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-6">
            <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Brain className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold">AI-Enhanced Notes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Turn recordings into organized notes</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Zap className="h-8 w-8 text-yellow-500 mb-2" />
              <h3 className="font-semibold">Quick &amp; Easy</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Record lectures &amp; let AI do the work</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Rocket className="h-8 w-8 text-purple-500 mb-2" />
              <h3 className="font-semibold">Share Notes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Help your classmates too!</p>
            </div>
          </div>

          <Button 
            onClick={() => router.push('/auth/sign-in')}
            className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-2 rounded-full font-medium transform transition-all hover:scale-105"
          >
            Try It Out - It&apos;s Free! 
          </Button>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Built with by a student, for students. Early access - be one of the first to try it!
          </p>
        </div>
      </div>

      {/* Footer Attribution */}
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Powered by{" "}
        <a 
          href="/"
          className="font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          LectureLink
        </a>{" "}
        
      </footer>
    </div>
  )
} 