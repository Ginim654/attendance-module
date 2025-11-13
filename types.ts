export enum UserRole {
  Teacher = 'Teacher',
  Admin = 'Admin',
  Student = 'Student',
}

export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface AttendanceRecord {
  student_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  subject_id: string;
}

export interface Teacher {
  id: string;
  name: string;
}

export interface TeacherAssignment {
  teacher_id: string;
  grade: string;
  section: string;
  subject_id: string;
}

// Represents a user's profile stored in the database
export interface UserProfile {
    id: string; // Corresponds to auth.users.id
    name: string;
    role: UserRole;
    entity_id: string; // Links to a Teacher ID or Student ID
}