import { Student, Teacher, Subject, AttendanceRecord, TeacherAssignment, AttendanceStatus, UserProfile, UserRole } from '../types';

// FIX: Corrected the function declaration syntax.
function generate_date_string(offset_days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - offset_days);
    return date.toISOString().split('T')[0];
}

export const initialStudents: Student[] = [
  { id: 'stu_1', name: 'Alice Johnson', grade: '10', section: 'A' },
  { id: 'stu_2', name: 'Bob Williams', grade: '10', section: 'A' },
  { id: 'stu_3', name: 'Charlie Brown', grade: '10', section: 'B' },
  { id: 'stu_4', name: 'Diana Miller', grade: '11', section: 'A' },
  { id: 'stu_5', name: 'Ethan Davis', grade: '11', section: 'A' },
  { id: 'stu_6', name: 'Fiona Garcia', grade: '10', section: 'A' },
  { id: 'stu_7', name: 'George Harris', grade: '10', section: 'B' },
  { id: 'stu_8', name: 'Hannah Clark', grade: '11', section: 'A' },
];

export const initialTeachers: Teacher[] = [
  { id: 'mr-smith', name: 'Mr. Smith' },
  { id: 'ms-jones', name: 'Ms. Jones' },
];

export const initialSubjects: Subject[] = [
  { id: 'subj_math', name: 'Mathematics' },
  { id: 'subj_sci', name: 'Science' },
  { id: 'subj_hist', name: 'History' },
  { id: 'subj_eng', name: 'English' },
];

export const initialTeacherAssignments: TeacherAssignment[] = [
  { teacher_id: 'mr-smith', grade: '10', section: 'A', subject_id: 'subj_math' },
  { teacher_id: 'mr-smith', grade: '10', section: 'B', subject_id: 'subj_math' },
  { teacher_id: 'ms-jones', grade: '10', section: 'A', subject_id: 'subj_sci' },
  { teacher_id: 'ms-jones', grade: '11', section: 'A', subject_id: 'subj_sci' },
  { teacher_id: 'mr-smith', grade: '11', section: 'A', subject_id: 'subj_hist' },
  { teacher_id: 'ms-jones', grade: '10', section: 'B', subject_id: 'subj_eng' },
];

// Generate more realistic attendance data
const studentIds = initialStudents.map(s => s.id);
const subjectIds = initialSubjects.map(s => s.id);
const statuses = [AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Present, AttendanceStatus.Absent, AttendanceStatus.Late];
const records: AttendanceRecord[] = [];

for (let day = 1; day < 35; day++) {
    const date = generate_date_string(day);
    for (const student_id of studentIds) {
        for (const subject_id of subjectIds) {
            // Check if the student has this subject based on their grade/section from assignments
            const student = initialStudents.find(s => s.id === student_id);
            const hasAssignment = initialTeacherAssignments.some(a => a.grade === student?.grade && a.section === student?.section && a.subject_id === subject_id);
            
            if (hasAssignment && Math.random() > 0.1) { // 90% chance of having a record
                records.push({
                    student_id,
                    date,
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    subject_id
                });
            }
        }
    }
}
export const initialAttendanceRecords: AttendanceRecord[] = records;