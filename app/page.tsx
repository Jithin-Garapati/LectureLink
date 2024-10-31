'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { AudioRecorder } from 'react-audio-voice-recorder';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';  // Import the X icon
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation';
import { Share2 } from "lucide-react" // Add this import
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createClientComponentClient()

interface Subject {
  id: string;
  name: string;
  user_id: string;
}

interface Lecture {
  id: string;
  subject_id: string;
  heading: string;
  subject_tag: string;
  transcript: string;
  enhanced_notes: string;
  recorded_at: string;
  user_id: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
});

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [filteredLectures, setFilteredLectures] = useState<Lecture[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjects] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  // Fetch Subjects (Memoized using useCallback)
  const fetchSubjects = useCallback(async () => {
    if (!session?.user?.id) {
      setSubjects([]); // Clear subjects if no user is logged in
      return;
    }

    try {
      const response = await axios.get<Subject[]>(`/api/subjects?userId=${session.user.id}`);
      setSubjects(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching subjects:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.error || 'Failed to fetch subjects. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }, [session?.user?.id, toast]);

  // Fetch Lectures (Modified to include user ID)
  const fetchLectures = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const response = await axios.get<Lecture[]>(`/api/lectures?userId=${session.user.id}`);
      setLectures(response.data);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch lectures. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast, session?.user?.id]);

  // Filter Lectures (Memoized using useCallback)
  const filterLectures = useCallback(() => {
    let filtered = lectures;

    if (searchTerm) {
      filtered = filtered.filter(
        (lecture) =>
          lecture.heading.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lecture.subject_tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSubjects.length > 0) {
      filtered = filtered.filter((lecture) =>
        selectedSubjects.includes(lecture.subject_id)
      );
    }

    setFilteredLectures(filtered);
  }, [lectures, searchTerm, selectedSubjects]);

  // Fetch subjects and lectures on component mount
  useEffect(() => {
    fetchSubjects();
    fetchLectures();
  }, [fetchSubjects, fetchLectures]);

  // Apply filtering when the lecture list or filters change
  useEffect(() => {
    filterLectures();
  }, [lectures, searchTerm, selectedSubjects, filterLectures]);

  // Handle Adding New Subject
  const onAddSubject = async (data: z.infer<typeof formSchema>) => {
    try {
      if (!session?.user?.id) {
        toast({
          title: 'Error',
          description: 'You must be signed in to add subjects.',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        name: data.name,
        userId: session.user.id
      };
      console.log('Sending payload:', payload); // Debug log

      const response = await axios.post('/api/subjects', payload);
      console.log('Response:', response.data); // Debug log

      await fetchSubjects();
      form.reset();
      
      toast({
        title: 'Success',
        description: 'Subject added successfully.',
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Error response:', error.response?.data); // Debug log
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to add subject.',
          variant: 'destructive',
        });
      }
    }
  };

  // Handle Audio Recording Completion
  const onRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
  };

  // Handle Saving the Lecture (Modified to include user ID)
  const onSaveLecture = async () => {
    if (!audioBlob || !selectedSubject || !session?.user?.id) {
      toast({
        title: 'Error',
        description: 'Please select a subject, record audio, and sign in before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'lecture.webm');
      formData.append('subject_id', selectedSubject);

      const transcribeResponse = await axios.post<{ transcription: string; enhancedNotes: string; totalChunks: number }>('/api/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded));
          toast({
            title: 'Uploading lecture...',
            description: `${percentCompleted}% completed`,
          });
        },
      });
      const { transcription, enhancedNotes } = transcribeResponse.data;

      const headingResponse = await axios.post('/api/generate-heading', {
        transcription,
        enhancedNotes,
      });
      const { heading, subjectTag } = headingResponse.data;

      const lectureData = {
        subject_id: selectedSubject,
        heading,
        subject_tag: subjectTag,
        transcript: transcription,
        enhanced_notes: enhancedNotes,
        recorded_at: new Date().toISOString(),
        user_id: session.user.id,  // Add user ID to lecture data
      };

      await axios.post('/api/lectures', lectureData);

      fetchLectures();
      setAudioBlob(null);
      setSelectedSubject('');
      toast({
        title: 'Success',
        description: 'Lecture saved successfully.',
      });
    } catch (error) {
      console.error('Error saving lecture:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.details || 'Failed to save lecture. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Deleting a Lecture
  const onDeleteLecture = async (lectureId: string) => {
    try {
      await axios.delete(`/api/lectures/${lectureId}`);
      fetchLectures();
      toast({
        title: 'Success',
        description: 'Lecture deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lecture. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Update the session effect
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
      } catch (error) {
        console.error('Error getting session:', error);
      }
    };

    getInitialSession();

    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
        }
      });

      return () => {
        data.subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth subscription:', error);
      return () => {};
    }
  }, []);

  // Update the sign-in function
  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Make sure subjects are cleared when user signs out
  useEffect(() => {
    if (!session) {
      setSubjects([]);
      setLectures([]);
    }
  }, [session]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/sign-in');
      } else {
        setSession(session);
      }
    };
    
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Mobile-optimized header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                LectureLink
              </h1>
            </div>
            <div className="flex items-center justify-end gap-2 sm:gap-6">
              {session ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="hidden sm:inline text-sm font-medium text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                    {session.user?.email}
                  </span>
                  <Button 
                    onClick={handleSignOut}
                    className="text-xs sm:text-sm px-3 py-1.5"
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleSignIn}
                  className="text-xs sm:text-sm px-3 py-1.5"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-5xl">
        {session && (
          <div className="space-y-4 sm:space-y-8">
            {/* Keep stats cards side by side but smaller on mobile */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6">
              <div className="p-2 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {subjects.length}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                  Subjects
                </p>
              </div>
              <div className="p-2 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {lectures.length}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                  Lectures
                </p>
              </div>
              <div className="p-2 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {lectures.reduce((total, lecture) => total + (lecture.transcript?.length || 0) / 1000, 0).toFixed(1)}k
                </p>
                <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                  Words
                </p>
              </div>
            </div>

            {/* Mobile-optimized Add Subject form */}
            <Card className="border border-gray-200 dark:border-gray-800 shadow-lg">
              <CardHeader className="p-3 sm:p-6 text-center border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-lg sm:text-xl font-semibold">
                  Add New Subject
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAddSubject)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Enter subject name" 
                              {...field}
                              className="border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit"
                      className="w-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                    >
                      Add Subject
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Mobile-optimized Record Lecture section */}
            <Card className="border border-gray-200 dark:border-gray-800 shadow-lg">
              <CardHeader className="p-3 sm:p-6 text-center border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-lg sm:text-xl font-semibold">
                  Record New Lecture
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-4">
                  {/* Recording controls with better mobile spacing */}
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem 
                          key={subject.id} 
                          value={subject.id}
                          className="hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                    <div className="flex items-center gap-2">
                      <AudioRecorder 
                        onRecordingComplete={onRecordingComplete}
                        audioTrackConstraints={{
                          noiseSuppression: true,
                          echoCancellation: true,
                        }}
                        downloadOnSavePress={false}
                        showVisualizer={true}
                        classes={{
                          AudioRecorderDiscardClass: "text-red-500 hover:text-red-600 !order-last",
                          AudioRecorderStartSaveClass: "text-gray-700 dark:text-gray-300 !order-first"
                        }}
                      />
                      {audioBlob && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Ready to save
                        </span>
                      )}
                    </div>
                    {audioBlob && (
                      <Button 
                        onClick={onSaveLecture} 
                        disabled={isProcessing}
                        className="w-full sm:w-auto text-sm"
                      >
                        {isProcessing ? 'Processing...' : 'Save Lecture'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-optimized Lectures section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Your Lectures
                </h2>
                <Input
                  placeholder="Search lectures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:max-w-xs text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                {filteredLectures.map((lecture) => (
                  <Link
                    key={lecture.id}
                    href={`/lecture/${lecture.id}`}
                    className="group relative block"
                  >
                    <div className="p-3 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold truncate">
                            {lecture.heading || 'Untitled Lecture'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                            {subjects.find(s => s.id === lecture.subject_id)?.name}
                          </p>
                          <span className="inline-block px-2 py-0.5 mt-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                            {lecture.subject_tag || 'Untagged'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              const shareUrl = `${window.location.origin}/shared/${lecture.id}`;
                              const shareText = `📚 Check out these lecture notes from ${lecture.heading}! 
🎓 Study together, learn better! 
${shareUrl}`;
                              
                              navigator.clipboard.writeText(shareText);
                              toast({
                                title: "Share with your study buddies! 🚀",
                                description: "Link copied to clipboard",
                              });
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              onDeleteLecture(lecture.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(lecture.recorded_at), 'PPpp')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="container mx-auto px-6 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>LectureLink</p>
          
      
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
