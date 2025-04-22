import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentNavbar from "../ui/Studentnavbar";
import { getStudentForms } from "../../firebase/firestoreService";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedFullName = localStorage.getItem("userFullName");
    const storedEmail = localStorage.getItem("userEmail");
    console.log("🟢 Retrieved Full Name in Dashboard:", storedFullName);
    console.log("🟢 Retrieved Email in Dashboard:", storedEmail);

    if (storedFullName) {
      setFullName(storedFullName);
    } else {
      console.warn("⚠ Full Name not found in localStorage.");
    }

    if (storedEmail) {
      setUserEmail(storedEmail);
      fetchStudentData(storedEmail);
    } else {
      console.warn("⚠ Email not found in localStorage.");
      setLoading(false);
    }
  }, []);

  // In the fetchStudentData function in Dashboard.js
  const fetchStudentData = async (email) => {
    try {
      setLoading(true);
      const result = await getStudentForms(email);
      
      if (result.success) {
        console.log("Retrieved student forms:", result.forms);
        
        // Process the forms into appointments and notifications
        const upcomingAppointments = [];
        const studentNotifications = [];
        
        result.forms.forEach(form => {
          // Get appointment date and time from the appropriate fields
          const appointmentDate = form.followUpDate || form.scheduledDate || form.dateTime;
          const appointmentTime = form.followUpTime || 
                                (form.followUpDateTime ? new Date(form.followUpDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                                new Date(appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
          
          // Add to appointments if it has a status of Confirmed, Pending, or Rescheduled
          if (form.status === 'Confirmed' || form.status === 'Pending' || form.status === 'Rescheduled' || form.followUpDate) {
            upcomingAppointments.push({
              id: form.id,
              title: form.type || 'Counseling Session',
              date: new Date(appointmentDate).toLocaleDateString(),
              time: appointmentTime,
              status: form.status || 'Pending',
              type: form.type || 'Walk-in',
              isFollowUp: form.isFollowUp || false
            });
          }
          
          // Add to notifications if:
          // 1. Status changed to Confirmed (new appointment)
          // 2. Status changed to Rescheduled
          // 3. It's a follow-up appointment
          if (form.status === 'Confirmed' || form.status === 'Rescheduled' || form.followUpDate) {
            let notificationMessage = '';
            let notificationType = '';
            let notificationTitle = '';
            
            // Check if this is explicitly a follow-up appointment
            // It's a follow-up if: remarks = 'Follow up' OR isFollowUp = true
            const isActuallyFollowUp = 
              form.remarks === 'Follow up' || 
              form.isFollowUp === true;
            
            if (isActuallyFollowUp) {
              notificationType = 'followup';
              notificationTitle = 'Follow-up Session';
              notificationMessage = `Your follow-up session has been scheduled for ${new Date(form.followUpDate).toLocaleDateString()}`;
            } else if (form.status === 'Rescheduled') {
              notificationType = 'rescheduled';
              notificationTitle = 'Rescheduled Session';
              notificationMessage = `Your session has been rescheduled for ${new Date(form.scheduledDate || form.dateTime).toLocaleDateString()}`;
            } else {
              notificationType = 'confirmed';
              notificationTitle = 'Appointment Confirmed';
              notificationMessage = `Your counseling appointment has been confirmed for ${new Date(form.scheduledDate || form.dateTime).toLocaleDateString()}`;
            }
            
            studentNotifications.push({
              id: form.id,
              type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              date: form.followUpDate || form.scheduledDate || form.dateTime,
              time: appointmentTime
            });
          }
        });
        
        setAppointments(upcomingAppointments);
        setNotifications(studentNotifications);
      } else {
        console.error("Error fetching student data:", result.error);
        setError("Failed to load your appointments. Please try again later.");
      }
    } catch (err) {
      console.error("Error in fetchStudentData:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      console.error("Date formatting error:", err);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <StudentNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#340013] mx-auto"></div>
            <p className="mt-4">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <StudentNavbar />
      
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

      {/* Welcome Text */}
      <h1 className="text-2xl font-bold mt-16 px-16">Welcome {fullName || "Guest"}</h1>

      {error && (
        <div className="mx-16 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={() => fetchStudentData(userEmail)}
            className="underline ml-2"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 px-16">
        {/* Schedule Card */}
        <div className="border p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Upcoming Schedule</h2>
          {appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border-l-4 border-[#340013] pl-4 py-2">
                  <p className="font-semibold">{appointment.title}</p>
                  <p className="text-gray-600">
                    Date: {appointment.date} <br />
                    Time: {appointment.time}
                  </p>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'Rescheduled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No upcoming appointments scheduled.</p>
          )}
        </div>

        {/* Notifications Card */}
        {/* Notifications Card */}
<div className="border p-6 rounded-lg shadow-md">
  <h2 className="text-xl font-bold mb-4">Notifications</h2>
  {notifications.length > 0 ? (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div key={notification.id} className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#340013] rounded-md flex-shrink-0 mt-1"></div>
          <div>
            <p className="font-semibold">
              {notification.title || (notification.type === 'rescheduled' ? 'Rescheduled Session' : 
                notification.type === 'followup' ? 'Follow-up Session' : 'Appointment Confirmed')}
            </p>
            <p className="text-gray-600 text-sm">
              {notification.message} <br />
              Time: {notification.time}
            </p>
            <p className="text-sm mt-2 italic">
              This session has been automatically confirmed. Please attend at the scheduled time.
            </p>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-gray-500 italic">No new notifications.</p>
  )}
</div>
      </div>
    </div>
  );
}