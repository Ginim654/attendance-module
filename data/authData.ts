import { UserProfile, UserRole } from '../types';

// Raw user data, including passwords for demonstration purposes.
// In a real app, passwords would be hashed.
export const usersData = [
  {
    email: 'admin@school.edu',
    password: 'password',
    profile: {
      id: 'user_admin',
      name: 'Admin User',
      role: UserRole.Admin,
      entity_id: 'admin_1', // No specific entity for admin
    } as UserProfile
  },
  {
    email: 'mr.smith@school.edu',
    password: 'password',
    profile: {
      id: 'user_teach_1',
      name: 'Mr. Smith',
      role: UserRole.Teacher,
      entity_id: 'mr-smith',
    } as UserProfile
  },
  {
    email: 'ms.jones@school.edu',
    password: 'password',
    profile: {
      id: 'user_teach_2',
      name: 'Ms. Jones',
      role: UserRole.Teacher,
      entity_id: 'ms-jones',
    } as UserProfile
  },
  {
    email: 'alice.johnson@student.edu',
    password: 'password',
    profile: {
      id: 'user_stu_1',
      name: 'Alice Johnson',
      role: UserRole.Student,
      entity_id: 'stu_1',
    } as UserProfile
  },
];

export const initialUserProfiles: UserProfile[] = usersData.map(u => u.profile);