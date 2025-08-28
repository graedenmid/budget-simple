"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/error-handling/logger";
import { AuthError } from "@/lib/error-handling/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Utility to fail fast on hanging SDK calls
  const withTimeout = useCallback(
    async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
      return await new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
        promise
          .then((v) => {
            clearTimeout(timer);
            resolve(v);
          })
          .catch((e) => {
            clearTimeout(timer);
            reject(e);
          });
      });
    },
    []
  );

  // Create user profile in database
  const createUserProfile = useCallback(
    async (user: User | null | undefined) => {
      if (!user) return;

      try {
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (existingProfile) return;

        // Create profile
        const { error } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        });

        if (error) {
          await logger.logBudgetError(
            new AuthError(
              "Failed to create user profile",
              "PROFILE_CREATION_ERROR",
              {
                userId: user.id,
                error: error.message,
              }
            )
          );
        }
      } catch (error) {
        await logger.logBudgetError(
          new AuthError(
            "Unexpected error creating profile",
            "PROFILE_CREATION_ERROR",
            {
              userId: user.id,
              error: error instanceof Error ? error.message : "Unknown error",
            }
          )
        );
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          await logger.logBudgetError(
            new AuthError("Failed to get initial session", "SESSION_ERROR", {
              error: error.message,
            })
          );
        }

        setUser(session?.user ?? null);
      } catch (error) {
        await logger.logBudgetError(
          new AuthError("Unexpected error getting session", "SESSION_ERROR", {
            error: error instanceof Error ? error.message : "Unknown error",
          })
        );
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle normal sign-in
      if (event === "SIGNED_IN") {
        await createUserProfile(session?.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, createUserProfile]);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        await logger.logBudgetError(
          new AuthError("Sign up failed", "SIGN_UP_ERROR", {
            email,
            error: error.message,
          })
        );
        throw new Error(error.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to create account");
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logger.logBudgetError(
          new AuthError("Sign in failed", "SIGN_IN_ERROR", {
            email,
            error: error.message,
          })
        );
        throw new Error(error.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to sign in");
    }
  };

  const signInWithGoogle = async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        await logger.logBudgetError(
          new AuthError("Google sign in failed", "OAUTH_ERROR", {
            provider: "google",
            error: error.message,
          })
        );
        throw new Error(error.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to sign in with Google");
    }
  };

  const signOut = async () => {
    // Optimistically clear local state to prevent UI from thinking user is still signed in
    setUser(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        await logger.logBudgetError(
          new AuthError("Sign out failed", "SIGN_OUT_ERROR", {
            error: error.message,
          })
        );
      }
    } catch (error) {
      await logger.logBudgetError(
        new AuthError("Unexpected error during sign out", "SIGN_OUT_ERROR", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
      // Do not throw; proceed with server-side cookie clear/redirect
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`,
      });

      if (error) {
        await logger.logBudgetError(
          new AuthError("Password reset failed", "PASSWORD_RESET_ERROR", {
            email,
            error: error.message,
          })
        );
        throw new Error(error.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to reset password");
    }
  };

  const updatePassword = async (password: string) => {
    try {
      // Ensure we have an access token for manual fallback
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Attempt a refresh; do not fail hard on errors, but time-box it
      try {
        await withTimeout(
          supabase.auth.refreshSession(),
          7000,
          "Session refresh"
        );
      } catch {
        // ignore refresh errors; proceed
      }

      // Try SDK path first (time-boxed)
      try {
        const { error } = await withTimeout(
          supabase.auth.updateUser({ password }),
          10000,
          "Password update"
        );
        if (error) {
          throw new Error(error.message);
        }
        return;
      } catch (sdkError) {
        // Fallback to direct REST call if SDK path hangs/fails
        if (!session?.access_token) {
          throw sdkError instanceof Error
            ? sdkError
            : new Error("No active recovery session. Re-open the reset link.");
        }

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`;
        const res = await withTimeout(
          fetch(url, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ password }),
          }),
          10000,
          "Password update (REST)"
        );

        if (!res.ok) {
          const text = await res.text();
          await logger.logBudgetError(
            new AuthError("Password update failed", "PASSWORD_UPDATE_ERROR", {
              error: text || `${res.status} ${res.statusText}`,
            })
          );
          throw new Error(text || `Password update failed (${res.status})`);
        }
      }
    } catch (error) {
      // Surface the actual error message when available
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to update password");
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
