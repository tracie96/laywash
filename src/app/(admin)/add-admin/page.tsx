"use client";
import React, { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Input from '../../../components/form/input/InputField';
import Label from '../../../components/form/Label';
import Button from '../../../components/ui/button/Button';
import { ChevronLeftIcon } from '../../../icons';
import Link from 'next/link';

const AddAdminPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    location: '',
    address: '',
    nextOfKin: [{ name: '', phone: '', address: '' }]
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { createAdmin } = useAuth();
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextOfKinChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      nextOfKin: prev.nextOfKin.map((kin, i) => 
        i === index ? { ...kin, [field]: value } : kin
      )
    }));
  };

  const addNextOfKin = () => {
    setFormData(prev => ({
      ...prev,
      nextOfKin: [...prev.nextOfKin, { name: '', phone: '', address: '' }]
    }));
  };

  const removeNextOfKin = (index: number) => {
    if (formData.nextOfKin.length > 1) {
      setFormData(prev => ({
        ...prev,
        nextOfKin: prev.nextOfKin.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await createAdmin(
        formData.name,
        formData.email,
        formData.phone,
        formData.password,
        formData.location,
        formData.address,
        formData.nextOfKin.filter(kin => kin.name && kin.phone && kin.address),
        cvFile || undefined,
        pictureFile || undefined
      );

      if (result.success) {
        setSuccess('Admin account created successfully! The admin will receive a confirmation email to activate their account.');
        setFormData({ name: '', email: '', phone: '', password: '', location: '', address: '', nextOfKin: [{ name: '', phone: '', address: '' }] });
        setCvFile(null);
        setPictureFile(null);
        // Clear file inputs
        if (cvInputRef.current) cvInputRef.current.value = '';
        if (pictureInputRef.current) pictureInputRef.current.value = '';
      } else {
        setError(result.error || 'Failed to create admin account. Please try again.');
      }
    } catch {
      setError('An error occurred while creating the admin account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/(admin)/dashboard"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
        >
          <ChevronLeftIcon />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add New Admin
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new admin account to manage car wash operations
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 dark:text-green-200">{success}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <Label>
              Full Name <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Enter admin's full name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <Label>
              Email Address <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Enter admin's email address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <Label>
              Phone Number <span className="text-error-500">*</span>
            </Label>
            <Input
              type="tel"
              placeholder="Enter admin's phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <Label>
              Password <span className="text-error-500">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Create a password for the admin"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          {/* Location */}
          <div>
            <Label>
              Assigned Location
            </Label>
            <Input
              type="text"
              placeholder="Enter location (optional)"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
          </div>

          {/* Address */}
          <div>
            <Label>
              Address
            </Label>
            <Input
              type="text"
              placeholder="Enter admin's address (optional)"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
          </div>

          {/* CV Upload */}
          <div>
            <Label>
              CV Upload
            </Label>
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX files only (optional)</p>
          </div>

          {/* Picture Upload */}
          <div>
            <Label>
              Profile Picture
            </Label>
            <input
              ref={pictureInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Image files only (optional)</p>
          </div>

          {/* Next of Kin */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Next of Kin</Label>
              <button
                type="button"
                onClick={addNextOfKin}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                + Add Another
              </button>
            </div>
            {formData.nextOfKin.map((kin, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Next of Kin {index + 1}
                  </h4>
                  {formData.nextOfKin.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNextOfKin(index)}
                      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={kin.name}
                      onChange={(e) => handleNextOfKinChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      value={kin.phone}
                      onChange={(e) => handleNextOfKinChange(index, 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      type="text"
                      placeholder="Address"
                      value={kin.address}
                      onChange={(e) => handleNextOfKinChange(index, 'address', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Admin...
                </div>
              ) : (
                'Create Admin Account'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/(admin)/dashboard')}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• The admin will be created with the password you provide</li>
                <li>• They will receive a confirmation email to activate their account</li>
                <li>• After confirmation, they can log in with their email and password</li>
                <li>• They can create car washer accounts for their location</li>
                <li>• They can manage car wash operations and payments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAdminPage; 