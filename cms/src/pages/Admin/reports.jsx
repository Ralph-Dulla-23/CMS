import React, { useState, useEffect } from 'react';
import AdminNavbar from '../ui/adminnavbar';
import { Dropdown } from 'primereact/dropdown';
import { getStudentInterviewForms } from '../../firebase/firestoreService';
import { CSVLink } from 'react-csv';
import SummaryStatisticsSection from '../../components/SummaryStatisticsSection';
import ChartsSection from '../../components/ChartsSection';
import { 
  processChartData, 
  calculateSummaryStatistics, 
  filterFormsByTimeframe, 
  filterFormsByCollege,
  prepareCSVData,
  getDepartmentFromCourse
} from '../../components/reportHelpers';

function Reports() {
  const [studentsPerCollegeData, setStudentsPerCollegeData] = useState({});
  const [sessionTypesData, setSessionTypesData] = useState({});
  const [counselingSessionsData, setCounselingSessionsData] = useState({});
  const [yearPerCollegesData, setYearPerCollegesData] = useState({});
  const [remarksDistributionData, setRemarksDistributionData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('thisMonth');
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    totalSessions: 0,
    totalCompletedSessions: 0,
    averageSessionsPerDay: 0,
    mostActiveCollege: '',
    leastActiveCollege: '',
    mostCommonReason: '',
    mostCommonRemark: ''
  });

  // Constants for dropdown options
  const timeframeOptions = [
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Past 3 Months', value: 'past3Months' },
    { label: 'All Time', value: 'allTime' },
  ];

  const collegeOptions = [
    { label: 'All Colleges', value: 'all' },
    { label: 'CAH (College of Arts and Humanities)', value: 'cah' },
    { label: 'CMBS (College of Medical and Biological Science)', value: 'cmbs' },
    { label: 'CCS (College of Computer Studies)', value: 'ccs' },
    { label: 'CABE (College of Accounting and Business Education)', value: 'cabe' },
    { label: 'CEA (College of Engineering and Architecture)', value: 'cea' },
    { label: 'CHESFS (College of Human Environmental Sciences and Food Studies)', value: 'chesfs' },
    { label: 'CM (College of Music)', value: 'cm' },
    { label: 'CN (College of Nursing)', value: 'cn' },
    { label: 'CPC (College of Pharmacy and Chemistry)', value: 'cpc' },
    { label: 'CTE (College of Teacher Education)', value: 'cte' }
  ];

  useEffect(() => {
    fetchDataAndGenerateReports();
  }, [selectedTimeframe, selectedCollege]);

  const fetchDataAndGenerateReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all forms
      const result = await getStudentInterviewForms();
      
      if (!result.success) {
        setError(result.error || "Failed to fetch data");
        setLoading(false);
        return;
      }
      
      const forms = result.forms || [];
      
      // Log summary of data for debugging
      console.log(`Total forms fetched: ${forms.length}`);
      console.log(`Forms with status 'Completed': ${forms.filter(f => f.status === 'Completed').length}`);
      console.log(`Forms with remarks: ${forms.filter(f => f.remarks).length}`);
      
      setReportData(forms);
      
      // Filter data based on selected timeframe
      const filteredForms = filterFormsByTimeframe(forms, selectedTimeframe);
      
      // Further filter by college if needed
      const collegeFilteredForms = filterFormsByCollege(filteredForms, selectedCollege, getDepartmentFromCourse);
      
      // Process data for charts and set chart states
      processChartData(
        collegeFilteredForms,
        getDepartmentFromCourse,
        setStudentsPerCollegeData,
        setSessionTypesData,
        setCounselingSessionsData,
        setYearPerCollegesData,
        setRemarksDistributionData,
        setChartOptions
      );
      
      // Calculate summary statistics
      const stats = calculateSummaryStatistics(collegeFilteredForms, getDepartmentFromCourse);
      setSummaryStats(stats);
      
    } catch (error) {
      console.error("Error generating reports:", error);
      setError("Failed to generate reports: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AdminNavbar />

      {/* Dashboard Content */}
      <div className="max-w-8xl mx-auto mt- px-6 pt-12">
        <h1 className="text-3xl font-bold mb-6">Counseling Reports</h1>

        {/* Filters */}
  <div className="flex justify-end space-x-4 mb-8">
    <Dropdown
      value={selectedTimeframe}
      options={timeframeOptions}
      onChange={(e) => setSelectedTimeframe(e.value)}
      placeholder="Select Timeframe"
      className="w-48 custom-dropdown"
      dropdownIcon="pi pi-chevron-down"
    />
    
    <Dropdown
      value={selectedCollege}
      options={collegeOptions}
      onChange={(e) => setSelectedCollege(e.value)}
      placeholder="Select a College"
      className="w-48 custom-dropdown"
      dropdownIcon="pi pi-chevron-down"
    />
  </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg">Loading report data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <>
            {/* Summary Statistics Section */}
            <SummaryStatisticsSection stats={summaryStats} />

            {/* Charts Section */}
            <ChartsSection 
              studentsPerCollegeData={studentsPerCollegeData}
              sessionTypesData={sessionTypesData}
              counselingSessionsData={counselingSessionsData}
              yearPerCollegesData={yearPerCollegesData}
              remarksDistributionData={remarksDistributionData}
              chartOptions={chartOptions}
            />

            {/* Export Button */}
            <div className="flex justify-center mt-4 mb-8">
              {reportData.length > 0 ? (
                <CSVLink
                  data={prepareCSVData(reportData)}
                  filename={`counseling-report-${new Date().toISOString().split('T')[0]}.csv`}
                  className="bg-pink-500 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded text-sm"
                >
                  Export Data as CSV
                </CSVLink>
              ) : (
                <button className="bg-pink-300 text-white font-bold py-2 px-4 rounded text-sm cursor-not-allowed" disabled>
                  No Data to Export
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Reports;