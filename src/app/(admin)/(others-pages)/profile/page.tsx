import UserAddressCard from "@/components/user-profile/UserAddressCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";

export const metadata: Metadata = {
  title: "Next.js Profile | LayWash - Next.js Dashboard Template",
  description:
    "This is Next.js Profile page for LayWash - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Profile() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex items-center justify-between mb-5 lg:mb-7">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Profile
          </h3>
          <Link href="/change-password">
            <Button size="sm" variant="outline">
              Change Password
            </Button>
          </Link>
        </div>
        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
          <UserAddressCard />
        </div>
      </div>
    </div>
  );
}
