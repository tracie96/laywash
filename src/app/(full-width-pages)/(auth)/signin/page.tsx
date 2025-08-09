import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AACC SignIn Page",
  description: "This is SignIn Page for AACC",
};

export default function SignIn() {
  return <SignInForm />;
}
