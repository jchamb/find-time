export type UserProfile = {
  userId: string;
  name: string;
  email: string;
};

/**
 * Hook to read the current user profile from localStorage.
 * Generates a new userId on first access if not already set.
 */
export const useUserProfile = (): UserProfile => {
  // localStorage is available in browser; generate/retrieve userId
  if (typeof window !== 'undefined') {
    let userId = localStorage.getItem('find-time:user-id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('find-time:user-id', userId);
    }

    return {
      userId,
      name: localStorage.getItem('find-time:user-name') || '',
      email: localStorage.getItem('find-time:user-email') || '',
    };
  }

  return {
    userId: crypto.randomUUID(),
    name: '',
    email: '',
  };
};

/**
 * Update the user profile (name, email) in localStorage.
 * userId is read-only and set on first access.
 */
export const useUpdateUserProfile = () => {
  return (updates: Partial<UserProfile>) => {
    if (typeof window === 'undefined') return;

    if (updates.name) localStorage.setItem('find-time:user-name', updates.name);
    if (updates.email) localStorage.setItem('find-time:user-email', updates.email);
  };
};
