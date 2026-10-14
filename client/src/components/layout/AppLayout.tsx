import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] bg-grid-pattern text-slate-100">
      <Navbar />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
