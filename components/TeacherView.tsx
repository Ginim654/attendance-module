import React, { useState, useMemo } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import Modal from './Modal';
import StudentReportCard from './StudentReportCard';

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const getStatusPill = (status: AttendanceStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case AttendanceStatus.Present: return `${baseClasses} bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200`;
      case AttendanceStatus.Absent: return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200`;
      case AttendanceStatus.Late: return `${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200`;
    }
};

const getPercentageColor = (percentage: number) => {
    if (percentage < 75) return 'text-red-500';
    if (percentage < 90) return 'text-amber-500';
    return 'text-emerald-500';
};

const StatusButton: React.FC<{
  status: AttendanceStatus,
  currentStatus: AttendanceStatus | undefined,
  onClick: () => void,
  icon: React.ReactElement,
  label: string
}> = ({ status, currentStatus, onClick, icon, label }) => {
  const statusColors = {
    [AttendanceStatus.Present]: 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700',
    [AttendanceStatus.Absent]: 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700',
    [AttendanceStatus.Late]: 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700',
  };
  const activeColors = {
    [AttendanceStatus.Present]: 'bg-emerald-500 text-white',
    [AttendanceStatus.Absent]: 'bg-red-500 text-white',
    [AttendanceStatus.Late]: 'bg-amber-500 text-white',
  }
  
  const isActive = currentStatus === status;
  const buttonClass = isActive ? activeColors[status] : statusColors[status];

  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all duration-150 ${buttonClass}`}
      aria-label={label}
    >
      {icon}
      <span className="text-sm font-semibold hidden sm:inline">{label}</span>
    </button>
  );
};


const TeacherView: React.FC = () => {
  const { students, subjects, attendanceRecords, addBulkAttendance, teacherAssignments, currentTeacher } = useAttendanceData();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'takeAttendance' | 'reports'>('takeAttendance');
  const [reportDateRange, setReportDateRange] = useState({
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: today,
  });

  const allRecordsFlat = useMemo(() => Object.values(attendanceRecords).flat(), [attendanceRecords]);
  const assignedClasses = useMemo(() => teacherAssignments.filter(a => a.teacher_id === currentTeacher?.id), [teacherAssignments, currentTeacher]);
  const grades = useMemo(() => [...new Set(assignedClasses.map(a => a.grade))].sort((a, b) => a.localeCompare(b)), [assignedClasses]);
  
  const sections = useMemo(() => {
    if (!selectedGrade) return [];
    return [...new Set(assignedClasses.filter(a => a.grade === selectedGrade).map(a => a.section))].sort();
  }, [assignedClasses, selectedGrade]);

  const assignedSubjects = useMemo(() => {
    if (!selectedGrade || !selectedSection) return [];
    const subjectIds = new Set(assignedClasses.filter(a => a.grade === selectedGrade && a.section === selectedSection).map(a => a.subject_id));
    return subjects.filter(s => subjectIds.has(s.id));
  }, [assignedClasses, selectedGrade, selectedSection, subjects]);

  const filteredStudents = useMemo(() => {
    if (!selectedGrade || !selectedSection) return [];
    return students.filter(s => s.grade === selectedGrade && s.section === selectedSection);
  }, [students, selectedGrade, selectedSection]);

  const recordsForDate = useMemo(() => {
    if (!selectedSubject) return [];
    return allRecordsFlat.filter(r => r.date === selectedDate && r.subject_id === selectedSubject);
  }, [allRecordsFlat, selectedDate, selectedSubject]);
  
  const studentSubjectReport = useMemo(() => {
    if (!viewingStudent || !selectedSubject) return null;
    
    const records = (attendanceRecords[viewingStudent.id] || []).filter(r => 
        r.subject_id === selectedSubject
    );

    const presentCount = records.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
    const total = records.length;
    const percentage = total > 0 ? (presentCount / total) * 100 : 100;

    return {
        percentage,
        records: records.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [viewingStudent, selectedSubject, attendanceRecords]);


  const getStudentStatus = (studentId: string): AttendanceStatus | undefined => {
    if (dailyAttendance[studentId]) {
      return dailyAttendance[studentId];
    }
    const record = recordsForDate.find(r => r.student_id === studentId);
    return record?.status as AttendanceStatus;
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setDailyAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value;
    setSelectedGrade(newGrade);
    setSelectedSection('');
    setSelectedSubject('');
    setDailyAttendance({});
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(e.target.value);
    setSelectedSubject('');
    setDailyAttendance({});
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
    setDailyAttendance({});
  };
  
  const handleSubmit = async () => {
    const newRecords = Object.entries(dailyAttendance).map(([studentId, status]) => ({
      student_id: studentId,
      date: selectedDate,
      status: status as AttendanceStatus,
      subject_id: selectedSubject
    }));
    if (newRecords.length > 0) {
      setIsSubmitting(true);
      await addBulkAttendance(newRecords);
      setSuccessMessage(`Attendance for ${newRecords.length} student(s) submitted successfully!`);
      setDailyAttendance({});
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  if (!currentTeacher) {
    return <div className="text-center text-red-500">Error: No teacher data found for the logged in user.</div>;
  }

  return (
    <div className="container mx-auto">
       <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('takeAttendance')}
                className={`${activeTab === 'takeAttendance' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
                Take Attendance
            </button>
             <button
                onClick={() => setActiveTab('reports')}
                className={`${activeTab === 'reports' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
                Class Report
            </button>
        </nav>
      </div>

      {activeTab === 'takeAttendance' && (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Take Attendance</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <input
                      id="attendance-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1 w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="grade-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                    <select
                      id="grade-select"
                      value={selectedGrade}
                      onChange={handleGradeChange}
                      className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Class</option>
                      {grades.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                    </select>
                  </div>
                   <div>
                    <label htmlFor="section-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                    <select
                      id="section-select"
                      value={selectedSection}
                      onChange={handleSectionChange}
                      disabled={!selectedGrade}
                      className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-200 dark:disabled:bg-slate-800"
                    >
                      <option value="">Select Section</option>
                      {sections.map(section => <option key={section} value={section}>Section {section}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="subject-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                    <select
                      id="subject-select"
                      value={selectedSubject}
                      onChange={handleSubjectChange}
                      disabled={!selectedSection}
                      className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-200 dark:disabled:bg-slate-800"
                    >
                      <option value="">Select Subject</option>
                      {assignedSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </select>
                  </div>
                </div>
            </div>
            
            {successMessage && (
                <div className="bg-emerald-500 text-white p-3 rounded-lg mb-6 text-center font-semibold">
                  {successMessage}
                </div>
            )}

            {filteredStudents.length > 0 && selectedSubject ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map(student => (
                    <div key={student.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{student.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Grade: {student.grade} - Section: {student.section}</p>
                          </div>
                          <button onClick={() => setViewingStudent(student)} className="text-primary-600 dark:text-primary-500 hover:underline text-sm font-medium">View History</button>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <StatusButton 
                          status={AttendanceStatus.Present} 
                          currentStatus={getStudentStatus(student.id)}
                          onClick={() => handleStatusChange(student.id, AttendanceStatus.Present)}
                          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          label="Present"
                        />
                        <StatusButton 
                          status={AttendanceStatus.Absent} 
                          currentStatus={getStudentStatus(student.id)}
                          onClick={() => handleStatusChange(student.id, AttendanceStatus.Absent)}
                          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                          label="Absent"
                        />
                        <StatusButton 
                          status={AttendanceStatus.Late} 
                          currentStatus={getStudentStatus(student.id)}
                          onClick={() => handleStatusChange(student.id, AttendanceStatus.Late)}
                          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>}
                          label="Late"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No students to display</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please select a class, section, and subject to view students.</p>
                </div>
              )}
      
              {filteredStudents.length > 0 && selectedSubject && (
                <>
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 flex justify-center">
                      <button
                        onClick={handleSubmit}
                        disabled={Object.keys(dailyAttendance).length === 0 || isSubmitting}
                        className="bg-primary-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
                      </button>
                    </div>
                    <div className="h-24"></div>
                </>
              )}
        </>
      )}

      {activeTab === 'reports' && (
        <div>
           <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Student Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                    <label htmlFor="grade-select-report" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                    <select id="grade-select-report" value={selectedGrade} onChange={handleGradeChange} className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500">
                      <option value="">Select Class</option>
                      {grades.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="section-select-report" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                    <select id="section-select-report" value={selectedSection} onChange={handleSectionChange} disabled={!selectedGrade} className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-200 dark:disabled:bg-slate-800">
                      <option value="">Select Section</option>
                      {sections.map(section => <option key={section} value={section}>Section {section}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div>
                      <label htmlFor="report-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                      <input id="report-start-date" type="date" value={reportDateRange.start} onChange={e => setReportDateRange(prev => ({ ...prev, start: e.target.value }))} className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
                    <div>
                      <label htmlFor="report-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                      <input id="report-end-date" type="date" value={reportDateRange.end} onChange={e => setReportDateRange(prev => ({ ...prev, end: e.target.value }))} className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
                    </div>
               </div>
            </div>
         </div>
         {filteredStudents.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredStudents.map(student => (
               <StudentReportCard key={student.id} student={student} dateRange={reportDateRange} />
             ))}
           </div>
         ) : (
           <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No Student Reports</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please select a class and section to view reports.</p>
            </div>
         )}
        </div>
      )}

      {viewingStudent && studentSubjectReport && (
        <Modal
            isOpen={!!viewingStudent}
            onClose={() => setViewingStudent(null)}
            title={`History for ${viewingStudent.name}`}
        >
            <div className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {subjects.find(s => s.id === selectedSubject)?.name} Attendance
                    </h4>
                    <p className={`text-3xl font-bold ${getPercentageColor(studentSubjectReport.percentage)}`}>
                        {studentSubjectReport.percentage.toFixed(1)}%
                    </p>
                </div>
                <div>
                    <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Detailed Log</h5>
                    <div className="max-h-64 overflow-y-auto pr-2">
                        <ul className="space-y-2">
                            {studentSubjectReport.records.map(record => (
                                <li key={record.date} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-slate-700 rounded-md">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</span>
                                    <span className={getStatusPill(record.status as AttendanceStatus)}>{record.status}</span>
                                </li>
                            ))}
                            {studentSubjectReport.records.length === 0 && (
                                <li className="text-center text-gray-500 dark:text-gray-400 py-4">No records found for this subject.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </Modal>
      )}

    </div>
  );
};

export default TeacherView;