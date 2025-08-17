import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'student';

interface UserProfile {
  user_id: string;
  full_name: string;
  role: UserRole;
  subject?: string;
  login_username?: string;
}

export const useRole = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  const isStudent = () => {
    return profile?.role === 'student';
  };

  const hasRole = (role: UserRole) => {
    return profile?.role === role;
  };

  return {
    profile,
    loading,
    isAdmin,
    isStudent,
    hasRole,
    role: profile?.role || 'student'
  };
};