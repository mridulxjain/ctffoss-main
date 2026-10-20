import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { SubmitFlagPage } from './pages/SubmitFlagPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { CompetitionLeaderboardPage } from './pages/CompetitionLeaderboardPage';
import { TeamPage } from './pages/TeamPage';
import { RulesPage } from './pages/RulesPage';
import { AdminChallengesPage } from './pages/AdminChallengesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <ChallengesPage />,
      },
      {
        path: 'dashboard',
        element: <Navigate to="/challenges" replace />,
      },
      {
        path: 'challenges',
        element: <ChallengesPage />,
      },
      {
        path: 'challenges/submit',
        element: <Navigate to="/submit" replace />,
      },
      {
        path: 'submit',
        element: <SubmitFlagPage />,
      },
      {
        path: 'submit-flag',
        element: <Navigate to="/submit" replace />,
      },
      {
        path: 'scoreboard',
        element: <Navigate to="/competition/leaderboard" replace />,
      },
      {
        path: 'competition/leaderboard',
        element: <CompetitionLeaderboardPage />,
      },
      {
        path: 'leaderboard',
        element: <Navigate to="/competition/leaderboard" replace />,
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
        path: 'admin',
        element: <Navigate to="/admin/challenges" replace />,
      },
      {
        path: 'admin/challenges',
        element: <AdminChallengesPage />,
      },
      {
        path: '*',
        element: <Navigate to="/challenges" replace />,
      },
    ],
  },
]);
