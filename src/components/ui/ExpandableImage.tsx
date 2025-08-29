'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Modal } from './modal';

interface ExpandableImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  containerClassName?: string;
}

export function ExpandableImage({
  src,
  alt,
  width,
  height,
  className = '',
  containerClassName = ''
}: ExpandableImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div 
        className={`cursor-pointer transition-transform hover:scale-105 ${containerClassName}`}
        onClick={() => setIsExpanded(true)}
        title="Click to expand"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`${className} hover:opacity-90 transition-opacity`}
        />
      </div>

      <Modal isOpen={isExpanded} onClose={() => setIsExpanded(false)} className="max-w-4xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {alt}
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center">
            <Image
              src={src}
              alt={alt}
              width={800}
              height={800}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
