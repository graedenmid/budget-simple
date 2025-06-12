import { createClient } from "@/lib/supabase/server";

interface TableRow {
  table_name: string;
}

interface EnumRow {
  typname: string;
}

export interface DatabaseTestResult {
  connected: boolean;
  error?: string;
  tablesExist: boolean;
  rlsEnabled: boolean;
  enumsExist: boolean;
  details: {
    tables: string[];
    enums: string[];
    policies: number;
  };
}

export async function testDatabaseConnection(): Promise<DatabaseTestResult> {
  const result: DatabaseTestResult = {
    connected: false,
    tablesExist: false,
    rlsEnabled: false,
    enumsExist: false,
    details: {
      tables: [],
      enums: [],
      policies: 0,
    },
  };

  try {
    const supabase = await createClient();

    // Test basic connection
    const { error: connectionError } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (connectionError) {
      result.error = `Connection failed: ${connectionError.message}`;
      return result;
    }

    result.connected = true;

    // Check if core tables exist
    const { data: tables, error: tablesError } = await supabase.rpc("exec", {
      sql: `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `,
    });

    if (!tablesError && tables) {
      result.details.tables = (tables as TableRow[]).map(
        (row) => row.table_name
      );

      const expectedTables = [
        "users",
        "income_sources",
        "budget_items",
        "pay_periods",
        "allocations",
        "expenses",
        "suggestions",
      ];

      result.tablesExist = expectedTables.every((table) =>
        result.details.tables.includes(table)
      );
    }

    // Check if enums exist
    const { data: enums, error: enumsError } = await supabase.rpc("exec", {
      sql: `
        SELECT typname FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname;
      `,
    });

    if (!enumsError && enums) {
      result.details.enums = (enums as EnumRow[]).map((row) => row.typname);

      const expectedEnums = [
        "income_cadence",
        "budget_category",
        "calc_type",
        "pay_period_status",
        "allocation_status",
        "expense_type",
        "suggestion_status",
      ];

      result.enumsExist = expectedEnums.every((enumType) =>
        result.details.enums.includes(enumType)
      );
    }

    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase.rpc("exec", {
      sql: `
        SELECT COUNT(*) as count FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true;
      `,
    });

    if (!rlsError && rlsData && rlsData[0]) {
      const rlsEnabledCount = parseInt(rlsData[0].count);
      result.rlsEnabled = rlsEnabledCount >= 7; // All our core tables
    }

    // Count policies
    const { data: policies, error: policiesError } = await supabase.rpc(
      "exec",
      {
        sql: `
        SELECT COUNT(*) as count FROM pg_policies 
        WHERE schemaname = 'public';
      `,
      }
    );

    if (!policiesError && policies && policies[0]) {
      result.details.policies = parseInt(policies[0].count);
    }
  } catch (error) {
    result.error = `Test failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }

  return result;
}

// Simplified test for basic health check
export async function isHealthy(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("users").select("count").limit(1);

    return !error;
  } catch {
    return false;
  }
}

// Test user authentication and profile creation
export async function testAuthFlow(): Promise<{
  success: boolean;
  error?: string;
  hasUser: boolean;
  hasProfile: boolean;
}> {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "No authenticated user",
        hasUser: false,
        hasProfile: false,
      };
    }

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      success: true,
      hasUser: true,
      hasProfile: !profileError && !!profile,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      hasUser: false,
      hasProfile: false,
    };
  }
}

// Generate a comprehensive database status report
export async function generateDatabaseReport(): Promise<string> {
  const testResult = await testDatabaseConnection();
  const authResult = await testAuthFlow();

  let report = `# Budget Simple Database Status Report\n\n`;

  report += `## Connection Status\n`;
  report += `- **Connected**: ${testResult.connected ? "✅ Yes" : "❌ No"}\n`;
  if (testResult.error) {
    report += `- **Error**: ${testResult.error}\n`;
  }
  report += `\n`;

  report += `## Schema Status\n`;
  report += `- **Tables Exist**: ${
    testResult.tablesExist ? "✅ Yes" : "❌ No"
  } (${testResult.details.tables.length} found)\n`;
  report += `- **Enums Exist**: ${
    testResult.enumsExist ? "✅ Yes" : "❌ No"
  } (${testResult.details.enums.length} found)\n`;
  report += `- **RLS Enabled**: ${
    testResult.rlsEnabled ? "✅ Yes" : "❌ No"
  }\n`;
  report += `- **Policies Count**: ${testResult.details.policies}\n`;
  report += `\n`;

  if (testResult.details.tables.length > 0) {
    report += `## Tables Found\n`;
    testResult.details.tables.forEach((table) => {
      report += `- ${table}\n`;
    });
    report += `\n`;
  }

  if (testResult.details.enums.length > 0) {
    report += `## Enums Found\n`;
    testResult.details.enums.forEach((enumType) => {
      report += `- ${enumType}\n`;
    });
    report += `\n`;
  }

  report += `## Authentication Status\n`;
  report += `- **Auth Working**: ${authResult.success ? "✅ Yes" : "❌ No"}\n`;
  report += `- **Has User**: ${authResult.hasUser ? "✅ Yes" : "❌ No"}\n`;
  report += `- **Has Profile**: ${
    authResult.hasProfile ? "✅ Yes" : "❌ No"
  }\n`;
  if (authResult.error) {
    report += `- **Auth Error**: ${authResult.error}\n`;
  }

  return report;
}
