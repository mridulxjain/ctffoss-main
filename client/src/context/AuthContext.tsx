import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, purgeLegacyStorage } from '../lib/api';
import type { UserDTO, Role } from '@fossctf/shared';

interface TeamSession {
  id: string;
  name: string;
  totalScore: number;
}

interface AuthContextType {
  user: UserDTO | null;
  team: TeamSession | null;
  isLoading: boolean;
  loginDev: (role?: Role, username?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [team, setTeam] = useState<TeamSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    try {
      const data = await api.get('/auth/me');
      if (data?.user) {
        setUser(data.user);
        setTeam(data.team);
      } else {
        setUser(null);
        setTeam(null);
      }
    } catch {
      setUser(null);
      setTeam(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDev = async (role: Role = 'USER', username?: string, email?: string) => {
    setIsLoading(true);
    try {
      const data = await api.post('/auth/dev-login', { role, username, email });
      setUser(data.user);
      setTeam(data.team);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setTeam(null);
    }
  };

  useEffect(() => {
    // Clean up any legacy token artifacts from browser storage
    purgeLegacyStorage();

    // Query server for active session (via HttpOnly first-party cookie)
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, team, isLoading, loginDev, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
