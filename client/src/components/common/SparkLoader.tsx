import React from 'react';

interface SparkLoaderProps {
  className?: string;
  sparkClassName?: string;
  layout?: 'row' | 'cluster';
}

/**
 * SparkLoader Component
 * Renders 3 four-pointed star sparks scaling up and down sequentially,
 * matching the user's spark loader specification.
 */
export const SparkLoader: React.FC<SparkLoaderProps> = ({
  className = '',
  sparkClassName = 'text-black',
  layout = 'row',
}) => {
  if (layout === 'cluster') {
    return (
      <div className={`relative w-6 h-6 inline-flex items-center justify-center ${className}`} aria-label="Loading...">
        {/* Bottom-left small spark */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`absolute bottom-0 left-0 w-2.5 h-2.5 animate-spark-1 origin-center ${sparkClassName}`}
        >
          <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
        </svg>

        {/* Center large spark */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`absolute inset-0 m-auto w-4 h-4 animate-spark-2 origin-center ${sparkClassName}`}
        >
          <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
        </svg>

        {/* Top-right medium spark */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`absolute top-0 right-0 w-3 h-3 animate-spark-3 origin-center ${sparkClassName}`}
        >
          <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} aria-label="Loading...">
      {/* Spark 1: Scales up and down (delay 0s) */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-3 h-3 animate-spark-1 origin-center ${sparkClassName}`}
      >
        <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
      </svg>

      {/* Spark 2: Center large spark, scales up and down (delay 0.2s) */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-4 h-4 animate-spark-2 origin-center ${sparkClassName}`}
      >
        <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
      </svg>

      {/* Spark 3: Medium spark, scales up and down (delay 0.4s) */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-3.5 h-3.5 animate-spark-3 origin-center ${sparkClassName}`}
      >
        <path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" />
      </svg>
    </div>
  );
};
