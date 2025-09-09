import { Metadata } from 'next';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Change Password | LayWash - Next.js Dashboard Template',
  description: 'Change your password to keep your account secure.',
};

export default function ChangePasswordPage() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
