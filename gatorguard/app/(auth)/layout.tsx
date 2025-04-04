import { redirect } from "next/navigation";
import { getUserSession } from "@/actions/auth";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const response = await getUserSession();
  if (response?.user) {
    redirect("/");
  }
  return <>{children}</>;
}
