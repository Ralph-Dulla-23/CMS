import React, { useState, useEffect } from 'react';
import AdminNavbar from '../ui/adminnavbar';
import { Chart } from 'primereact/chart';
import { db } from '../../firebase/firebase-config';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getStudentInterviewForms } from '../../firebase/firestoreService';
import { format, isAfter, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const navigate = useNavigate();
  const [studentsPerCollegeData, setStudentsPerCollegeData] = useState({});
  const [sessionTypesData, setSessionTypesData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    newRequests: 0,
    completedSessions: 0,
    noShows: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define chart colors
  const chartColors = {
    backgroundColor: [
      'rgba(239, 68, 68, 0.4)',
      'rgba(59, 130, 246, 0.4)',
      'rgba(16, 185, 129, 0.4)',
      'rgba(245, 158, 11, 0.4)',
      'rgba(139, 92, 246, 0.4)',
      'rgba(236, 72, 153, 0.4)',
      'rgba(75, 85, 99, 0.4)',
      'rgba(251, 146, 60, 0.4)',
      'rgba(52, 211, 153, 0.4)',
      'rgba(99, 102, 241, 0.4)',
      'rgba(209, 213, 219, 0.4)',
    ],
    borderColor: [
      'rgb(239, 68, 68)',
      'rgb(59, 130, 246)',
      'rgb(16, 185, 129)',
      'rgb(245, 158, 11)',
      'rgb(139, 92, 246)',
      'rgb(236, 72, 153)',
      'rgb(75, 85, 99)',
      'rgb(251, 146, 60)',
      'rgb(52, 211, 153)',
      'rgb(99, 102, 241)',
      'rgb(209, 213, 219)',
    ]
  };

  // Function to determine department from course code
  const getDepartmentFromCourse = (courseCode) => {
    // Extract the program/degree code from the course code
    const programCode = courseCode.split(' ')[0]; // Get first part before any spaces
    
    // Map program codes to their respective colleges
    const collegeMap = {
      // College of Accounting and Business Education (CABE)
      'BSA': 'College of Accounting and Business Education',
      'BSMA': 'College of Accounting and Business Education',
      'BSAIS': 'College of Accounting and Business Education',
      'BSBA': 'College of Accounting and Business Education',
      'BSREM': 'College of Accounting and Business Education',
      
      // College of Arts and Humanities (CAH)
      'AB': 'College of Arts and Humanities',
      'ABCOM': 'College of Arts and Humanities',
      'ABELS': 'College of Arts and Humanities',
      'ABPhilo': 'College of Arts and Humanities',
      'ABPsych': 'College of Arts and Humanities',
      
      // College of Computer Studies (CCS)
      'BSCS': 'College of Computer Studies',
      'BSIS': 'College of Computer Studies',
      'BSIT': 'College of Computer Studies',
      
      // College of Engineering and Architecture (CEA)
      'BSArch': 'College of Engineering and Architecture',
      'BSCE': 'College of Engineering and Architecture',
      'BSCpE': 'College of Engineering and Architecture',
      'BSECE': 'College of Engineering and Architecture',
      
      // College of Human Environmental Sciences and Food Studies (CHESFS)
      'BSND': 'College of Human Environmental Sciences and Food Studies',
      'BSHRM': 'College of Human Environmental Sciences and Food Studies',
      'BSTM': 'College of Human Environmental Sciences and Food Studies',
      
      // College of Medical and Biological Science (CMBS)
      'BSBio': 'College of Medical and Biological Science',
      'BSMLS': 'College of Medical and Biological Science',
      
      // College of Music (CM)
      'BM': 'College of Music',
      
      // College of Nursing (CN)
      'BSN': 'College of Nursing',
      
      // College of Pharmacy and Chemistry (CPC)
      'BSP': 'College of Pharmacy and Chemistry',
      'BSChem': 'College of Pharmacy and Chemistry',
      
      // College of Teacher Education (CTE)
      'BECE': 'College of Teacher Education',
      'BEEd': 'College of Teacher Education',
      'BSEd': 'College of Teacher Education',
      'BSNE': 'College of Teacher Education',
      'BPE': 'College of Teacher Education',
    };

    // Check for exact matches first
    if (collegeMap[programCode]) {
      return collegeMap[programCode];
    }
    
    // For codes that might be variations or not exact matches
    for (const prefix in collegeMap) {
      if (programCode.startsWith(prefix)) {
        return collegeMap[prefix];
      }
    }

    // Additional pattern matching for special cases
    if (programCode.includes('BA') || programCode.includes('Acct') || programCode.includes('Fin') || 
        programCode.includes('Mgt') || programCode.includes('HRM')) {
      return 'College of Accounting and Business Education';
    } else if (programCode.includes('Arch') || programCode.includes('CE') || 
               programCode.includes('CpE') || programCode.includes('ECE')) {
      return 'College of Engineering and Architecture';
    } else if (programCode.includes('Ed') || programCode.includes('Edu') || programCode.includes('Teach')) {
      return 'College of Teacher Education';
    } else if (programCode.includes('CS') || programCode.includes('IS') || programCode.includes('IT')) {
      return 'College of Computer Studies';
    } else if (programCode.includes('Nurs')) {
      return 'College of Nursing';
    } else if (programCode.includes('Pharm') || programCode.includes('Chem')) {
      return 'College of Pharmacy and Chemistry';
    } else if (programCode.includes('Bio') || programCode.includes('MLS') || programCode.includes('Lab')) {
      return 'College of Medical and Biological Science';
    } else if (programCode.includes('ND') || programCode.includes('HRM') || programCode.includes('TM')) {
      return 'College of Human Environmental Sciences and Food Studies';
    } else if (programCode.includes('AB') || programCode.includes('Arts') || 
               programCode.includes('Com') || programCode.includes('Psych') || 
               programCode.includes('Phil')) {
      return 'College of Arts and Humanities';
    } else if (programCode.includes('Mus') || programCode.includes('BM')) {
      return 'College of Music';
    }

    return 'Unknown College';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching dashboard data...");
        
        // Fetch all interview forms using your existing service
        const formsResult = await getStudentInterviewForms();
        
        if (!formsResult.success) {
          console.error("Failed to fetch interview forms:", formsResult.error);
          setError(formsResult.error || "Failed to fetch interview data");
          setLoading(false);
          return;
        }
        
        const forms = formsResult.forms || [];
        console.log(`Successfully fetched ${forms.length} forms`);
        
        // Process data for dashboard
        processFormsData(forms);
        
      } catch (error) {
        console.error("Error in fetchDashboardData:", error);
        setError("Failed to load dashboard data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    const processFormsData = (forms) => {
      try {
        // Initialize college counts with all colleges
        const collegeCounts = {
          'CAH': 0,
          'CMBS': 0,
          'CCS': 0,
          'CABE': 0,
          'CEA': 0,
          'CHESFS': 0,
          'CM': 0,
          'CN': 0,
          'CPC': 0,
          'CTE': 0,
          'Other': 0
        };
        
        // Initialize session types
        const sessionTypes = {
          'Referral': 0,
          'Walk-in': 0
        };
        
        // Get current date for stats calculations
        const now = new Date();
        
        // Calculate time periods for filtering
        const yesterday = subDays(now, 1);
        const thisMonth = startOfMonth(now);
        const thisWeek = startOfWeek(now, { weekStartsOn: 0 }); // 0 means Sunday
        
        // Count stats
        let newRequests = 0;
        let completedSessions = 0;
        let noShows = 0;
        
        // Process each form
        forms.forEach(form => {
          // Count by college using improved college detection
          const courseYearSection = form.courseYearSection || '';
          if (courseYearSection) {
            const collegeName = getDepartmentFromCourse(courseYearSection);
            let collegeAbbr;
            
            // Map full college names to abbreviations
            switch(collegeName) {
              case 'College of Arts and Humanities': collegeAbbr = 'CAH'; break;
              case 'College of Medical and Biological Science': collegeAbbr = 'CMBS'; break;
              case 'College of Computer Studies': collegeAbbr = 'CCS'; break;
              case 'College of Accounting and Business Education': collegeAbbr = 'CABE'; break;
              case 'College of Engineering and Architecture': collegeAbbr = 'CEA'; break;
              case 'College of Human Environmental Sciences and Food Studies': collegeAbbr = 'CHESFS'; break;
              case 'College of Music': collegeAbbr = 'CM'; break;
              case 'College of Nursing': collegeAbbr = 'CN'; break;
              case 'College of Pharmacy and Chemistry': collegeAbbr = 'CPC'; break;
              case 'College of Teacher Education': collegeAbbr = 'CTE'; break;
              default: collegeAbbr = 'Other';
            }
            
            if (collegeCounts.hasOwnProperty(collegeAbbr)) {
              collegeCounts[collegeAbbr]++;
            } else {
              collegeCounts['Other']++;
            }
          } else {
            collegeCounts['Other']++;
          }
          
          // Count by session type
          if (form.isReferral === true) {
            sessionTypes['Referral']++;
          } else {
            sessionTypes['Walk-in']++;
          }
          
          // Get relevant dates from the form
          const submissionDate = form.submissionDate ? new Date(form.submissionDate) : null;
          const updatedDate = form.updatedAt ? new Date(form.updatedAt) : null;
          
          // Check if it's a new request (submitted since yesterday)
          if (submissionDate && isAfter(submissionDate, yesterday)) {
            newRequests++;
          }
          
          // Check if it's a completed session this month
          // Accept both "Completed" and "Reviewed" as completion statuses
          if ((form.status === 'Completed' || form.status === 'Reviewed')) {
            // For completed sessions, prefer the updatedAt date if available
            const statusDate = updatedDate || submissionDate;
            if (statusDate && isAfter(statusDate, thisMonth)) {
              completedSessions++;
            }
          }
          
          // Check if it's a no-show this week
          // Accept both "No-show" and "No Show" as no-show statuses
          if (form.status === 'No-show' || form.status === 'No Show' || 
              (form.remarks && form.remarks === 'No Show')) {
            // For no-shows, prefer the updatedAt date if available
            const statusDate = updatedDate || submissionDate;
            if (statusDate && isAfter(statusDate, thisWeek)) {
              noShows++;
            }
          }
        });
        
        // Set dashboard stats
        setDashboardStats({
          totalStudents: forms.length,
          newRequests,
          completedSessions,
          noShows
        });
        
        // Clean up college counts - remove colleges with zero count
        const nonZeroColleges = {};
        Object.entries(collegeCounts).forEach(([college, count]) => {
          if (count > 0) {
            nonZeroColleges[college] = count;
          }
        });
        
        // Prepare pie chart data with improved colors
        const collegeData = {
          labels: Object.keys(nonZeroColleges),
          datasets: [
            {
              label: 'Students per College',
              data: Object.values(nonZeroColleges),
              backgroundColor: chartColors.backgroundColor.slice(0, Object.keys(nonZeroColleges).length),
              borderColor: chartColors.borderColor.slice(0, Object.keys(nonZeroColleges).length),
              borderWidth: 1,
            },
          ],
        };
        setStudentsPerCollegeData(collegeData);
        
        // Prepare bar chart data
        const sessionData = {
          labels: Object.keys(sessionTypes),
          datasets: [
            {
              label: 'Session Types',
              data: Object.values(sessionTypes),
              backgroundColor: [chartColors.backgroundColor[0], chartColors.backgroundColor[1]],
              borderColor: [chartColors.borderColor[0], chartColors.borderColor[1]],
              borderWidth: 1,
            },
          ],
        };
        setSessionTypesData(sessionData);
        
        // Set chart options
        // Set chart options with more robust tooltip handling
        setChartOptions({
          scales: {
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'center',
              labels: {
                color: '#495057'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  // For pie charts
                  if (context.chart.config.type === 'pie') {
                    const label = context.label || '';
                    const value = context.parsed || context.raw || 0;
                    return `${label}: ${value}`;
                  } 
                  // For bar charts
                  else {
                    let label = context.dataset.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed.y !== null) {
                      label += context.parsed.y;
                    }
                    return label;
                  }
                }
              }
            }
          },
          maintainAspectRatio: false
        });
        
        // Get recent activities (sort by submission date)
        const sortedForms = [...forms].sort((a, b) => {
          const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0);
          const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0);
          return dateB - dateA;
        });
        
        // Take the 3 most recent
        const recentActivitiesData = sortedForms.slice(0, 3).map(form => ({
          id: form.id,
          studentName: form.studentName || 'Unknown Student',
          courseYearSection: form.courseYearSection || 'N/A',
          submissionDate: form.submissionDate ? format(new Date(form.submissionDate), 'PPP') : 'Unknown date',
          isReferral: form.isReferral === true,
          referredBy: form.referredBy || form.facultyName || 'Self',
          concerns: form.concerns || form.areasOfConcern || {},
          reason: getConcernText(form)
        }));
        
        setRecentActivities(recentActivitiesData);
        
      } catch (error) {
        console.error("Error processing forms data:", error);
        setError("Error processing dashboard data: " + error.message);
      }
    };

    // Helper function to extract concern text
    const getConcernText = (form) => {
      // Handle different formats of concerns
      if (form.concerns) {
        // Faculty referral format
        if (form.concerns.academic && form.concerns.academic.length > 0) {
          return form.concerns.academic[0];
        }
        if (form.concerns.personal && form.concerns.personal.length > 0) {
          return form.concerns.personal[0];
        }
      } else if (form.areasOfConcern) {
        // Student form format
        const areas = form.areasOfConcern;
        if (areas.academic && areas.academic.length > 0) {
          return areas.academic[0];
        }
        if (areas.personal && areas.personal.length > 0) {
          return areas.personal[0];
        }
        if (areas.interpersonal && areas.interpersonal.length > 0) {
          return areas.interpersonal[0];
        }
        if (areas.family && areas.family.length > 0) {
          return areas.family[0];
        }
      }
      
      return "Not specified";
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <AdminNavbar />
      {/* Dashboard Content */}
      <div className="max-w-8xl mx-auto mt- px-6 pt-12">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg">Loading dashboard data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <>
            {/* Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-7">
              <div className="bg-white border p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold">Total Sessions</h2>
                <p className="text-4xl font-bold">{dashboardStats.totalStudents}</p>
                <p className="text-gray-600 text-sm">This semester</p>
              </div>
              <div className="bg-white border p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold">New Requests</h2>
                <p className="text-4xl font-bold">{dashboardStats.newRequests}</p>
                <p className="text-gray-600 text-sm">Since yesterday</p>
              </div>
              <div className="bg-white border p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold">Completed Sessions</h2>
                <p className="text-4xl font-bold">{dashboardStats.completedSessions}</p>
                <p className="text-gray-600 text-sm">This month</p>
              </div>
              <div className="bg-white border p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold">No-shows</h2>
                <p className="text-4xl font-bold">{dashboardStats.noShows}</p>
                <p className="text-gray-600 text-sm">This week</p>
              </div>
            </div>

            {/* Recent Activity & Notifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Recent Activity */}
              <div className="bg-white border p-6 rounded-lg shadow-md">
                <div className="flex justify-between">
                  <h2 className="text-lg font-bold">Recent Activity</h2>
                  <button 
                    onClick={() => navigate("/SubmittedFormsManagement")} 
                    className="text-gray-700 font-medium hover:text-[#3A0323] transition-colors cursor-pointer"
                  >
                    See all
                  </button>
                </div>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="mt-4 border-b pb-2">
                      <p className="font-semibold">
                        {activity.isReferral ? 'New Referral' : 'New Walk-in'}: {activity.studentName} ({activity.courseYearSection})
                      </p>
                      <p className="text-gray-600 text-sm">
                        {activity.isReferral && (
                          <>Referred by: {activity.referredBy} - </>
                        )}
                        <span className="font-bold">Reason:</span> {activity.reason}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {activity.submissionDate}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="mt-4 text-gray-500">No recent activities</p>
                )}
              </div>

              {/* Notifications */}
              <div className="bg-white border p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold">Notifications</h2>
                <div className="mt-4">
                  {dashboardStats.newRequests > 0 ? (
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded mb-3">
                      <p className="text-yellow-800">
                        <span className="font-bold">{dashboardStats.newRequests}</span> new {dashboardStats.newRequests === 1 ? 'request' : 'requests'} since yesterday
                      </p>
                    </div>
                  ) : null}
                  
                  {dashboardStats.noShows > 0 ? (
                    <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded mb-3">
                      <p className="text-red-800">
                        <span className="font-bold">{dashboardStats.noShows}</span> no-{dashboardStats.noShows === 1 ? 'show' : 'shows'} this week
                      </p>
                    </div>
                  ) : null}
                  
                  {dashboardStats.completedSessions > 0 ? (
                    <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                      <p className="text-green-800">
                        <span className="font-bold">{dashboardStats.completedSessions}</span> {dashboardStats.completedSessions === 1 ? 'session' : 'sessions'} completed this month
                      </p>
                    </div>
                  ) : null}
                  
                  {dashboardStats.newRequests === 0 && dashboardStats.noShows === 0 && dashboardStats.completedSessions === 0 && (
                    <p className="text-gray-500">No new notifications</p>
                  )}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Pie Chart */}
              <div className="bg-white border p-6 rounded-lg shadow-md pb-8">
                <h2 className="text-lg font-bold">Students per College</h2>
                {Object.keys(studentsPerCollegeData).length > 0 && studentsPerCollegeData.labels?.length > 0 ? (
                  <Chart type="pie" data={studentsPerCollegeData} options={chartOptions} style={{ width: '100%', height: '250px' }} />
                ) : (
                  <p className="flex justify-center items-center h-64 text-gray-500">No data available</p>
                )}
              </div>

              {/* Bar Chart */}
              <div className="bg-white border p-6 rounded-lg shadow-md pb-8">
                <h2 className="text-lg font-bold">Session Types</h2>
                {Object.keys(sessionTypesData).length > 0 && sessionTypesData.labels?.length > 0 ? (
                  <Chart type="bar" data={sessionTypesData} options={chartOptions} style={{ width: '100%', height: '250px' }} />
                ) : (
                  <p className="flex justify-center items-center h-64 text-gray-500">No data available</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;