import React from 'react';

// Props for the PageHeader component.
type PageHeaderProps = {
  title: string;
  children?: React.ReactNode; // Optional children for action buttons, etc.
};

/**
 * A reusable component for displaying a page title and optional action buttons.
 * This standardizes the header across all admin pages.
 */
export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
      {/* Render children if they are provided (e.g., action buttons) */}
      {children && <div>{children}</div>}
    </div>
  );
}
