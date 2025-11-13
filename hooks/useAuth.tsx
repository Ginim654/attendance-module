import React, { createContext, useContext, useState, ReactNode } from 'react';
import usePersistentState from './usePersistentState';
import { UserProfile, UserRole } from '../types';
import { usersData } from '../data/authData';

export interface AppUser extends UserProfile {
  email?: string;
}

interface UserCredentials {
  email: string;
  password: string;
  profileId: string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  signUpUser: (email: string, password: string, profile: UserProfile) => Promise<any>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialCredentials = usersData.map(u => ({ email: u.email, password: u.password, profileId: u.profile.id }));

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = usePersistentState<AppUser | null>('currentUser', null);
  const [userCredentials, setUserCredentials] = usePersistentState<UserCredentials[]>('userCredentials', initialCredentials);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 500));

    const creds = userCredentials.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (creds && creds.password === password) {
      // Find the profile from localStorage, where useAttendanceData keeps it updated.
      try {
        const profilesJSON = window.localStorage.getItem('users');
        const profiles: UserProfile[] = profilesJSON ? JSON.parse(profilesJSON) : [];
        const userProfile = profiles.find(p => p.id === creds.profileId);
        
        if (userProfile) {
          setCurrentUser({ ...userProfile, email: creds.email });
        } else {
            // Fallback to initial data if not in local storage (e.g. first load)
            const initialProfile = usersData.map(u => u.profile).find(p => p.id === creds.profileId);
            if (initialProfile) {
                setCurrentUser({ ...initialProfile, email: creds.email });
            } else {
                 throw new Error('User profile not found. Data inconsistency.');
            }
        }
      } catch (e) {
        setIsLoading(false);
        throw new Error(`Could not retrieve user profiles: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      setIsLoading(false);
      throw new Error('Invalid email or password.');
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setCurrentUser(null);
  };

  const signUpUser = async (email: string, password: string, profile: UserProfile) => {
    setUserCredentials(prev => {
        if (prev.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error(`User with email ${email} already exists.`);
        }
        const newCreds: UserCredentials = { email, password, profileId: profile.id };
        return [...prev, newCreds];
    });
    return { user: { id: profile.id }};
  };

  const sendPasswordReset = async (email: string) => {
    // Simulate API call and backend process
    await new Promise(res => setTimeout(res, 750));

    const creds = userCredentials.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (creds) {
      // In a real application, you would trigger a backend service here.
      // e.g., await supabase.auth.resetPasswordForEmail(email)
      console.log(`Simulating password reset email sent to ${email}.`);
      console.log(`Reset token would be generated and emailed to the user.`);
    } else {
      // For security, don't reveal that the user does not exist.
      // The console log is for demonstration purposes.
      console.log(`Password reset requested for non-existent user: ${email}. The app will pretend it was successful.`);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading, signUpUser, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};