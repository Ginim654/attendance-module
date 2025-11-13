import React, { useMemo } from 'react';
import { Student, AttendanceStatus, Subject } from '../types';
import { useAttendanceData } from '../hooks/useAttendanceData';

interface StudentReportCardProps {
  student: Student;
  dateRange: { start: string; end: string };
}

const getPercentageColor = (percentage: number) => {
    if (percentage < 75) return 'text-red-500 dark:text-red-400';
    if (percentage < 90) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-500 dark:text-emerald-400';
};

const getProgressBarColor = (percentage: number) => {
    if (percentage < 75) return 'bg-red-500';
    if (percentage < 90) return 'bg-amber-500';
    return 'bg-emerald-500';
};

const StudentReportCard: React.FC<StudentReportCardProps> = ({ student, dateRange }) => {
    const { attendanceRecords, subjects, teacherAssignments } = useAttendanceData();
    const studentRecords = attendanceRecords[student.id] || [];

    const reportData = useMemo(() => {
        const recordsInRange = studentRecords.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
        
        const presentCount = recordsInRange.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
        const totalDays = recordsInRange.length;
        const overallPercentage = totalDays > 0 ? (presentCount / totalDays) * 100 : 100;

        const studentSubjects = [...new Set(teacherAssignments
            .filter(a => a.grade === student.grade && a.section === student.section)
            .map(a => a.subject_id)
        )].map(subjectId => subjects.find(s => s.id === subjectId)).filter((s): s is Subject => !!s);

        const subjectSummary = studentSubjects.map(subject => {
            const subjectRecords = recordsInRange.filter(r => r.subject_id === subject.id);
            const subjectPresentCount = subjectRecords.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
            const subjectTotal = subjectRecords.length;
            const percentage = subjectTotal > 0 ? (subjectPresentCount / subjectTotal) * 100 : 100;
            return { subjectId: subject.id, subjectName: subject.name, percentage, total: subjectTotal };
        }).sort((a,b) => a.subjectName.localeCompare(b.subjectName));

        return {
            overallPercentage,
            subjectSummary,
        };
    }, [student, studentRecords, subjects, teacherAssignments, dateRange]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border-l-4 border-primary-500 h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{student.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Grade {student.grade} - Section {student.section}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Overall</p>
                    <p className={`text-2xl font-bold ${getPercentageColor(reportData.overallPercentage)}`}>
                        {reportData.overallPercentage.toFixed(1)}%
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <h5 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-t dark:border-slate-700 pt-3">Subject Breakdown</h5>
                {reportData.subjectSummary.length > 0 ? reportData.subjectSummary.map(s => (
                    <div key={s.subjectId}>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{s.subjectName}</span>
                            <span className={`font-semibold text-sm ${getPercentageColor(s.percentage)}`}>{s.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${getProgressBarColor(s.percentage)}`}
                                style={{ width: `${s.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                )) : (
                     <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No subject data available for this student.</p>
                )}
            </div>
        </div>
    );
};

export default StudentReportCard;
