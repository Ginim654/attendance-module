import React, { useMemo } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../types';

interface AttendanceChartProps {
  records: AttendanceRecord[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ records }) => {
  const chartData = useMemo(() => {
    const dataByDate: Record<string, { Present: number; Absent: number; Late: number; Total: number }> = {};

    records.forEach(record => {
      if (!dataByDate[record.date]) {
        dataByDate[record.date] = { Present: 0, Absent: 0, Late: 0, Total: 0 };
      }
      dataByDate[record.date][record.status as keyof typeof dataByDate[string]]++;
      dataByDate[record.date].Total++;
    });

    return Object.keys(dataByDate)
      .map(date => ({
        date,
        ...dataByDate[date],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records]);
  
  const recentChartData = chartData.slice(-15);
  const maxTotal = Math.max(...recentChartData.map(d => d.Total), 1); // Use 1 to avoid division by zero

  const statusColors = {
    [AttendanceStatus.Present]: 'bg-emerald-500',
    [AttendanceStatus.Late]: 'bg-amber-500',
    [AttendanceStatus.Absent]: 'bg-red-500',
  };
  
  return (
    <div className="w-full h-[300px] p-4 flex flex-col">
       <div className="flex-grow flex items-end justify-around gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        {recentChartData.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full text-gray-500">No data for selected range.</div>
        ) : (
          recentChartData.map(data => (
            <div key={data.date} className="flex-1 h-full flex flex-col items-center justify-end group relative">
               <div 
                 className="w-3/4 flex flex-col-reverse rounded-t-md overflow-hidden" 
                 style={{height: data.Total > 0 ? `${(data.Total / maxTotal) * 100}%` : '0%'}}
                >
                    <div 
                        className={statusColors[AttendanceStatus.Present]}
                        style={{ height: data.Total > 0 ? `${(data.Present / data.Total) * 100}%` : '0%' }}
                    ></div>
                    <div 
                        className={statusColors[AttendanceStatus.Late]}
                        style={{ height: data.Total > 0 ? `${(data.Late / data.Total) * 100}%` : '0%'}}
                    ></div>
                    <div 
                        className={statusColors[AttendanceStatus.Absent]}
                        style={{ height: data.Total > 0 ? `${(data.Absent / data.Total) * 100}%` : '0%'}}
                    ></div>
               </div>
               {/* Tooltip */}
               <div className="absolute bottom-full mb-2 w-40 p-2 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <p className="font-bold">{new Date(data.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  <p><span className="text-emerald-400">■ Present:</span> {data.Present}</p>
                  <p><span className="text-amber-400">■ Late:</span> {data.Late}</p>
                  <p><span className="text-red-400">■ Absent:</span> {data.Absent}</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
               </div>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-around pt-2 -mx-2">
         {recentChartData.map(data => (
            <div key={data.date} className="text-xs text-gray-500 dark:text-gray-400 flex-1 text-center px-1">
                {new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
         ))}
      </div>
       <div className="flex justify-center items-center space-x-4 pt-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-emerald-500 mr-2"></span>Present</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-amber-500 mr-2"></span>Late</div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-sm bg-red-500 mr-2"></span>Absent</div>
       </div>
    </div>
  );
};

export default AttendanceChart;