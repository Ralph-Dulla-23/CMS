import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { setUnavailableDates, removeUnavailableDates } from '../../firebase/firestoreService';
import { toast } from 'react-toastify';

function UnavailableDatesModal({ 
  showModal, 
  onClose, 
  unavailableDates, 
  onDatesUpdated,
  isValidDate
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedUnavailableDates, setSelectedUnavailableDates] = useState([]);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [unavailableMode, setUnavailableMode] = useState('add'); // 'add' or 'remove'
  const [processingUnavailable, setProcessingUnavailable] = useState(false);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleMarkUnavailable = async () => {
    if (selectedUnavailableDates.length === 0) {
      toast.warning("Please select at least one date");
      return;
    }

    setProcessingUnavailable(true);
    try {
      // Safely format dates
      const dateStrings = selectedUnavailableDates.map(date => 
        format(date, 'yyyy-MM-dd')
      );
      
      console.log("Calling setUnavailableDates with:", dateStrings, unavailableReason);
      const result = await setUnavailableDates(dateStrings, unavailableReason);
      
      if (result && result.success) {
        toast.success(result.message || "Dates marked as unavailable");
        setSelectedUnavailableDates([]);
        setUnavailableReason('');
        onDatesUpdated(); // Callback to refresh dates in parent component
        onClose();
      } else {
        toast.error(result?.error || "Failed to mark dates as unavailable");
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
      
      if (result && result.success) {
        toast.success(result.message || "Dates removed successfully");
        setSelectedUnavailableDates([]);
        onDatesUpdated(); // Callback to refresh dates in parent component
        onClose();
      } else {
        toast.error(result?.error || "Failed to remove unavailable dates");
      }
    } catch (error) {
      console.error("Error removing unavailable dates:", error);
      toast.error("An error occurred while removing unavailable dates");
    } finally {
      setProcessingUnavailable(false);
    }
  };

  const isDateUnavailable = (day) => {
    if (!day || !isValidDate(day)) return false;
    if (!Array.isArray(unavailableDates)) return false;
    
    return unavailableDates.some(item => {
      if (!item || !item.date || !isValidDate(item.date)) return false;
      return isSameDay(item.date, day);
    });
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold mb-4">Manage Unavailable Dates</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Calendar for selecting dates */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Dates</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setUnavailableMode('add')}
                  className={`px-3 py-1 rounded text-sm ${unavailableMode === 'add' ? 'bg-[#3B021F] text-white' : 'bg-gray-200'}`}
                >
                  Add
                </button>
                <button
                  onClick={() => setUnavailableMode('remove')}
                  className={`px-3 py-1 rounded text-sm ${unavailableMode === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
                >
                  Remove
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {unavailableMode === 'add'
                ? "Select dates that are unavailable for counseling. These dates will be disabled in the student request form."
                : "Select unavailable dates to remove from the list."}
            </p>
            
            {/* Calendar for selecting unavailable dates */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Days of week header */}
              <div className="grid grid-cols-7 text-center text-xs">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
                  <div key={i} className="py-1 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1 mt-1">
                {eachDayOfInterval({
                  start: startOfMonth(currentMonth),
                  end: endOfMonth(currentMonth)
                }).map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isUnavailable = isDateUnavailable(day);
                  
                  const isSelected = selectedUnavailableDates.some(selectedDate => 
                    format(selectedDate, 'yyyy-MM-dd') === dateStr
                  );
                  
                  // For 'add' mode, we can only select available dates
                  // For 'remove' mode, we can only select unavailable dates
                  const isSelectable = (unavailableMode === 'add' && !isUnavailable) || 
                                      (unavailableMode === 'remove' && isUnavailable);
                  
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!isSelectable) return;
                        
                        // Toggle selection
                        if (isSelected) {
                          setSelectedUnavailableDates(selectedUnavailableDates.filter(selectedDate => 
                            format(selectedDate, 'yyyy-MM-dd') !== dateStr
                          ));
                        } else {
                          setSelectedUnavailableDates([...selectedUnavailableDates, day]);
                        }
                      }}
                      className={`
                        h-8 flex items-center justify-center text-sm rounded-full
                        ${isSelectable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}
                        ${isUnavailable ? 'text-red-500' : ''}
                        ${isSelected ? 'bg-[#3B021F] text-white' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Reason input (only for add mode) */}
            {unavailableMode === 'add' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={unavailableReason}
                  onChange={(e) => setUnavailableReason(e.target.value)}
                  placeholder="e.g., Holiday, Training, Personal Leave"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            )}
            
            {/* Action button */}
            <div className="mt-4">
              {unavailableMode === 'add' ? (
                <button
                  onClick={handleMarkUnavailable}
                  disabled={processingUnavailable || selectedUnavailableDates.length === 0}
                  className="w-full py-2 bg-[#3B021F] text-white rounded-md hover:bg-[#2a0114] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingUnavailable ? "Processing..." : "Mark as Unavailable"}
                </button>
              ) : (
                <button
                  onClick={handleRemoveUnavailable}
                  disabled={processingUnavailable || selectedUnavailableDates.length === 0}
                  className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingUnavailable ? "Processing..." : "Remove Selected Dates"}
                </button>
              )}
            </div>
          </div>
          
          {/* Right Column - List of unavailable dates */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Currently Unavailable Dates</h3>
            
            {unavailableDates.length === 0 ? (
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <p className="text-gray-500">No unavailable dates set</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {unavailableDates
                  .sort((a, b) => a.date - b.date)
                  .map((item, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="font-semibold text-red-800">
                        {format(item.date, 'EEEE, MMMM d, yyyy')}
                      </p>
                      {item.reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {item.reason}
                        </p>
                      )}
                    </div>
                  ))
                }
              </div>
            )}
            
            <div className="mt-4 text-sm text-gray-500">
              <p>* Students will not be able to select these dates when requesting counseling sessions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnavailableDatesModal;