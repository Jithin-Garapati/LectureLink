'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AudioRecorder } from 'react-audio-voice-recorder'
import axios from 'axios'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Checkbox } from "@/components/ui/checkbox"
import { X } from 'lucide-react'  // Import the X icon

interface Subject {
  id: string
  name: string
}

interface Lecture {
  id: string
  subject_id: string
  heading: string
  subject_tag: string
  transcript: string
  enhanced_notes: string
  recorded_at: string
}

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Subject name is required.",
  }),
})

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [filteredLectures, setFilteredLectures] = useState<Lecture[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  useEffect(() => {
    fetchSubjects()
    fetchLectures()
  }, [])

  useEffect(() => {
    filterLectures()
  }, [lectures, searchTerm, selectedSubjects, selectedTags])

  const fetchSubjects = async () => {
    try {
      const response = await axios.get<Subject[]>('/api/subjects')
      setSubjects(response.data)
    } catch (error) {
      console.error('Error fetching subjects:', error)
      toast({
        title: "Error",
        description: "Failed to fetch subjects. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchLectures = async () => {
    try {
      const response = await axios.get<Lecture[]>('/api/lectures')
      setLectures(response.data)
    } catch (error) {
      console.error('Error fetching lectures:', error)
      toast({
        title: "Error",
        description: "Failed to fetch lectures. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filterLectures = () => {
    let filtered = lectures

    if (searchTerm) {
      filtered = filtered.filter(lecture => 
        lecture.heading.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecture.subject_tag.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedSubjects.length > 0) {
      filtered = filtered.filter(lecture => selectedSubjects.includes(lecture.subject_id))
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(lecture => selectedTags.includes(lecture.subject_tag))
    }

    setFilteredLectures(filtered)
  }

  const onAddSubject = async (data: z.infer<typeof formSchema>) => {
    try {
      await axios.post('/api/subjects', data)
      fetchSubjects()
      form.reset()
      toast({
        title: "Success",
        description: "Subject added successfully.",
      })
    } catch (error) {
      console.error('Error adding subject:', error)
      toast({
        title: "Error",
        description: "Failed to add subject. Please try again.",
        variant: "destructive",
      })
    }
  }

  const onRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob)
  }

  const onSaveLecture = async () => {
    if (!audioBlob || !selectedSubject) {
      toast({
        title: "Error",
        description: "Please select a subject and record audio before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'lecture.webm')
      formData.append('subject_id', selectedSubject)

      const transcribeResponse = await axios.post<{ transcription: string; enhancedNotes: string }>('/api/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { transcription, enhancedNotes } = transcribeResponse.data

      const headingResponse = await axios.post('/api/generate-heading', { 
        transcription, 
        enhancedNotes 
      })
      const { heading, subjectTag } = headingResponse.data

      const lectureData = {
        subject_id: selectedSubject,
        heading,
        subject_tag: subjectTag,
        transcript: transcription,
        enhanced_notes: enhancedNotes,
        recorded_at: new Date().toISOString(),
      }

      await axios.post('/api/lectures', lectureData)

      fetchLectures()
      setAudioBlob(null)
      setSelectedSubject('')
      toast({
        title: "Success",
        description: "Lecture saved successfully.",
      })
    } catch (error) {
      console.error('Error saving lecture:', error)
      toast({
        title: "Error",
        description: "Failed to save lecture. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const onDeleteLecture = async (lectureId: string) => {
    try {
      await axios.delete(`/api/lectures/${lectureId}`)
      fetchLectures()
      toast({
        title: "Success",
        description: "Lecture deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting lecture:', error)
      toast({
        title: "Error",
        description: "Failed to delete lecture. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Lecture Recorder</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddSubject)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subject name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Add Subject</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Record Lecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-4">
              <AudioRecorder
                onRecordingComplete={onRecordingComplete}
                onStartRecording={() => setAudioBlob(null)}
              />
              {audioBlob && (
                <Button
                  onClick={onSaveLecture}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Save Lecture'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search and Filter Lectures</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search lectures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Filter by Subject:</h4>
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`subject-${subject.id}`}
                  checked={selectedSubjects.includes(subject.id)}
                  onCheckedChange={(checked) => {
                    setSelectedSubjects(prev =>
                      checked
                        ? [...prev, subject.id]
                        : prev.filter(id => id !== subject.id)
                    )
                  }}
                />
                <label htmlFor={`subject-${subject.id}`}>{subject.name}</label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recorded Lectures</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {filteredLectures.map((lecture) => (
              <li key={lecture.id} className="border-b pb-4 last:border-b-0 relative">
                <Link href={`/lecture/${lecture.id}`} className="block hover:bg-gray-50 p-2 rounded">
                  <h3 className="font-semibold text-lg">{lecture.heading || 'Untitled Lecture'}</h3>
                  <p className="text-sm text-gray-500">
                    Subject: {subjects.find(s => s.id === lecture.subject_id)?.name || 'Unknown Subject'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Tag: <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                      {lecture.subject_tag || 'Untagged'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Recorded on: {format(new Date(lecture.recorded_at), 'PPpp')}
                  </p>
                </Link>
                {/* The "X" button for delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteLecture(lecture.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Toaster />
    </div>
  )
}
