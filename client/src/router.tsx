import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ChallengesPage } from './pages/ChallengesPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { TeamPage } from './pages/TeamPage';
import { RulesPage } from './pages/RulesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/challenges" replace />,
      },
      {
        path: 'challenges',
        element: <ChallengesPage />,
      },
      {
        path: 'scoreboard',
        element: <ScoreboardPage />,
      },
      {
        path: 'team',
        element: <TeamPage />,
      },
      {
        path: 'rules',
        element: <RulesPage />,
      },
      {
        path: '*',
        element: <Navigate to="/challenges" replace />,
      },
    ],
  },
]);
