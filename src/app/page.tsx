"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  TrendingUp,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Auto-redirect authenticated users to dashboard immediately
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Show minimal loading while auth is being checked or user is being redirected
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only show marketing landing page for confirmed non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">
              Budget Simple
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Simplify Your Budget,
            <span className="text-blue-600"> Amplify Your Savings</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Replace cumbersome spreadsheets with automated budgeting. Track
            expenses, manage income, and get intelligent recommendations for
            surplus allocation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/register">
                Start Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-3"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Key Benefits */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Automation</h3>
              <p className="text-gray-600">
                Automate budget calculations and get intelligent surplus
                allocation recommendations
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your financial data is encrypted and protected with
                enterprise-grade security
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Smartphone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
              <p className="text-gray-600">
                Manage your budget on-the-go with our responsive,
                mobile-optimized interface
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="bg-white rounded-lg p-8 shadow-sm max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Why Choose Budget Simple?
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Automated budget calculations</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Multiple income cadences</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Expense tracking & categorization</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Smart surplus recommendations</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Real-time budget tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Historical analysis & trends</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 Budget Simple. Built with Next.js and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
