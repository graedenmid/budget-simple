import {
  generateDatabaseReport,
  testDatabaseConnection,
} from "@/lib/database/test-connection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TestDatabasePage() {
  const testResult = await testDatabaseConnection();
  const report = await generateDatabaseReport();

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Connection Test</h1>
        <p className="text-muted-foreground">
          Verify that the Budget Simple database is properly configured and
          accessible.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connection Status
              {testResult.connected ? (
                <Badge variant="default" className="bg-green-500">
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">Disconnected</Badge>
              )}
            </CardTitle>
            <CardDescription>Basic database connectivity test</CardDescription>
          </CardHeader>
          <CardContent>
            {testResult.error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                <strong>Error:</strong> {testResult.error}
              </div>
            )}
            {testResult.connected && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                Successfully connected to the database
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Schema Status
              {testResult.tablesExist && testResult.enumsExist ? (
                <Badge variant="default" className="bg-green-500">
                  Ready
                </Badge>
              ) : (
                <Badge variant="destructive">Incomplete</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Database schema and table verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tables</span>
              <Badge variant={testResult.tablesExist ? "default" : "secondary"}>
                {testResult.details.tables.length} found
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enums</span>
              <Badge variant={testResult.enumsExist ? "default" : "secondary"}>
                {testResult.details.enums.length} found
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RLS Enabled</span>
              <Badge
                variant={testResult.rlsEnabled ? "default" : "destructive"}
              >
                {testResult.rlsEnabled ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Policies</span>
              <Badge variant="outline">{testResult.details.policies}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {testResult.details.tables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tables Found</CardTitle>
            <CardDescription>
              Core tables detected in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {testResult.details.tables.map((table) => (
                <Badge key={table} variant="outline" className="justify-center">
                  {table}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {testResult.details.enums.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enums Found</CardTitle>
            <CardDescription>
              Custom enum types detected in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {testResult.details.enums.map((enumType) => (
                <Badge
                  key={enumType}
                  variant="outline"
                  className="justify-center"
                >
                  {enumType}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Full Database Report</CardTitle>
          <CardDescription>
            Comprehensive status report for debugging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
            {report}
          </pre>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          This page is for development testing only and should be removed in
          production.
        </p>
      </div>
    </div>
  );
}
