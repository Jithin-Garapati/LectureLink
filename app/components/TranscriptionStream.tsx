'use client';

import { useEffect, useRef } from 'react';

interface TranscriptionStreamProps {
  text: string;
}

export function TranscriptionStream({ text }: TranscriptionStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="relative w-full h-32 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 overflow-y-auto p-4">
        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {text}
        </p>
      </div>
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white dark:from-gray-900 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10" />
    </div>
  );  
}