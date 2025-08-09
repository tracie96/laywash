"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('carwash_user');
        if (storedUser) {
          router.push('/dashboard');
        } else {
          router.push('/signin');
        }
      } catch {
        router.push('/signin');
      }
    };

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    checkAuth();
    
    // Clear timeout and set loading to false after a short delay
    const loadingTimeout = setTimeout(() => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(loadingTimeout);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-light-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-light-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
} 