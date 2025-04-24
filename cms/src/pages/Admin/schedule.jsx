import React, { useState, useEffect } from 'react';
import AdminNavbar from '../ui/adminnavbar';
import {
  getStudentInterviewForms,
  getUnavailableDates,
  setUnavailableDates,
  removeUnavailableDates,
} from '../../firebase/firestoreService';
import UnavailableDatesModal from '../ui/UnavailableDatesModal.jsx';
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  getDay,
  isSameDay,
} from 'date-fns';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Schedule() {
  const [date, setDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [selectedUnavailableDates, setSelectedUnavailableDates] = useState([]);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [unavailableMode, setUnavailableMode] = useState('add'); // 'add' or 'remove'
  const [processingUnavailable, setProcessingUnavailable] = useState(false);
  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  const formattedDate = format(date, "EEEE, MMMM d, yyyy");

  useEffect(() => {
    fetchSessions();
    fetchUnavailableDates();
  }, []);

  useEffect(() => {
    if (allSessions.length > 0) {
      filterSessionsByDate(date);
    }
  }, [date, allSessions]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getStudentInterviewForms();
      
      if (!result.success) {
        setError(result.error || "Failed to fetch sessions");
        toast.error("Failed to fetch sessions. Please try again.");
        return;
      }
      
      const forms = result.forms || [];
      
      // Filter forms with dateTime, submissionDate, or followUpDate
      const sessionsData = forms.filter(form => 
        form.dateTime || form.submissionDate || form.followUpDate
      );
      
      // Log for debugging
      console.log("All sessions data:", sessionsData);
      console.log("Sessions with followUpDate:", sessionsData.filter(s => s.followUpDate));
      
      setAllSessions(sessionsData);
      
      // Initially filter by current date
      filterSessionsByDate(date);
      
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setError("Failed to load sessions: " + error.message);
      toast.error("Failed to load sessions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnavailableDates = async () => {
    try {
      const result = await getUnavailableDates();
      console.log("getUnavailableDates result:", result);
      
      if (result && result.success && Array.isArray(result.dates)) {
        // Convert string dates to Date objects
        const dateObjects = result.dates.map(item => {
          try {
            if (!item || !item.date) return null;
            
            return {
              date: new Date(item.date),
              reason: item.reason || ""
            };
          } catch (err) {
            console.warn("Error parsing date:", err);
            return null;
          }
        }).filter(item => item !== null && isValidDate(item.date));
        
        setUnavailableDates(dateObjects);
      } else {
        console.error("Failed to fetch unavailable dates:", result?.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error in fetchUnavailableDates:", error);
    }
  };

 
  const formatSafely = (date, formatString) => {
    try {
      if (!isValidDate(date)) {
        console.warn("Invalid date passed to formatSafely:", date);
        return "Invalid Date";
      }
      return format(date, formatString);
    } catch (error) {
      console.error("Error formatting date:", error, "date:", date, "format:", formatString);
      return "Format Error";
    }
  };
  
  // Then modify your isDateUnavailable function
  const isDateUnavailable = (day) => {
    if (!day || !isValidDate(day)) return false;
    if (!Array.isArray(unavailableDates) || unavailableDates.length === 0) return false;
    
    return unavailableDates.some(item => {
      if (!item || !item.date || !isValidDate(item.date)) return false;
      return isSameDay(item.date, day);
    });
  };

  const handleMarkUnavailable = async () => {
    if (selectedUnavailableDates.length === 0) {
      toast.warning("Please select at least one date");
      return;
    }

    setProcessingUnavailable(true);
    try {
      // Make sure setUnavailableDates is properly imported
      if (typeof setUnavailableDates !== 'function') {
        console.error("setUnavailableDates is not a function. Check your imports.");
        toast.error("System error: Function not available");
        return;
      }
      
      // Safely format dates
      const dateStrings = [];
      for (const date of selectedUnavailableDates) {
        try {
          if (!isValidDate(date)) continue;
          dateStrings.push(formatSafely(date, 'yyyy-MM-dd'));
        } catch (err) {
          console.warn("Error formatting date:", err);
        }
      }
      
      if (dateStrings.length === 0) {
        toast.error("No valid dates selected");
        return;
      }
      
      console.log("Calling setUnavailableDates with:", dateStrings, unavailableReason);
      const result = await setUnavailableDates(dateStrings, unavailableReason);
      console.log("setUnavailableDates result:", result); // Debug log
      
      if (!result) {
        console.error("setUnavailableDates returned undefined");
        toast.error("An error occurred. Please check the console for details.");
        return;
      }
      
      if (result.success) {
        toast.success(result.message || "Dates marked as unavailable");
        setSelectedUnavailableDates([]);
        setUnavailableReason('');
        fetchUnavailableDates(); // Refresh the list
        setShowUnavailableModal(false);
      } else {
        toast.error(result.error || "Failed to mark dates as unavailable");
      }
    } catch (error) {
      console.error("Error marking dates as unavailable:", error);
      toast.error("An error occurred: " + error.message);
    } finally {
      setProcessingUnavailable(false);
    }
  };

  const handleRemoveUnavailable = async () => {
    if (selectedUnavailableDates.length === 0) {
      toast.warning("Please select at least one date to remove");
      return;
    }

    setProcessingUnavailable(true);
    try {
      // Convert Date objects to YYYY-MM-DD format
      const dateStrings = selectedUnavailableDates.map(date => 
        format(date, 'yyyy-MM-dd')
      );
      
      const result = await removeUnavailableDates(dateStrings);
      
      if (result.success) {
        toast.success(result.message);
        setSelectedUnavailableDates([]);
        fetchUnavailableDates(); // Refresh the list
        setShowUnavailableModal(false);
      } else {
        toast.error(`Failed to remove unavailable dates: ${result.error}`);
      }
    } catch (error) {
      console.error("Error removing unavailable dates:", error);
      toast.error("An error occurred while removing unavailable dates");
    } finally {
      setProcessingUnavailable(false);
    }
  };

  const filterSessionsByDate = (selectedDate) => {
    // Format the selected date as YYYY-MM-DD for comparison
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    console.log("Filtering sessions for date:", dateStr);
    
    // Filter sessions for the selected date
    const filteredSessions = allSessions.filter(session => {
      // If this is a follow-up session, only show it on the follow-up date
      if (session.remarks === 'Follow up' && session.followUpDate) {
        try {
          const followUpDate = new Date(session.followUpDate);
          const followUpDateStr = format(followUpDate, 'yyyy-MM-dd');
          
          // Only return true if this is the follow-up date
          return followUpDateStr === dateStr;
        } catch (e) {
          console.error("Error parsing followUpDate:", e);
          return false;
        }
      }
      
      // For non-follow-up sessions or sessions without a follow-up date set:
      
      // Check dateTime field (this will include rescheduled sessions)
      if (session.dateTime) {
        try {
          const sessionDate = new Date(session.dateTime);
          return format(sessionDate, 'yyyy-MM-dd') === dateStr;
        } catch (e) {
          console.error("Error parsing dateTime:", e);
        }
      }
      
      // Check submissionDate field as fallback
      if (session.submissionDate) {
        try {
          const submissionDate = new Date(session.submissionDate);
          return format(submissionDate, 'yyyy-MM-dd') === dateStr;
        } catch (e) {
          console.error("Error parsing submissionDate:", e);
        }
      }
      
      return false;
    });
    
    console.log(`Found ${filteredSessions.length} sessions for ${dateStr}`);
    setSessions(filteredSessions);
    setSelectedSession(null); // Reset selected session when date changes
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
  };

  const getSessionTime = (session) => {
    if (session.dateTime) {
      const date = new Date(session.dateTime);
      return format(date, 'h:mm a');
    }
    if (session.submissionDate) {
      const date = new Date(session.submissionDate);
      return format(date, 'h:mm a');
    }
    return "Time not specified";
  };

  const getSessionTypeLabel = (session) => {
    // If this is a follow-up session, show it as such
    if (session.remarks === 'Follow up' || 
        (session.followUpDate && format(new Date(session.followUpDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))) {
      return "Follow-up";
    }
    if (session.isReferral === true) return "Referral";
    if (session.type === "Referral") return "Referral";
    return "Walk-in";
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'No-show': 
      case 'No Show': return 'bg-orange-100 text-orange-800';
      case 'Rescheduled': return 'bg-purple-100 text-purple-800';
      case 'Follow up': return 'bg-purple-100 text-purple-800';
      default: return 'bg-yellow-100 text-yellow-800'; // Pending
    }
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold">
          {format(currentMonth, 'MMMM/yyyy')}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={prevMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Wk", "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    return (
      <div className="grid grid-cols-8 text-center">
        {days.map((day, i) => (
          <div key={i} className="text-sm font-medium py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;
    
    const dateFormat = "d";
    const rows = [];
    
    let days = eachDayOfInterval({ start: startDate, end: endDate });
    let startingWeekNumber = Math.ceil(parseInt(format(startDate, 'w')));
    
    // Group days by weeks
    const weeks = days.reduce((acc, day) => {
      const weekNumber = parseInt(format(day, 'w'));
      const weekIndex = weekNumber - startingWeekNumber;
      
      if (!acc[weekIndex]) {
        acc[weekIndex] = [];
      }
      
      acc[weekIndex].push(day);
      return acc;
    }, {});
    
    // Helper function to check if a date is unavailable
    const isDateUnavailable = (day) => {
      if (!day) return false;
      
      try {
        const dayString = format(day, 'yyyy-MM-dd');
        
        return unavailableDates.some(item => {
          // Make sure item.date is a valid date before formatting
          if (!(item.date instanceof Date) || isNaN(item.date.getTime())) {
            console.log('Invalid date in unavailableDates:', item);
            return false;
          }
          
          const unavailableDateString = format(item.date, 'yyyy-MM-dd');
          return dayString === unavailableDateString;
        });
      } catch (error) {
        console.error('Error in isDateUnavailable:', error, 'day:', day);
        return false; // Return false on error to prevent breaking the UI
      }
    };
    
    
    // Create rows for each week
    Object.values(weeks).forEach((week, weekIndex) => {
      const weekNumber = startingWeekNumber + weekIndex;
      const daysInWeek = [];
      
      // Add week number cell
      daysInWeek.push(
        <div key={`week-${weekIndex}`} className="text-center py-3 text-sm text-gray-500">
          {weekNumber}
        </div>
      );
      
      // Fill in days for the week
      const daysOfWeek = Array(7).fill(null);
      
      week.forEach(day => {
        const dayOfWeek = getDay(day);
        daysOfWeek[dayOfWeek] = day;
      });
      
      daysOfWeek.forEach((day, i) => {
        const formattedDate = day ? format(day, dateFormat) : "";
        const isCurrentMonth = day ? isSameMonth(day, currentMonth) : false;
        const isCurrentDay = day ? isToday(day) : false;
        const isSelected = day ? isSameDay(day, date) : false;
        const isUnavailable = isDateUnavailable(day);
        
        // Check if this day has sessions (including follow-ups)
        const hasSession = day && allSessions.some(session => {
          // For follow-up sessions, only show dot on the follow-up date
          if (session.remarks === 'Follow up' && session.followUpDate) {
            try {
              const followUpDate = new Date(session.followUpDate);
              return isSameDay(followUpDate, day);
            } catch (e) {
              console.error("Error parsing followUpDate:", e);
              return false;
            }
          }
          
          // For non-follow-up sessions:
          
          // Check regular session dates
          if (session.dateTime) {
            try {
              const sessionDate = new Date(session.dateTime);
              return isSameDay(sessionDate, day);
            } catch (e) {
              console.error("Error parsing dateTime:", e);
            }
          }
          
          if (session.submissionDate) {
            try {
              const submissionDate = new Date(session.submissionDate);
              return isSameDay(submissionDate, day);
            } catch (e) {
              console.error("Error parsing submissionDate:", e);
            }
          }
          
          return false;
        });
        
        daysInWeek.push(
          <div
            key={i}
            onClick={() => day && setDate(day)}
            className={`text-center py-3 cursor-pointer relative ${
              !isCurrentMonth ? "text-gray-300" : 
              isSelected ? "font-bold" : 
              isCurrentDay ? "text-red-500 font-bold" : 
              isUnavailable ? "text-red-400 line-through" : "text-gray-900"
            }`}
          >
            <span className={`${isSelected ? "bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto" : ""}`}>
              {formattedDate}
            </span>
            
            {/* Session indicator */}
            {hasSession && (
              <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></span>
            )}
            
            {/* Unavailable indicator */}
            {isUnavailable && (
              <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full ml-2"></span>
            )}
          </div>
        );
      });
      
      rows.push(
        <div key={weekIndex} className="grid grid-cols-8">
          {daysInWeek}
        </div>
      );
    });
    
    return <div className="border-t border-l">{rows}</div>;
  };

  return (
    <div className="bg-white min-h-screen">
      <AdminNavbar />
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Schedule</h1>
          <button
            onClick={() => {
              setShowUnavailableModal(true);
              setSelectedUnavailableDates([]);
              setUnavailableReason('');
              setUnavailableMode('add');
            }}
            className="px-4 py-2 bg-[#3B021F] text-white rounded-md hover:bg-[#2a0114] transition-colors"
          >
            Manage Unavailable Dates
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button 
              onClick={fetchSessions}
              className="underline ml-2"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
            <div className="flex items-center mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-2 text-gray-700" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <h2 className="text-xl font-semibold">Calendar</h2>
            </div>
            <div className="calendar-container">
              {renderHeader()}
              {renderDays()}
              {renderCells()}
            </div>
            
            {/* Calendar Legend */}
            <div className="mt-4 text-xs text-gray-600 flex flex-wrap gap-4">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                <span>Sessions Scheduled</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                <span>Date Unavailable</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] mr-1">
                  {format(new Date(), 'd')}
                </span>
                <span>Selected Date</span>
              </div>
            </div>
          </div>

          {/* Sessions Section */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
            <h2 className="text-xl font-semibold mb-4">
              Sessions for {formattedDate}
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">No sessions for this day</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedSession?.id === session.id ? 'border-[#3B021F] bg-pink-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{session.studentName || 'Unknown Student'}</h3>
                        <p className="text-sm text-gray-600">{session.courseYearSection || 'No course info'}</p>
                        <p className="text-sm text-gray-600">{getSessionTime(session)}</p>
                        {session.remarks === 'Follow up' && (
                          <p className="text-sm text-purple-600 font-medium">
                            Follow-up Appointment
                          </p>
                        )}
                        {session.status === 'Rescheduled' && (
                          <p className="text-sm text-purple-600 font-medium">
                            {session.remarks?.includes('Rescheduled to') ? session.remarks : 'Rescheduled'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(session.remarks || session.status || 'Pending')}`}>
                          {session.remarks === 'Follow up' ? 'Follow up' : (session.status || 'Pending')}
                        </span>
                        <span className="text-xs mt-1">
                          {getSessionTypeLabel(session)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {selectedSession && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-3">Session Details</h3>
                <div className="mt-2 text-sm space-y-2">
                  <p><strong>Student:</strong> {selectedSession.studentName || 'N/A'}</p>
                  <p><strong>Course:</strong> {selectedSession.courseYearSection || 'N/A'}</p>
                  <p><strong>Contact:</strong> {selectedSession.contactNo || selectedSession.email || 'N/A'}</p>
                  <p><strong>Time:</strong> {getSessionTime(selectedSession)}</p>
                  
                  {selectedSession.remarks === 'Follow up' ? (
                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full ${getStatusClass('Follow up')}`}>
                      Follow-up
                    </span></p>
                  ) : (
                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full ${getStatusClass(selectedSession.status || 'Pending')}`}>
                      {selectedSession.status || 'Pending'}
                    </span></p>
                  )}
                  
                  {selectedSession.followUpDate && (
                    <p><strong>Follow-up Date:</strong> {new Date(selectedSession.followUpDate).toLocaleDateString()}</p>
                  )}
                  
                  {selectedSession.sessionNotes && (
                    <p><strong>Session Notes:</strong> {selectedSession.sessionNotes}</p>
                  )}
                  
                  {selectedSession.isReferral && (
                    <p><strong>Referred by:</strong> {selectedSession.referredBy || selectedSession.facultyName || 'N/A'}</p>
                  )}
                  
                  {selectedSession.remarks && selectedSession.remarks !== 'Follow up' && (
                    <p><strong>Remarks:</strong> {selectedSession.remarks}</p>
                  )}
                  
                  <div className="mt-4 text-gray-500 text-xs italic">
                    <p>* To update session status, please go to the Submissions page</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <UnavailableDatesModal
  showModal={showUnavailableModal}
  onClose={() => setShowUnavailableModal(false)}
  unavailableDates={unavailableDates}
  onDatesUpdated={fetchUnavailableDates}
  isValidDate={isValidDate}
/>
      
    </div>
  );
}

export default Schedule;