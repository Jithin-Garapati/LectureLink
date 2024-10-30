'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";

// Import react-markdown and plugins for rendering math and formatted content
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // For styling the formulas

interface Lecture {
  id: string;
  subject_id: string;
  heading: string;
  subject_tag: string;
  transcript: string;
  enhanced_notes: string;
  recorded_at: string;
}
interface Subject {
  id: string;
  name: string;
}

export default function LecturePage() {
  const { id } = useParams();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLectureAndSubject = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const lectureResponse = await axios.get<Lecture>(`/api/lectures/${id}`);
        setLecture(lectureResponse.data);
      } catch {
        setError('Failed to load lecture details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchLectureAndSubject();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'PPpp');
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !lecture) {
    return <div>{error || 'Failed to load lecture details.'}</div>;
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
          <p>{formatDate(lecture.recorded_at)}</p>
          <p>{lecture.subject_tag}</p>
          <Collapsible>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Transcript:</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">Toggle transcript</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <ReactMarkdown
              className="prose prose-sm max-w-none"
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {lecture.transcript}
            </ReactMarkdown>
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
          <Link href={`/share/${id}`}>
            <Button className="mt-4">Share with Classmates</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
