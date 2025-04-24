import React, { useState, useEffect } from 'react';
import AdminNavbar from '../ui/adminnavbar';
import { getActiveInterviewForms, updateFormStatus } from '../../firebase/firestoreService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StudentDetailsModal from '../ui/studentdetailsModal'; 

function SubmittedFormsManagement() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  // Create a separate state for dropdown values
  const [dropdownValues, setDropdownValues] = useState({});
  const [showFollowUpScheduler, setShowFollowUpScheduler] = useState(false);
  const [currentFormId, setCurrentFormId] = useState(null);
  // Add these with your other state variables
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');

  // Helper function to add proper suffix to year number
  const getYearSuffix = (num) => {
    if (num === 1) return '1st';
    if (num === 2) return '2nd';
    if (num === 3) return '3rd';
    if (num >= 4) return `${num}th`;
    return 'Unknown';
  };

  // Fetch forms on component mount
  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      // Use the updated function
      const result = await getActiveInterviewForms();
      
      if (result.success) {
        console.log("Active forms fetched:", result.forms.length);
        
        // Process all forms with more robust handling of missing fields
        const processedForms = result.forms.map(form => {
          // Extract course and year from courseYearSection with fallbacks
          let course = 'Unknown';
          let year = 'Unknown';
          
          if (form.courseYearSection) {
            // Try different patterns to extract course and year
            // First, check if it contains a hyphen (like "BCSO-3A")
            if (form.courseYearSection.includes('-')) {
              const parts = form.courseYearSection.split('-');
              course = parts[0] || 'Unknown';
              
              // Extract year from the second part (e.g., "3A")
              if (parts[1]) {
                const yearDigits = parts[1].match(/\d+/);
                if (yearDigits) {
                  const yearNum = parseInt(yearDigits[0]);
                  year = getYearSuffix(yearNum);
                }
              }
            } 
            // Try to match standard format (e.g., "CS 101")
            else {
              const parts = form.courseYearSection.split(' ');
              if (parts.length > 0) {
                course = parts[0];
                
                // Look for year in the entire string
                const yearDigits = form.courseYearSection.match(/\d+/);
                if (yearDigits) {
                  const yearNum = parseInt(yearDigits[0]);
                  year = getYearSuffix(yearNum);
                } else if (parts.length > 1) {
                  year = parts[1];
                }
              }
            }
          }

          return {
            id: form.id,
            name: form.studentName || form.name || 'Unknown',
            course: course,
            year: year,
            type: form.type || 'Walk-in',
            referral: form.referral || 'Self',
            remarks: form.remarks || '',
            status: form.status || 'Pending',
            isReferral: form.isReferral === true, // Convert to boolean
            dateTime: form.dateTime || form.submissionDate || new Date().toISOString(),
            followUpDate: form.followUpDate,
            // Add all the form data for the modal view
            details: {
              mode: form.isReferral === true ? 'Referral' : 'Non-Referral',
              fullName: form.studentName || form.name || 'Unknown',
              email: form.email || 'Unknown',
              courseYear: form.courseYearSection || 'Unknown',
              department: getDepartmentFromCourse(course),
              id: form.studentId || form.id || '2200000321',
              dob: form.dateOfBirth || 'Unknown',
              ageSex: form.ageSex || 'Unknown',
              contact: form.contactNo || 'Unknown',
              address: form.presentAddress || 'Unknown',
              emergencyContact: `${form.emergencyContactPerson || 'Unknown'} - ${form.emergencyContactNo || 'Unknown'}`,
              date: form.dateTime ? new Date(form.dateTime).toLocaleDateString() : 'Unknown',
              time: form.dateTime ? new Date(form.dateTime).toLocaleTimeString() : 'Unknown',
              // Map concern areas to readable text with safeguards
              personal: mapConcernAreasToText(form.areasOfConcern?.personal, 'personal'),
              interpersonal: mapConcernAreasToText(form.areasOfConcern?.interpersonal, 'interpersonal'),
              grief: ['None'],
              academics: mapConcernAreasToText(form.areasOfConcern?.academic, 'academic'),
              family: mapConcernAreasToText(form.areasOfConcern?.family, 'family'),
            }
          };
        });
        
        // Initialize dropdown values
        const initialDropdownValues = {};
        processedForms.forEach(form => {
          initialDropdownValues[form.id] = '';
        });
        setDropdownValues(initialDropdownValues);
        
        setForms(processedForms);
        console.log("Forms ready for display:", processedForms.length);
      } else {
        setError("Failed to fetch forms. Please try again.");
        toast.error("Failed to fetch forms. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
      setError("An error occurred while fetching forms.");
      toast.error("An error occurred while fetching forms: " + error.message);
    } finally {
      setLoading(false);
    }
  };

// When Follow-up is selected from dropdown
const handleFollowUpSelection = (formId) => {
  setCurrentFormId(formId);
  setShowFollowUpScheduler(true);
};

// When follow-up is scheduled
const handleFollowUpScheduled = (date, time) => {
  handleRemarkChange(currentFormId, 'Follow up', date, '', false, time);
  setShowFollowUpScheduler(false);
  setCurrentFormId(null);
};

 // Helper function to determine department from course code
const getDepartmentFromCourse = (courseCode) => {
  // Extract the program/degree code from the course code
  // This assumes the course code starts with the program abbreviation
  const programCode = courseCode.split(' ')[0]; // Get first part before any spaces
  
  // Map program codes to their respective colleges
  const collegeMap = {
    // College of Accounting and Business Education (CABE)
    'BSA': 'College of Accounting and Business Education',
    'BSMA': 'College of Accounting and Business Education', // Management Accounting
    'BSAIS': 'College of Accounting and Business Education', // Accounting Information System
    'BSBA': 'College of Accounting and Business Education', // Business Administration
    'BSREM': 'College of Accounting and Business Education', // Real Estate Management
    
    // College of Arts and Humanities (CAH)
    'AB': 'College of Arts and Humanities',
    'ABCOM': 'College of Arts and Humanities', // Communication
    'ABELS': 'College of Arts and Humanities', // English Language Studies
    'ABPhilo': 'College of Arts and Humanities', // Philosophy
    'ABPsych': 'College of Arts and Humanities', // Psychology
    
    // College of Computer Studies (CCS)
    'BSCS': 'College of Computer Studies',
    'BSIS': 'College of Computer Studies', // Information Systems
    'BSIT': 'College of Computer Studies', // Information Technology
    
    // College of Engineering and Architecture (CEA)
    'BSArch': 'College of Engineering and Architecture', // Architecture
    'BSCE': 'College of Engineering and Architecture', // Civil Engineering
    'BSCpE': 'College of Engineering and Architecture', // Computer Engineering
    'BSECE': 'College of Engineering and Architecture', // Electronics Engineering
    
    // College of Human Environmental Sciences and Food Studies (CHESFS)
    'BSND': 'College of Human Environmental Sciences and Food Studies', // Nutrition and Dietetics
    'BSHRM': 'College of Human Environmental Sciences and Food Studies', // Hotel Restaurant Management
    'BSTM': 'College of Human Environmental Sciences and Food Studies', // Tourism Management
    
    // College of Medical and Biological Science (CMBS)
    'BSBio': 'College of Medical and Biological Science', // Biology
    'BSMLS': 'College of Medical and Biological Science', // Medical Laboratory Science
    
    // College of Music (CM)
    'BM': 'College of Music',
    
    // College of Nursing (CN)
    'BSN': 'College of Nursing', // Nursing
    
    // College of Pharmacy and Chemistry (CPC)
    'BSP': 'College of Pharmacy and Chemistry', // Pharmacy
    'BSChem': 'College of Pharmacy and Chemistry', // Chemistry
    
    // College of Teacher Education (CTE)
    'BECE': 'College of Teacher Education', // Early Childhood Education
    'BEEd': 'College of Teacher Education', // Elementary Education
    'BSEd': 'College of Teacher Education', // Secondary Education
    'BSNE': 'College of Teacher Education', // Special Needs Education
    'BPE': 'College of Teacher Education', // Physical Education
  };

  // Check for exact matches first
  if (collegeMap[programCode]) {
    return collegeMap[programCode];
  }
  
  // For codes that might be variations or not exact matches
  // Check if the course code starts with any of the keys in the collegeMap
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

  return 'Unknown College'; // Default if no match is found
};

  // Helper function to map concern codes to readable text
  const mapConcernAreasToText = (concerns, category) => {
    if (!concerns || !Array.isArray(concerns) || concerns.length === 0) {
      return ['None'];
    }

    const mappings = {
      personal: {
        'notConfident': 'I do not feel confident about myself',
        'hardTimeDecisions': 'I have a hard time making decisions',
        'problemSleeping': 'I have a problem with sleeping',
        'moodNotStable': 'I have noticed that my mood is not stable'
      },
      interpersonal: {
        'beingBullied': 'I am being bullied',
        'cannotHandlePeerPressure': 'I cannot handle peer pressure',
        'difficultyGettingAlong': 'I have difficulty getting along with others'
      },
      academic: {
        'overlyWorriedAcademic': 'I am overly worried about my academic performance',
        'notMotivatedStudy': 'I am not motivated to study',
        'difficultyUnderstanding': 'I have difficulty understanding the class lessons'
      },
      family: {
        'hardTimeDealingParents': 'I have a hard time dealing with my parents/guardian\'s expectations and demands',
        'difficultyOpeningUp': 'I have difficulty opening up to family member/s',
        'financialConcerns': 'Our family is having financial concerns'
      }
    };

    return concerns.map(concern => mappings[category][concern] || concern);
  };

  const openModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(false);
  };

  // Handler for when a remark is selected
 // Update handleRemarkChange in SubmittedFormsManagement
// Update handleRemarkChange in SubmittedFormsManagement
const handleRemarkChange = async (formId, newRemark, followUpDate = null, sessionNotes = '', isDropdownChangeOnly = false, followUpTime = null) => {
  // Add debugging logs
  console.log("handleRemarkChange called with:", { formId, newRemark, followUpDate, sessionNotes, isDropdownChangeOnly, followUpTime });
  
  // If this is just a dropdown change (not the final submit), just update the state
  if (isDropdownChangeOnly) {
    setDropdownValues(prev => ({
      ...prev,
      [formId]: newRemark
    }));
    return;
  }

  try {
    setUpdatingId(formId);
    
    // Find the current form to determine what stage we're in
    const currentForm = forms.find(form => form.id === formId);
    
    // STAGE 1: Initial Confirmation (change status to Confirmed)
    if (newRemark === 'Confirmed' && (!currentForm.status || currentForm.status === 'Pending')) {
      const additionalData = {
        status: 'Confirmed',
        confirmedAt: new Date().toISOString()
      };
      
      if (sessionNotes && sessionNotes.trim() !== '') {
        additionalData.sessionNotes = sessionNotes;
      }
      
      const result = await updateFormStatus(formId, 'Confirmed', null, additionalData);
      
      if (result.success) {
        // Update form in the list with new status
        setForms(forms.map(form => 
          form.id === formId 
            ? { 
                ...form, 
                status: 'Confirmed',
                sessionNotes: sessionNotes || form.sessionNotes
              } 
            : form
        ));
        
        toast.success("Appointment confirmed successfully!", {
          position: "top-right",
          autoClose: 3000
        });
        
        if (isModalOpen) {
          closeModal();
        }
      } else {
        toast.error("Failed to confirm appointment: " + (result.error || "Unknown error"));
      }
    }
    
    // STAGE 2: Follow-up Scheduling
    else if (newRemark === 'Follow up') {
      // Check if followUpDate exists and is not empty
      if (!followUpDate || followUpDate.trim() === '') {
        console.log("Follow-up date is missing:", followUpDate);
        toast.error("Please select a follow-up date");
        return;
      }
      
      // Check if followUpTime exists and is not empty
      if (!followUpTime || followUpTime.trim() === '') {
        console.log("Follow-up time is missing:", followUpTime);
        toast.error("Please select a follow-up time");
        return;
      }
      
      console.log("Proceeding with follow-up, date:", followUpDate, "time:", followUpTime);
      
      // Combine date and time into a single datetime string
      const followUpDateTime = `${followUpDate}T${followUpTime}`;
      
      // Create an object with additional data to pass to updateFormStatus
      const additionalData = {
        followUpDate: followUpDate,
        followUpTime: followUpTime,
        followUpDateTime: followUpDateTime,
        status: 'Confirmed', // Automatically confirm the follow-up
        remarks: newRemark,
        isFollowUp: true,
        autoConfirmed: true
      };
      
      if (sessionNotes && sessionNotes.trim() !== '') {
        additionalData.sessionNotes = sessionNotes;
      }
      
      // Update the form with remark and additional data
      // We're not moving it to history, so pass null as the status
      const result = await updateFormStatus(formId, null, newRemark, additionalData);
      
      if (result.success) {
        // Update form in the list with new remark and follow-up date/time
        setForms(forms.map(form => 
          form.id === formId 
            ? { 
                ...form, 
                remarks: newRemark,
                followUpDate: followUpDate,
                followUpTime: followUpTime,
                followUpDateTime: followUpDateTime,
                status: 'Confirmed', // Update status to Confirmed
                sessionNotes: sessionNotes || form.sessionNotes
              } 
            : form
        ));
        
        // Reset dropdown value
        setDropdownValues(prev => ({
          ...prev,
          [formId]: ''
        }));
        
        // Show success toast with formatted date and time
        const formattedDate = new Date(followUpDate).toLocaleDateString();
        const formattedTime = followUpTime;
        toast.success(`Follow-up scheduled for ${formattedDate} at ${formattedTime}`, {
          position: "top-right",
          autoClose: 3000
        });
        
        // Close the modal if it's open
        if (isModalOpen) {
          closeModal();
        }
      } else {
        toast.error("Failed to schedule follow-up: " + (result.error || "Unknown error"));
      }
    } 
    
    // STAGE 3: Post-Session Update (Attended, No Show, etc.)
    else {
      // For all other remarks, move to history by marking as completed
      const additionalData = {};
      if (sessionNotes && sessionNotes.trim() !== '') {
        additionalData.sessionNotes = sessionNotes;
      }
      
      const result = await updateFormStatus(formId, 'Completed', newRemark, additionalData);
      
      if (result.success) {
        // Remove the form from the list
        setForms(forms.filter(form => form.id !== formId));
        
        // Remove from dropdown values
        const newDropdownValues = {...dropdownValues};
        delete newDropdownValues[formId];
        setDropdownValues(newDropdownValues);
        
        // Show success toast
        toast.success(`Session moved to history as ${newRemark}`, {
          position: "top-right",
          autoClose: 3000
        });
        
        // Close the modal if it's open
        if (isModalOpen) {
          closeModal();
        }
      } else {
        toast.error("Failed to update status: " + (result.error || "Unknown error"));
      }
    }
  } catch (error) {
    console.error("Error updating remark:", error);
    toast.error("An error occurred: " + error.message);
  } finally {
    setUpdatingId(null);
  }
};

  // Filter forms by referral type
  const nonReferralForms = forms.filter(form => !form.isReferral);
  const referralForms = forms.filter(form => form.isReferral);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <AdminNavbar />
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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

      {error && (
        <div className="max-w-8xl mx-auto mt-4 px-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <button 
              onClick={fetchForms}
              className="underline ml-2"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
  
      <div className="max-w-8xl mx-auto px-6 pt-12">
        <h1 className="text-2xl font-bold mb-6">Non-Referral</h1>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full bg-white">
            <thead className="bg-[#3A0323] border-b text-white">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Course</th>
                <th className="text-left py-3 px-4">Year</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Referral</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nonReferralForms.length > 0 ? (
                nonReferralForms.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b hover:bg-gray-200"
                  >
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.name}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.course}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.year}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.type}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.referral}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={dropdownValues[student.id] || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Update dropdown value first
                            setDropdownValues(prev => ({
                              ...prev,
                              [student.id]: e.target.value
                            }));
                            // Then process the change
                            handleRemarkChange(student.id, e.target.value);
                          }
                        }}
                        className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        onClick={(e) => e.stopPropagation()}
                        disabled={updatingId === student.id}
                      >
                        <option value="">Select Remarks</option>
                        <option value="Attended">Attended</option>
                        <option value="No Show">No Show</option>
                        <option value="No Response">No Response</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Follow up">Follow-up</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-4 text-center text-gray-500">
                    No non-referral submissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-6 pt-12">
        <h1 className="text-2xl font-bold mb-6">Non-Referral</h1>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full bg-white">
          <thead className="bg-[#3A0323] border-b text-white">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Course</th>
                <th className="text-left py-3 px-4">Year</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Referral</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {referralForms.length > 0 ? (
                referralForms.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b hover:bg-gray-200"
                  >
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.name}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.course}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.year}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.type}
                    </td>
                    <td className="py-3 px-4 cursor-pointer" onClick={() => openModal(student)}>
                      {student.referral}
                    </td>
                    <td className="py-3 px-4">
                    <select
                        value={dropdownValues[student.id] || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Update dropdown value first
                            setDropdownValues(prev => ({
                              ...prev,
                              [student.id]: e.target.value
                            }));
                            
                            // Don't immediately process the change for the dropdown in the table
                            // Only update the dropdown value, not the actual form
                            handleRemarkChange(student.id, e.target.value, null, null, true);
                          }
                        }}
                        className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        onClick={(e) => e.stopPropagation()}
                        disabled={updatingId === student.id}
                      >
                        <option value="">Select Remarks</option>
                        <option value="Attended">Attended</option>
                        <option value="No Show">No Show</option>
                        <option value="No Response">No Response</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Follow up">Follow-up</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-4 text-center text-gray-500">
                    No referral submissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Student Details Modal */}
{isModalOpen && selectedStudent && (
  <StudentDetailsModal
    student={selectedStudent}
    onClose={closeModal}
    handleRemarkChange={(formId, remark, followUpDate, sessionNotes, isDropdownChangeOnly, followUpTime) => {
      // Make sure all parameters are passed through
      handleRemarkChange(formId, remark, followUpDate, sessionNotes, isDropdownChangeOnly, followUpTime);
    }}
    updatingId={updatingId}
    dropdownValue={dropdownValues[selectedStudent.id] || ''}
  />
)}

{/* Follow-up Scheduler Modal */}
{showFollowUpScheduler && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white w-96 rounded-lg shadow-lg p-6 relative">
      <button
        onClick={() => setShowFollowUpScheduler(false)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <span className="sr-only">Close</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <h2 className="text-xl font-bold mb-4">Schedule Follow-up</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
        <input
          type="date"
          className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setFollowUpDate(e.target.value)}
          required
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Time</label>
        <input
          type="time"
          className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={(e) => setFollowUpTime(e.target.value)}
          required
        />
      </div>
      
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            if (followUpDate && followUpTime) {
              handleFollowUpScheduled(followUpDate, followUpTime);
            } else {
              toast.error("Please select both date and time");
            }
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Schedule Follow-up
        </button>
        <button
          onClick={() => setShowFollowUpScheduler(false)}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
</div>

    
  );
}

export default SubmittedFormsManagement;