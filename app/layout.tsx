import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nutrition + Workouts",
  description: "Nutrition calculator and workout tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen">
          <header className="border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/" className="font-semibold">
                  Nutrition
                </Link>
                <Link href="/workouts">Workouts</Link>
                <Link href="/exercises">Exercises</Link>
              </nav>

              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="text-gray-600">{user.email}</span>
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/login" className="rounded-xl border px-3 py-2 font-medium">
                    Login
                  </Link>
                )}
              </div>
            </div>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
