import React, { useState, useEffect } from 'react';
import AdminNavbar from '../ui/adminnavbar';
import { getStudentInterviewForms, updateFormStatus } from '../../firebase/firestoreService';

function SubmittedFormsManagement() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  // Fetch forms on component mount
  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    const result = await getStudentInterviewForms();
    
    if (result.success) {
      // Map the form data to match your UI structure
      const processedForms = result.forms.map(form => {
        // Extract course and year from courseYearSection
        let course = 'Unknown';
        let year = 'Unknown';
        
        if (form.courseYearSection) {
          const parts = form.courseYearSection.split(' ');
          if (parts.length > 0) {
            course = parts[0];
            // Try to extract year (e.g., "1st", "2nd", etc.)
            const yearMatch = form.courseYearSection.match(/(\d+)[a-zA-Z]{2}/);
            if (yearMatch) {
              year = yearMatch[0];
            } else if (parts.length > 1) {
              year = parts[1];
            }
          }
        }

        return {
          id: form.id,
          name: form.studentName || 'Unknown',
          course: course,
          year: year,
          type: form.type || 'Walk-in',
          referral: form.referral || 'Self',
          status: form.status || 'Pending',
          remarks: form.remarks || '',
          isReferral: form.isReferral || false,
          // Add all the form data for the modal view
          details: {
            mode: form.isReferral ? 'Referral' : 'Non-Referral',
            fullName: form.studentName || 'Unknown',
            email: form.email || 'Unknown',
            courseYear: form.courseYearSection || 'Unknown',
            department: 'College of Computer Studies', // Default or fetch from DB
            id: '2200000321', // Default or fetch from DB
            dob: form.dateOfBirth || 'Unknown',
            ageSex: form.ageSex || 'Unknown',
            contact: form.contactNo || 'Unknown',
            address: form.presentAddress || 'Unknown',
            emergencyContact: `${form.emergencyContactPerson || 'Unknown'} - ${form.emergencyContactNo || 'Unknown'}`,
            date: new Date(form.dateTime).toLocaleDateString() || 'Unknown',
            time: new Date(form.dateTime).toLocaleTimeString() || 'Unknown',
            // Map concern areas to readable text
            personal: mapConcernAreasToText(form.areasOfConcern?.personal, 'personal'),
            interpersonal: mapConcernAreasToText(form.areasOfConcern?.interpersonal, 'interpersonal'),
            grief: ['None'], // Default value
            academics: mapConcernAreasToText(form.areasOfConcern?.academic, 'academic'),
            family: mapConcernAreasToText(form.areasOfConcern?.family, 'family'),
          }
        };
      });
      
      setForms(processedForms);
    } else {
      setError("Failed to fetch forms. Please try again.");
    }
    
    setLoading(false);
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

  const handleAccept = async () => {
    if (!selectedStudent) return;
    
    const result = await updateFormStatus(selectedStudent.id, 'Reviewed', 'Terminated');
    
    if (result.success) {
      // Update the local state to reflect the change
      setForms(forms.map(form => 
        form.id === selectedStudent.id 
          ? { ...form, status: 'Reviewed', remarks: 'Terminated' } 
          : form
      ));
      
      closeModal();
    } else {
      alert("Failed to update session status. Please try again.");
    }
  };

  const handleReschedule = async () => {
    if (!selectedStudent) return;
    
    const result = await updateFormStatus(selectedStudent.id, 'Rescheduled', 'Pending reschedule');
    
    if (result.success) {
      // Update the local state to reflect the change
      setForms(forms.map(form => 
        form.id === selectedStudent.id 
          ? { ...form, status: 'Rescheduled', remarks: 'Pending reschedule' } 
          : form
      ));
      
      closeModal();
    } else {
      alert("Failed to update session status. Please try again.");
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
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Course</th>
                <th className="text-left py-3 px-4">Year</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Referral</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {nonReferralForms.length > 0 ? (
                nonReferralForms.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b cursor-pointer hover:bg-gray-200"
                    onClick={() => openModal(student)}
                  >
                    <td className="py-3 px-4">{student.name}</td>
                    <td className="py-3 px-4">{student.course}</td>
                    <td className="py-3 px-4">{student.year}</td>
                    <td className="py-3 px-4">{student.type}</td>
                    <td className="py-3 px-4">{student.referral}</td>
                    <td className="py-3 px-4">{student.status}</td>
                    <td className="py-3 px-4">{student.remarks}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-gray-500">
                    No non-referral submissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-6 pt-12">
        <h1 className="text-2xl font-bold mb-4">Referral</h1>
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Course</th>
                <th className="text-left py-3 px-4">Year</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Referral</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {referralForms.length > 0 ? (
                referralForms.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b cursor-pointer hover:bg-gray-200"
                    onClick={() => openModal(student)}
                  >
                    <td className="py-3 px-4">{student.name}</td>
                    <td className="py-3 px-4">{student.course}</td>
                    <td className="py-3 px-4">{student.year}</td>
                    <td className="py-3 px-4">{student.type}</td>
                    <td className="py-3 px-4">{student.referral}</td>
                    <td className="py-3 px-4">{student.status}</td>
                    <td className="py-3 px-4">{student.remarks}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-gray-500">
                    No referral submissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Styled to match the screenshot */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-11/12 max-w-2xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">View History Details</h2>
            
            <div>
              <p><strong>Mode of Counseling:</strong> {selectedStudent.details.mode}</p>
              <p><strong>Full name:</strong> {selectedStudent.details.fullName}</p>
              <p><strong>UIC Email Address:</strong> {selectedStudent.details.email}</p>
              <p><strong>Course & Year:</strong> {selectedStudent.details.courseYear}</p>
              <p><strong>College Department:</strong> {selectedStudent.details.department}</p>
              <p><strong>UIC ID:</strong> {selectedStudent.details.id}</p>
              <p><strong>Date of Birth:</strong> {selectedStudent.details.dob}</p>
              <p><strong>Age/Sex:</strong> {selectedStudent.details.ageSex}</p>
              <p><strong>Contact No.:</strong> {selectedStudent.details.contact}</p>
              <p><strong>Present Address:</strong> {selectedStudent.details.address}</p>
              <p><strong>Emergency contact person and no.:</strong> {selectedStudent.details.emergencyContact}</p>
              <p><strong>Date:</strong> {selectedStudent.details.date}</p>
              <p><strong>Time:</strong> {selectedStudent.details.time}</p>

              <h3 className="text-lg font-bold mt-4">Personal</h3>
              <ul>
                {selectedStudent.details.personal.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <h3 className="text-lg font-bold mt-4">Interpersonal</h3>
              <ul>
                {selectedStudent.details.interpersonal.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <h3 className="text-lg font-bold mt-4">Grief/Bereavement</h3>
              <ul>
                {selectedStudent.details.grief.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <h3 className="text-lg font-bold mt-4">Academics</h3>
              <ul>
                {selectedStudent.details.academics.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <h3 className="text-lg font-bold mt-4">Family</h3>
              <ul>
                {selectedStudent.details.family.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAccept}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleReschedule}
                className="bg-[#3B021F] text-white px-4 py-2 rounded-md hover:bg-[#4B122F] transition-colors"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmittedFormsManagement;