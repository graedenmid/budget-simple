"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  showBackToLogin?: boolean;
  alternativeAction?: {
    text: string;
    linkText: string;
    href: string;
  };
}

export function AuthPageLayout({
  title,
  description,
  children,
  showBackToLogin = false,
  alternativeAction,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Budget Simple</h1>
          <p className="mt-2 text-sm text-gray-600">
            Simplify your personal finance management
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{title}</CardTitle>
            <CardDescription className="text-center">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          {showBackToLogin && (
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to login
            </Link>
          )}

          {alternativeAction && (
            <p className="text-sm text-gray-600">
              {alternativeAction.text}{" "}
              <Link
                href={alternativeAction.href}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {alternativeAction.linkText}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
