import React, { createContext, useContext, ReactNode, useCallback, useMemo, useState } from 'react';
import usePersistentState from './usePersistentState';
import { Student, AttendanceRecord, TeacherAssignment, Teacher, Subject, UserProfile, UserRole } from '../types';
import { useAuth } from './useAuth';
import { initialStudents, initialTeachers, initialTeacherAssignments, initialSubjects, initialAttendanceRecords } from '../data/schoolData';
import { initialUserProfiles } from '../data/authData';

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateEmail = (name: string, role: UserRole): string => {
    const domain = role === UserRole.Teacher ? 'school.edu' : 'student.edu';
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    return `${sanitizedName}@${domain}`;
}

interface AddStudentResult {
  success: boolean;
  message: string;
  studentInfo?: {
      name: string;
      email: string;
      pass: string;
  }
}

interface AddTeacherResult {
  success: boolean;
  message: string;
  teacherInfo?: {
      name: string;
      email: string;
      pass: string;
  }
}

interface AttendanceContextType {
  students: Student[];
  subjects: Subject[];
  attendanceRecords: Record<string, AttendanceRecord[]>;
  teachers: Teacher[];
  teacherAssignments: TeacherAssignment[];
  users: UserProfile[]; // For admin panel
  currentTeacher?: Teacher;
  currentStudent?: Student;
  getTeacherForClassSubject: (grade: string, section: string, subject_id: string) => Teacher | undefined;
  addBulkAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<AddStudentResult>;
  addTeacher: (teacher: Teacher) => Promise<AddTeacherResult>;
  addAssignment: (assignment: TeacherAssignment) => Promise<boolean>;
  loading: boolean;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, signUpUser } = useAuth();
  
  const [students, setStudents] = usePersistentState<Student[]>('students', initialStudents);
  const [teachers, setTeachers] = usePersistentState<Teacher[]>('teachers', initialTeachers);
  const [teacherAssignments, setTeacherAssignments] = usePersistentState<TeacherAssignment[]>('teacherAssignments', initialTeacherAssignments);
  const [subjects] = useState<Subject[]>(initialSubjects); // Subjects are static for now
  const [rawAttendance, setRawAttendance] = usePersistentState<AttendanceRecord[]>('attendanceRecords', initialAttendanceRecords);
  const [users, setUsers] = usePersistentState<UserProfile[]>('users', initialUserProfiles);
  const [loading] = useState(false); // No initial data fetching

  const attendanceRecords = useMemo(() => {
    return rawAttendance.reduce((acc, record) => {
      if (!acc[record.student_id]) {
        acc[record.student_id] = [];
      }
      acc[record.student_id].push(record);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);
  }, [rawAttendance]);

  const currentTeacher = useMemo(() => {
    if (currentUser?.role !== UserRole.Teacher) return undefined;
    return teachers.find(t => t.id === currentUser.entity_id);
  }, [currentUser, teachers]);
  
  const currentStudent = useMemo(() => {
    if (currentUser?.role !== UserRole.Student) return undefined;
    return students.find(s => s.id === currentUser.entity_id);
  }, [currentUser, students]);

  const getTeacherForClassSubject = useCallback((grade: string, section: string, subject_id: string): Teacher | undefined => {
    const assignment = teacherAssignments.find(a => a.grade === grade && a.section === section && a.subject_id === subject_id);
    if (!assignment) return undefined;
    return teachers.find(t => t.id === assignment.teacher_id);
  }, [teacherAssignments, teachers]);
  
  const addBulkAttendance = useCallback(async (records: Omit<AttendanceRecord, 'id'>[]) => {
    setRawAttendance(prev => {
        const updatedRecords = [...prev];
        records.forEach(newRecord => {
            const index = updatedRecords.findIndex(r => r.student_id === newRecord.student_id && r.date === newRecord.date && r.subject_id === newRecord.subject_id);
            if (index > -1) {
                updatedRecords[index] = newRecord as AttendanceRecord;
            } else {
                updatedRecords.push(newRecord as AttendanceRecord);
            }
        });
        return updatedRecords;
    });
  }, [setRawAttendance]);

  const addStudent = useCallback(async (student: Omit<Student, 'id'>): Promise<AddStudentResult> => {
    const newStudent: Student = { ...student, id: generateId('stu') };
    
    const newUserProfile: UserProfile = {
        id: generateId('user'),
        name: newStudent.name,
        role: UserRole.Student,
        entity_id: newStudent.id
    };
    
    const email = generateEmail(newStudent.name, UserRole.Student);
    const password = 'password';

    try {
        await signUpUser(email, password, newUserProfile);
        setStudents(prev => [...prev, newStudent]);
        setUsers(prev => [...prev, newUserProfile]);
        return { 
          success: true, 
          message: `Student "${newStudent.name}" added successfully.`,
          studentInfo: {
            name: newStudent.name,
            email: email,
            pass: password
          }
        };
    } catch (authError: any) {
        return { success: false, message: `Failed to create user account: ${authError.message}` };
    }
  }, [signUpUser, setStudents, setUsers]);

  const addTeacher = useCallback(async (teacher: Teacher): Promise<AddTeacherResult> => {
    if (teachers.some(t => t.id === teacher.id)) {
      return { success: false, message: `Error: Teacher with ID "${teacher.id}" already exists.`};
    }

    const newUserProfile: UserProfile = {
        id: generateId('user'),
        name: teacher.name,
        role: UserRole.Teacher,
        entity_id: teacher.id
    };

    const email = generateEmail(teacher.name, UserRole.Teacher);
    const password = 'password123';

    try {
        await signUpUser(email, password, newUserProfile);
        setTeachers(prev => [...prev, teacher]);
        setUsers(prev => [...prev, newUserProfile]);
        return { 
          success: true, 
          message: `Teacher "${teacher.name}" added successfully.`,
          teacherInfo: {
            name: teacher.name,
            email: email,
            pass: password
          }
        };
    } catch (authError: any) {
        return { success: false, message: `Failed to create user account: ${authError.message}` };
    }
  }, [signUpUser, setTeachers, setUsers, teachers]);

  const addAssignment = useCallback(async (assignment: TeacherAssignment): Promise<boolean> => {
      setTeacherAssignments(prev => [...prev, assignment]);
      return true;
  }, [setTeacherAssignments]);

  const contextValue = { students, subjects, attendanceRecords, teachers, teacherAssignments, users, currentTeacher, currentStudent, getTeacherForClassSubject, addBulkAttendance, addStudent, addTeacher, addAssignment, loading };

  return (
    <AttendanceContext.Provider value={contextValue}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendanceData = (): AttendanceContextType => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendanceData must be used within an AttendanceProvider');
  }
  return context;
};