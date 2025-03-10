import React from "react";

export default function ProfilePage({ onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
      <div className="w-[700px] bg-white border rounded-lg shadow-lg flex relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
        >
          ✖
        </button>

        {/* Left Section - Logo */}
        <div className="w-1/2 flex justify-center items-center p-6 border-r">
          <img src="/src/assets/img/cmslogo.png" alt="Logo" className="w-32 h-32" />
        </div>

        {/* Right Section - Form */}
        <div className="w-1/2 p-8">
          <h2 className="text-xl font-bold mb-4">Update Profile</h2>
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium">Name</label>
            <input type="text" className="border rounded-md p-2" />

            <label className="text-sm font-medium">Email</label>
            <input type="email" className="border rounded-md p-2" />

            <label className="text-sm font-medium">Password</label>
            <input type="password" className="border rounded-md p-2" />

            <div className="flex justify-end gap-4 mt-4">
              <button onClick={onClose} className="text-gray-600">
                Cancel
              </button>
              <button className="bg-[#3A0323] hover:bg-[#2a021a] text-white px-4 py-2 rounded-md transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

