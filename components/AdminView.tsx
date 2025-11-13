import React, { useState, useMemo, useRef } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { Student, AttendanceStatus, Teacher, TeacherAssignment } from '../types';
import AttendanceChart from './AttendanceChart';
import Modal from './Modal';
import StudentReportCard from './StudentReportCard';

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

interface Creds { name: string; email: string; pass: string; }

const AdminView: React.FC = () => {
  const { students, subjects, attendanceRecords, getTeacherForClassSubject, teachers, addStudent, addTeacher, teacherAssignments, addAssignment, users } = useAttendanceData();
  const [search, setSearch] = useState('');
  const [attendanceThreshold, setAttendanceThreshold] = useState(100);
  const [dateRange, setDateRange] = useState({
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [managementTab, setManagementTab] = useState<'students' | 'teachers' | 'assign'>('students');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  
  // State for forms
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [newStudentSection, setNewStudentSection] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  
  const [assignTeacher, setAssignTeacher] = useState('');
  const [assignGrade, setAssignGrade] = useState('');
  const [assignSection, setAssignSection] = useState('');
  const [assignSubject, setAssignSubject] = useState('');

  const [formMessage, setFormMessage] = useState({ text: '', type: 'success', details: [] as Creds[] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const allRecordsFlat = useMemo(() => Object.values(attendanceRecords).flat(), [attendanceRecords]);
  
  const grades = useMemo(() => [...new Set(students.map(s => s.grade))].sort((a, b) => a.localeCompare(b)), [students]);
  const sections = useMemo(() => {
    if (!selectedGrade) return [];
    return [...new Set(students.filter(s => s.grade === selectedGrade).map(s => s.section))].sort();
  }, [students, selectedGrade]);

  const assignedTeacher = useMemo(() => {
    if (!selectedGrade || !selectedSection || !selectedSubject) return null;
    return getTeacherForClassSubject(selectedGrade, selectedSection, selectedSubject);
  }, [selectedGrade, selectedSection, selectedSubject, getTeacherForClassSubject]);

  const studentReports = useMemo(() => {
    return students.map(student => {
      const studentRecords = attendanceRecords[student.id] || [];
      const recordsInRange = studentRecords.filter(r =>
        r.date >= dateRange.start &&
        r.date <= dateRange.end &&
        (selectedSubject === '' || r.subject_id === selectedSubject)
      );
      const presentCount = recordsInRange.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
      const totalDays = recordsInRange.length;
      const percentage = totalDays > 0 ? (presentCount / totalDays) * 100 : 100;

      return {
        ...student,
        presentCount,
        totalDays,
        percentage,
        records: recordsInRange,
      };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [students, attendanceRecords, dateRange, selectedSubject]);
  
  const subjectSummaryForModal = useMemo(() => {
    if (!selectedStudent) return [];
    const studentRecords = (attendanceRecords[selectedStudent.id] || []).filter(r => 
        r.date >= dateRange.start &&
        r.date <= dateRange.end
    );
    
    const recordsBySubject: Record<string, any[]> = studentRecords.reduce((acc, record) => {
        (acc[record.subject_id] = acc[record.subject_id] || []).push(record);
        return acc;
    }, {});

    return Object.entries(recordsBySubject).map(([subjectId, records]) => {
        const subject = subjects.find(s => s.id === subjectId);
        const presentCount = records.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
        const total = records.length;
        const percentage = total > 0 ? (presentCount / total) * 100 : 100;
        return { subjectId, subjectName: subject?.name || 'Unknown', percentage, presentCount, total };
    }).sort((a,b) => a.subjectName.localeCompare(b.subjectName));
  }, [selectedStudent, attendanceRecords, dateRange, subjects]);

  const filteredReports = useMemo(() => {
    return studentReports.filter(report =>
      report.name.toLowerCase().includes(search.toLowerCase()) &&
      report.percentage <= attendanceThreshold &&
      (selectedGrade === '' || report.grade === selectedGrade) &&
      (selectedSection === '' || report.section === selectedSection)
    );
  }, [studentReports, search, attendanceThreshold, selectedGrade, selectedSection]);

  const chartRecords = useMemo(() => {
    if (!selectedGrade || !selectedSection || !selectedSubject) {
        return [];
    }
    const studentIdsInClass = students
        .filter(s => s.grade === selectedGrade && s.section === selectedSection)
        .map(s => s.id);

    return allRecordsFlat.filter(record =>
        studentIdsInClass.includes(record.student_id) &&
        record.subject_id === selectedSubject &&
        record.date >= dateRange.start &&
        record.date <= dateRange.end
    );
  }, [students, allRecordsFlat, selectedGrade, selectedSection, selectedSubject, dateRange]);


  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value;
    setSelectedGrade(newGrade);
    setSelectedSection('');
    setSelectedSubject('');
  };
  
  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(e.target.value);
    setSelectedSubject('');
  }

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
  }

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Grade', 'Section', 'Date', 'Subject', 'Status', 'Teacher'];
    
    const escapeCsvCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`;

    const csvRows = [headers.join(',')];

    filteredReports.forEach(report => {
        report.records.forEach(record => {
            const subject = subjects.find(s => s.id === record.subject_id)?.name || 'N/A';
            const teacher = getTeacherForClassSubject(report.grade, report.section, record.subject_id)?.name || 'N/A';
            const row = [
                escapeCsvCell(report.name),
                report.grade,
                report.section,
                record.date,
                subject,
                record.status,
                escapeCsvCell(teacher)
            ];
            csvRows.push(row.join(','));
        });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `attendance_report_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName && newStudentGrade && newStudentSection) {
      setIsSubmitting(true);
      const result = await addStudent({
        name: newStudentName,
        grade: newStudentGrade,
        section: newStudentSection.toUpperCase()
      });
      
      let messageText = result.message;
      let details: Creds[] = [];
      if (result.success && result.studentInfo) {
          messageText = `Student "${result.studentInfo.name}" added! Their credentials are shown below.`;
          details = [result.studentInfo];
      }

      setFormMessage({ text: messageText, type: result.success ? 'success' : 'error', details });

      if (result.success) {
        setNewStudentName('');
        setNewStudentGrade('');
        setNewStudentSection('');
      }
      setIsSubmitting(false);
    }
  };
  
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setFormMessage({ text: '', type: 'success', details: [] });

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const csvText = event.target?.result as string;
            const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
            
            if (lines.length < 2) {
                throw new Error("CSV file must contain a header row and at least one data row.");
            }

            const headerLine = lines.shift()!;
            const headers = headerLine.trim().split(',').map(h => h.trim().toLowerCase());
            
            const nameIndex = headers.indexOf('name');
            const gradeIndex = headers.indexOf('grade');
            const sectionIndex = headers.indexOf('section');

            if (nameIndex === -1 || gradeIndex === -1 || sectionIndex === -1) {
                throw new Error('CSV file header must contain "name", "grade", and "section" columns.');
            }

            let successCount = 0;
            let errorCount = 0;
            const errorMessages: string[] = [];
            const successDetails: Creds[] = [];


            for (const [index, line] of lines.entries()) {
                const values = line.split(',');
                const name = values[nameIndex]?.trim().replace(/"/g, '');
                const gradeStr = values[gradeIndex]?.trim();
                const section = values[sectionIndex]?.trim().replace(/"/g, '');

                if (!name || !gradeStr || !section) {
                    errorCount++;
                    errorMessages.push(`Row ${index + 2}: Missing required data.`);
                    continue;
                }

                const result = await addStudent({ name, grade: gradeStr, section: section.toUpperCase() });
                if (result.success && result.studentInfo) {
                    successCount++;
                    successDetails.push(result.studentInfo);
                } else {
                    errorCount++;
                    errorMessages.push(`Row ${index + 2} (${name}): ${result.message}`);
                }
            }

            let summaryMessage = `Import complete. Added ${successCount} new students.`;
            if (errorCount > 0) {
                summaryMessage += ` Skipped ${errorCount} rows. See console for details.`;
                console.error("CSV Import Errors:", errorMessages.join('\n'));
            }
            
            setFormMessage({ text: summaryMessage, type: errorCount > 0 ? 'error' : 'success', details: successDetails });

        } catch (err: any) {
            setFormMessage({ text: err.message || 'An error occurred during import.', type: 'error', details: [] });
        } finally {
            setIsSubmitting(false);
            if(e.target) e.target.value = ''; // Reset file input
        }
    };

    reader.onerror = () => {
         setFormMessage({ text: 'Failed to read the file.', type: 'error', details: [] });
         setIsSubmitting(false);
    };

    reader.readAsText(file);
  };


  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherName) {
      setIsSubmitting(true);
      const teacherId = newTeacherName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const result = await addTeacher({ id: teacherId, name: newTeacherName });
      
      let messageText = result.message;
      let details: Creds[] = [];
      if (result.success && result.teacherInfo) {
          messageText = `Teacher "${result.teacherInfo.name}" added! Their credentials are shown below.`;
          details = [result.teacherInfo];
      }
      
      setFormMessage({ text: messageText, type: result.success ? 'success' : 'error', details });
      
      if (result.success) {
        setNewTeacherName('');
      }
      setIsSubmitting(false);
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignTeacher && assignGrade && assignSection && assignSubject) {
      const assignment: TeacherAssignment = {
        teacher_id: assignTeacher,
        grade: assignGrade,
        section: assignSection.toUpperCase(),
        subject_id: assignSubject,
      };

      const existing = teacherAssignments.find(a => 
          a.grade === assignment.grade && 
          a.section === assignment.section && 
          a.subject_id === assignment.subject_id
      );

      if (existing) {
          const existingTeacher = teachers.find(t => t.id === existing.teacher_id);
          setFormMessage({ text: `Error: This class/subject is already assigned to ${existingTeacher?.name || 'another teacher'}.`, type: 'error', details: [] });
          setTimeout(() => setFormMessage({ text: '', type: 'success', details: [] }), 5000);
          return;
      }
      setIsSubmitting(true);
      const success = await addAssignment(assignment);
      if (success) {
        setFormMessage({ text: 'Assignment added successfully!', type: 'success', details: [] });
        setAssignTeacher('');
        setAssignGrade('');
        setAssignSection('');
        setAssignSubject('');
      } else {
        setFormMessage({ text: 'Error: Failed to add assignment.', type: 'error', details: [] });
      }
      setIsSubmitting(false);
      setTimeout(() => setFormMessage({ text: '', type: 'success', details: [] }), 5000);
    }
  };
  
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

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Admin Dashboard</h2>
      
      <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`${activeTab === 'dashboard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                  Dashboard
              </button>
               <button
                  onClick={() => setActiveTab('reports')}
                  className={`${activeTab === 'reports' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                  Individual Reports
              </button>
          </nav>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Report Filters</h3>
            <button
                onClick={handleExportCSV}
                disabled={filteredReports.length === 0}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 7.414V13a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Export to CSV
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div>
              <label htmlFor="student-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student Name</label>
              <input
                id="student-search"
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

             <div>
                <label htmlFor="grade-select-admin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                <select
                  id="grade-select-admin"
                  value={selectedGrade}
                  onChange={handleGradeChange}
                  className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Classes</option>
                  {grades.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                </select>
              </div>

               <div>
                <label htmlFor="section-select-admin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                <select
                  id="section-select-admin"
                  value={selectedSection}
                  onChange={handleSectionChange}
                  disabled={!selectedGrade}
                  className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-200 dark:disabled:bg-slate-800"
                >
                  <option value="">All Sections</option>
                  {sections.map(section => <option key={section} value={section}>Section {section}</option>)}
                </select>
              </div>

               <div>
                  <label htmlFor="subject-select-admin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                  <select
                    id="subject-select-admin"
                    value={selectedSubject}
                    onChange={handleSubjectChange}
                    className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                  {assignedTeacher && selectedGrade && selectedSection && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Taught by: {assignedTeacher.name}</p>
                  )}
              </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label htmlFor="threshold-range" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attendance Below: {attendanceThreshold}%</label>
              <input
                id="threshold-range"
                type="range"
                min="0"
                max="100"
                value={attendanceThreshold}
                onChange={e => setAttendanceThreshold(Number(e.target.value))}
                className="mt-1 block w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
              />
            </div>

             <div className="md:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                     className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
            </div>
          </div>
        </div>
      
       {activeTab === 'dashboard' && (
        <>
          {selectedGrade && selectedSection && selectedSubject && (
            <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
                    Daily Attendance Overview for Grade {selectedGrade} {selectedSection} - {subjects.find(s => s.id === selectedSubject)?.name}
                </h3>
                <AttendanceChart records={chartRecords} />
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                  <tr>
                    <th scope="col" className="px-6 py-3">Student</th>
                    <th scope="col" className="px-6 py-3 text-center">Attendance %</th>
                    <th scope="col" className="px-6 py-3 text-center">Days (Present/Total)</th>
                    <th scope="col" className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(report => (
                    <tr key={report.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600">
                      <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {report.name}
                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                          Grade {report.grade} - Section {report.section}
                        </div>
                      </th>
                      <td className={`px-6 py-4 text-center font-bold text-lg ${getPercentageColor(report.percentage)}`}>{report.percentage.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-center">{report.presentCount} / {report.totalDays}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedStudent(report)}
                          className="font-medium text-primary-600 dark:text-primary-500 hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                   {filteredReports.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">No student records match the current filters.</td>
                    </tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mt-8">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">School Management</h3>
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setManagementTab('students')}
                        className={`${managementTab === 'students' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        Add Student
                    </button>
                     <button
                        onClick={() => setManagementTab('teachers')}
                        className={`${managementTab === 'teachers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        Add Teacher
                    </button>
                     <button
                        onClick={() => setManagementTab('assign')}
                        className={`${managementTab === 'assign' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        Assign Teacher
                    </button>
                </nav>
            </div>
            <div className="pt-6">
                {formMessage.text && (
                    <div className={`relative p-4 rounded-lg mb-6 text-sm ${formMessage.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'}`}>
                        <p className="font-semibold text-center">{formMessage.text}</p>
                        
                        {formMessage.details && formMessage.details.length > 0 && (
                            <div className="mt-4 text-left bg-white/50 dark:bg-slate-800/50 p-3 rounded-md max-h-52 overflow-y-auto border dark:border-slate-700">
                                <h5 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Generated Credentials:</h5>
                                <ul className="space-y-2">
                                    {formMessage.details.map((detail, index) => (
                                        <li key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 rounded bg-gray-50 dark:bg-slate-700/50">
                                            <div className="font-mono text-xs">
                                                <strong className="text-gray-900 dark:text-white text-sm">{detail.name}</strong><br />
                                                <span className="text-gray-600 dark:text-gray-400">Email: {detail.email}</span><br />
                                                <span className="text-gray-600 dark:text-gray-400">Pass: {detail.pass}</span>
                                            </div>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(`Email: ${detail.email}\nPassword: ${detail.pass}`)}
                                                className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-md transition-colors duration-200 text-gray-600 dark:text-gray-300 bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500"
                                                aria-label={`Copy credentials for ${detail.name}`}
                                            >
                                                Copy
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button 
                            onClick={() => setFormMessage({ text: '', type: 'success', details: [] })}
                            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                            aria-label="Dismiss message"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                        </button>
                    </div>
                )}
                {managementTab === 'students' && (
                    <div>
                        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Add a Single Student</h4>
                        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
                            <div className="md:col-span-2">
                                 <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                 <input type="text" id="student-name" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"/>
                            </div>
                             <div>
                                 <label htmlFor="student-grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grade</label>
                                 <input type="text" id="student-grade" value={newStudentGrade} onChange={e => setNewStudentGrade(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"/>
                            </div>
                            <div>
                                 <label htmlFor="student-section" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                                 <input type="text" id="student-section" value={newStudentSection} onChange={e => setNewStudentSection(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"/>
                            </div>
                            <div className="md:col-span-4">
                                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300">
                                    {isSubmitting ? 'Adding...' : 'Add Student'}
                                </button>
                            </div>
                        </form>

                        <div className="flex items-center my-8">
                            <div className="flex-grow border-t border-gray-300 dark:border-slate-600"></div>
                            <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold">Or</span>
                            <div className="flex-grow border-t border-gray-300 dark:border-slate-600"></div>
                        </div>
                        
                        <div>
                            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Import Multiple Students</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Upload a CSV file with columns: <code>name</code>, <code>grade</code>, <code>section</code>. The first row must be the header.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileImport}
                                className="hidden"
                                accept=".csv"
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting}
                                className="w-full md:w-auto inline-flex items-center justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l.293.293a1 1 0 001.414-1.414l-2-2a1 1 0 00-1.414 0l-2 2a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                                  <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                                </svg>
                                {isSubmitting ? 'Importing...' : 'Upload CSV File'}
                            </button>
                        </div>

                        <div className="mt-8">
                          <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Current Students ({students.length})</h4>
                          <div className="max-h-64 overflow-y-auto border dark:border-slate-700 rounded-lg">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300 sticky top-0">
                                      <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Grade</th><th className="px-4 py-2">Section</th></tr>
                                  </thead>
                                  <tbody className="dark:text-gray-400">
                                      {[...students].sort((a,b) => a.name.localeCompare(b.name)).map(s => <tr key={s.id} className="border-b dark:border-slate-700"><td className="px-4 py-2">{s.name}</td><td className="px-4 py-2">{s.grade}</td><td className="px-4 py-2">{s.section}</td></tr>)}
                                  </tbody>
                              </table>
                          </div>
                        </div>
                    </div>
                )}
                 {managementTab === 'teachers' && (
                    <div>
                         <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mb-6">
                            <div className="md:col-span-1">
                                 <label htmlFor="teacher-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                 <input type="text" id="teacher-name" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"/>
                            </div>
                            <div className="md:col-span-1">
                                <button type="submit" disabled={isSubmitting} className="w-full justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300">
                                    {isSubmitting ? 'Adding...' : 'Add Teacher'}
                                </button>
                            </div>
                        </form>
                         <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Current Teachers ({teachers.length})</h4>
                         <div className="max-h-64 overflow-y-auto border dark:border-slate-700 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300 sticky top-0">
                                    <tr><th className="px-4 py-2">Name</th></tr>
                                </thead>
                                 <tbody className="dark:text-gray-400">
                                    {[...teachers].sort((a,b) => a.name.localeCompare(b.name)).map(t => <tr key={t.id} className="border-b dark:border-slate-700"><td className="px-4 py-2">{t.name}</td></tr>)}
                                </tbody>
                            </table>
                         </div>
                    </div>
                )}
                {managementTab === 'assign' && (
                    <div>
                         <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
                            <div className="md:col-span-1">
                                 <label htmlFor="assign-teacher" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teacher</label>
                                 <select id="assign-teacher" value={assignTeacher} onChange={e => setAssignTeacher(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"><option value="">Select...</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            </div>
                            <div>
                                 <label htmlFor="assign-grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grade</label>
                                 <input type="text" id="assign-grade" value={assignGrade} onChange={e => setAssignGrade(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"/>
                            </div>
                            <div>
                                 <label htmlFor="assign-section" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                                 <input type="text" id="assign-section" value={assignSection} onChange={e => setAssignSection(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"/>
                            </div>
                            <div>
                                 <label htmlFor="assign-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                                 <select id="assign-subject" value={assignSubject} onChange={e => setAssignSubject(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2"><option value="">Select...</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                            </div>
                            <div className="md:col-span-1">
                                <button type="submit" disabled={isSubmitting} className="w-full justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300">
                                    {isSubmitting ? 'Assigning...' : 'Assign'}
                                </button>
                            </div>
                        </form>
                         <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Current Assignments ({teacherAssignments.length})</h4>
                         <div className="max-h-64 overflow-y-auto border dark:border-slate-700 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300 sticky top-0">
                                    <tr><th className="px-4 py-2">Class</th><th className="px-4 py-2">Subject</th><th className="px-4 py-2">Teacher</th></tr>
                                </thead>
                                 <tbody className="dark:text-gray-400">
                                    {[...teacherAssignments].sort((a,b) => a.grade.localeCompare(b.grade) || a.section.localeCompare(b.section)).map((a, i) => <tr key={i} className="border-b dark:border-slate-700"><td className="px-4 py-2">Grade {a.grade} - {a.section}</td><td className="px-4 py-2">{subjects.find(s=>s.id === a.subject_id)?.name}</td><td className="px-4 py-2">{teachers.find(t=>t.id === a.teacher_id)?.name}</td></tr>)}
                                </tbody>
                            </table>
                         </div>
                    </div>
                )}
            </div>
          </div>
        </>
       )}

       {activeTab === 'reports' && (
        <div>
            {filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.map(student => (
                        <StudentReportCard key={student.id} student={student} dateRange={dateRange} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No Students Found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No student records match the current filters.</p>
                </div>
            )}
        </div>
       )}


      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Attendance: ${selectedStudent.name} (Grade ${selectedStudent.grade} - Section ${selectedStudent.section})`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Attendance by Subject</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjectSummaryForModal.map(summary => (
                    <div key={summary.subjectId} className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg">
                        <p className="font-bold text-gray-800 dark:text-gray-200">{summary.subjectName}</p>
                        <p className={`text-2xl font-bold ${getPercentageColor(summary.percentage)}`}>
                            {summary.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">({summary.presentCount}/{summary.total} days)</p>
                    </div>
                ))}
                 {subjectSummaryForModal.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No records in selected date range.</p>}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Detailed Log</h4>
                <div className="max-h-60 overflow-y-auto pr-2">
                <ul className="space-y-2">
                  {(attendanceRecords[selectedStudent.id] || [])
                    .filter(record => record.date >= dateRange.start && record.date <= dateRange.end)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(record => (
                      <li key={`${record.date}-${record.subject_id}`} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-slate-700 rounded-md">
                        <div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">{subjects.find(s => s.id === record.subject_id)?.name || 'Unknown Subject'}</span>
                        </div>
                        <span className={getStatusPill(record.status)}>{record.status}</span>
                      </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminView;