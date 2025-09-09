"use client";
import React from 'react';
import { Modal } from '@/components/ui/modal';
import Image from 'next/image';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status: "active" | "inactive";
  lastLogin: string;
  permissions: string[];
  location?: string | null;
  cvUrl?: string | null;
  pictureUrl?: string | null;
  address?: string | null;
  nextOfKin?: {
    name: string;
    phone: string;
    address: string;
    relationship: string;
  }[];
}

interface AdminDetailModalProps {
  admin: AdminProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

const AdminDetailModal: React.FC<AdminDetailModalProps> = ({
  admin,
  isOpen,
  onClose
}) => {
  if (!admin) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start space-x-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600">
                {admin.pictureUrl ? (
                  <Image
                    src={admin.pictureUrl}
                    alt={`${admin.name}'s profile`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            {/* Admin Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {admin.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-lg">
                Administrator
              </p>
              <div className="flex items-center mt-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  admin.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {admin.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <p className="text-gray-900 dark:text-white">{admin.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                <p className="text-gray-900 dark:text-white">{admin.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Join Date</label>
                <p className="text-gray-900 dark:text-white">{formatDate(admin.joinDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</label>
                <p className="text-gray-900 dark:text-white">{admin.lastLogin}</p>
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Location & Address
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</label>
                <p className="text-gray-900 dark:text-white">{admin.location || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                <p className="text-gray-900 dark:text-white">{admin.address || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Permissions
            </h3>
            <div className="flex flex-wrap gap-2">
              {admin.permissions.map((permission, index) => (
                <span
                  key={index}
                  className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full"
                >
                  {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>

          {/* CV & Documents */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Documents
            </h3>
            <div className="space-y-3">
              {admin.cvUrl ? (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CV/Resume</label>
                  <div className="mt-1">
                    <a
                      href={admin.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View CV
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No CV uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Next of Kin Information */}
        {admin.nextOfKin && admin.nextOfKin.length > 0 && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Next of Kin
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {admin.nextOfKin.map((kin, index) => (
                <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                      <p className="text-gray-900 dark:text-white">{kin.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Relationship</label>
                      <p className="text-gray-900 dark:text-white">{kin.relationship}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-gray-900 dark:text-white">{kin.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                      <p className="text-gray-900 dark:text-white">{kin.address}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminDetailModal;
