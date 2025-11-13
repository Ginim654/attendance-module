import React, { useMemo } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { AttendanceStatus } from '../types';

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
const todayStr = new Date().toISOString().split('T')[0];

const getStatusPill = (status: AttendanceStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case AttendanceStatus.Present: return `${baseClasses} bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200`;
      case AttendanceStatus.Absent: return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200`;
      case AttendanceStatus.Late: return `${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200`;
    }
};

const getPercentageColor = (percentage: number) => {
    if (percentage < 75) return 'text-red-500 dark:text-red-400';
    if (percentage < 90) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-500 dark:text-emerald-400';
};


const StudentView: React.FC = () => {
    const { subjects, attendanceRecords, teacherAssignments, currentStudent } = useAttendanceData();
    
    const studentReport = useMemo(() => {
        if (!currentStudent) return null;

        const studentRecords = attendanceRecords[currentStudent.id] || [];

        const recordsInRange = studentRecords.filter(r =>
            r.date >= thirtyDaysAgoStr &&
            r.date <= todayStr
        );

        // Overall Attendance
        const presentCount = recordsInRange.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
        const totalDays = recordsInRange.length;
        const overallPercentage = totalDays > 0 ? (presentCount / totalDays) * 100 : 100;
        
        // Subjects for this student
        const studentSubjects = [...new Set(teacherAssignments
            .filter(a => a.grade === currentStudent.grade && a.section === currentStudent.section)
            .map(a => a.subject_id)
        )].map(subjectId => subjects.find(s => s.id === subjectId)).filter(Boolean);

        // Attendance by Subject
        const subjectSummary = studentSubjects.map(subject => {
            if (!subject) return null;
            const subjectRecords = recordsInRange.filter(r => r.subject_id === subject.id);
            const subjectPresentCount = subjectRecords.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
            const subjectTotal = subjectRecords.length;
            const percentage = subjectTotal > 0 ? (subjectPresentCount / subjectTotal) * 100 : 100;
            return { subjectId: subject.id, subjectName: subject.name, percentage };
        }).filter(Boolean);

        return {
            overallPercentage,
            subjectSummary,
            dailyLog: recordsInRange.sort((a,b) => b.date.localeCompare(a.date))
        };
    }, [currentStudent, attendanceRecords, subjects, teacherAssignments]);

    if (!currentStudent || !studentReport) {
        return (
             <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                <svg className="mx-auto h-12 w-12 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Could not load student data. Please log out and try again.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto">
             <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Attendance Dashboard</h2>
                <p className="text-gray-600 dark:text-gray-400">Viewing attendance for {currentStudent.name}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 text-center">
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Overall Attendance</h3>
                        <p className={`text-6xl font-bold mt-2 ${getPercentageColor(studentReport.overallPercentage)}`}>
                            {studentReport.overallPercentage.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 Days</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">By Subject</h3>
                        <ul className="space-y-4">
                            {studentReport.subjectSummary.map(s => s && (
                                <li key={s.subjectId}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{s.subjectName}</span>
                                        <span className={`font-semibold text-sm ${getPercentageColor(s.percentage)}`}>{s.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                                        <div 
                                            className={`h-2.5 rounded-full ${s.percentage < 75 ? 'bg-red-500' : s.percentage < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${s.percentage}%` }}
                                        ></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Daily Attendance Log</h3>
                    <div className="max-h-[500px] overflow-y-auto pr-2">
                            <ul className="space-y-2">
                            {studentReport.dailyLog.map(record => (
                                <li key={`${record.date}-${record.subject_id}`} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-700 rounded-md">
                                    <div>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block">{subjects.find(s => s.id === record.subject_id)?.name || 'Unknown Subject'}</span>
                                    </div>
                                    <span className={getStatusPill(record.status as AttendanceStatus)}>{record.status}</span>
                                </li>
                            ))}
                                {studentReport.dailyLog.length === 0 && (
                                <li className="text-center text-gray-500 dark:text-gray-400 py-8">No attendance records in the last 30 days.</li>
                                )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentView;