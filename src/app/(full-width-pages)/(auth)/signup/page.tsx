import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AACC SignUp Page",
  description: "This is SignUp Page for AACC",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
