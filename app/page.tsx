'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import Link from 'next/link';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { X, Share2 } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2 } from 'lucide-react';
import debounce from 'lodash/debounce';

// UI Components
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom Components and Types
import { AudioStorage, LectureStatus } from '../app/lib/audioStorage';
import AudioProcessor from '../app/components/AudioProcessor';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const supabase = createClientComponentClient();

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
  status: LectureStatus;
  error_message?: string;
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
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const audioStorage = new AudioStorage();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  // Fetch Subjects
  const fetchSubjects = useCallback(async () => {
    if (!session?.user?.id) {
      setSubjects([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects. Please try again.',
        variant: 'destructive',
      });
    }
  }, [session?.user?.id, toast]);

  // Fetch Lectures
  const fetchLectures = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('user_id', session.user.id)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setLectures(data || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch lectures. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, toast]);

  // Filter Lectures
  const filterLectures = useCallback(() => {
    if (!lectures) return;
    
    let filtered = [...lectures];
    if (selectedSubject) {
      filtered = filtered.filter(lecture => lecture.subject_id === selectedSubject);
    }
    
    setFilteredLectures(filtered);
  }, [lectures, selectedSubject]);

  // Initial data fetch
  useEffect(() => {
    fetchSubjects();
    fetchLectures();
  }, [fetchSubjects, fetchLectures]);

  // Apply filters when data changes
  useEffect(() => {
    filterLectures();
  }, [filterLectures]);

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

      const { error } = await supabase
        .from('subjects')
        .insert({
          name: data.name,
          user_id: session.user.id
        });

      if (error) throw error;

      await fetchSubjects();
      form.reset();
      
      toast({
        title: 'Success',
        description: 'Subject added successfully.',
      });
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to add subject.',
        variant: 'destructive',
      });
    }
  };

  // Handle Deleting a Lecture
  const onDeleteLecture = async (lectureId: string) => {
    try {
      // First delete audio files
      await audioStorage.clearRecording(lectureId);
      
      // Then delete lecture record
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);

      if (error) throw error;

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

  // Handle transcript updates from recording
  const handleTranscriptUpdate = (text: string) => {
    setStreamingTranscript(prev => {
      const newText = prev + (prev ? ' ' : '') + text;
      return newText;
    });
  };

  // Monitor all lecture updates in a single subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('lecture-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'lectures',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Lecture update received:', payload);
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            toast({
              title: 'Lecture Ready',
              description: 'Your lecture has been processed and is ready to view.',
            });
          }
          // Refresh lectures for any change
          fetchLectures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchLectures, toast]);

  // Auth session management
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setSubjects([]);
        setLectures([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auth handlers
  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      if (data.url) window.location.href = data.url;
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

  // Status display helper
  const getLectureStatusDisplay = (status: LectureStatus) => {
    switch (status) {
      case LectureStatus.RECORDING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <span className="animate-pulse mr-1">●</span> Recording
          </span>
        );
      case LectureStatus.PROCESSING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <span className="animate-pulse mr-1">●</span> Processing
          </span>
        );
      case LectureStatus.TRANSCRIBING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <span className="animate-pulse mr-1">●</span> Transcribing
          </span>
        );
      case LectureStatus.COMPLETED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            ✓ Ready
          </span>
        );
      case LectureStatus.FAILED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            ✕ Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Stats helper
  const getStats = useCallback(() => {
    return {
      totalSubjects: subjects.length,
      totalLectures: lectures.length,
      totalWords: lectures.reduce(
        (total, lecture) => total + (lecture.transcript?.length || 0) / 5, // approximate words
        0
      ).toFixed(0),
      completedLectures: lectures.filter(l => l.status === LectureStatus.COMPLETED).length,
      processingLectures: lectures.filter(
        l => [LectureStatus.PROCESSING, LectureStatus.TRANSCRIBING].includes(l.status)
      ).length
    };
  }, [lectures, subjects]);

  // Session check
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

  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        if (!term.trim()) {
          setFilteredLectures(lectures);
          return;
        }
        const searchLower = term.toLowerCase();
        const filtered = lectures.filter(
          (lecture) =>
            lecture.heading.toLowerCase().includes(searchLower) ||
            lecture.transcript?.toLowerCase().includes(searchLower) ||
            lecture.enhanced_notes?.toLowerCase().includes(searchLower)
        );
        setFilteredLectures(filtered);
      }, 300),
    [lectures]
  );

  useEffect(() => {
    // Initialize filteredLectures with all lectures
    setFilteredLectures(lectures);
  }, [lectures]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5z" />
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
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6">
              <div className="p-2 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {getStats().totalSubjects}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                  Subjects
                </p>
              </div>
              <div className="p-2 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {getStats().totalLectures}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                  Lectures
                </p>
              </div>
              <div className="p-2 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {getStats().totalWords}
                </p>
                <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400">
                  Words
                </p>
              </div>
            </div>

            {/* Add Subject Card */}
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

            {/* Record Lecture Card */}
            <Card className="border border-gray-200 dark:border-gray-800 shadow-lg">
              <CardHeader className="p-3 sm:p-6 text-center border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="text-lg sm:text-xl font-semibold">
                  Record New Lecture
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-4">
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

                  {selectedSubject && (
                    <AudioProcessor 
                      subjectId={selectedSubject}
                      onTranscriptUpdate={handleTranscriptUpdate}
                      audioStorage={audioStorage}
                      session={session}
                    />
                  )}

                  {streamingTranscript && (
                    <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Live Transcription:
                      </div>
                      <div className="h-32 overflow-y-auto">
                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {streamingTranscript}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lectures List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Your Lectures
                </h2>
                <Input
                  placeholder="Search lectures..."
                  onChange={(e) => handleSearch(e.target.value)}
                  value={searchTerm}
                  className="w-full sm:max-w-xs text-sm"
                />
              </div>
              
              <ErrorBoundary
                fallback={
                  <div className="text-center py-8">
                    <p>Something went wrong loading your lectures.</p>
                    <Button onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                  {isLoading ? (
                    <div className="col-span-2 text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      <p className="mt-2 text-sm text-gray-600">Loading lectures...</p>
                    </div>
                  ) : filteredLectures.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                      <p className="text-gray-600">No lectures found.</p>
                    </div>
                  ) : (
                    filteredLectures.map((lecture) => (
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
                              {getLectureStatusDisplay(lecture.status)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const shareUrl = `${window.location.origin}/shared/${lecture.id}`;
                                  const shareText = `📚 Check out these lecture notes from ${lecture.heading}! \n🎓 Study together, learn better! \n${shareUrl}`;
                                  
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
                    ))
                  )}
                </div>
              </ErrorBoundary>
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
