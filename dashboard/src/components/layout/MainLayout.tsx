import React from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentPage, onPageChange, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
