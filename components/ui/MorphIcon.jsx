"use client";
import { forwardRef } from 'react';
import { MorphIcon as LibraryMorphIcon } from 'morphicons/react';

export const MorphIcon = forwardRef(function RelooMorphIcon(
  { size = 20, strokeWidth = 1.75, className = '', ...props }, ref,
) {
  return <LibraryMorphIcon
    {...props}
    ref={ref}
    size={size}
    strokeWidth={strokeWidth}
    className={`reloo-morph-icon ${className}`.trim()}
    spring="snappy"
    reducedMotion="user"
    focusable="false"
    data-morphicon="true"
  />;
});
