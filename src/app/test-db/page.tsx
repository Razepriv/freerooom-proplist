import { debugDatabaseConnection } from '@/app/actions';

export default async function DatabaseTest() {
  let result;
  try {
    result = await debugDatabaseConnection();
  } catch (error) {
    result = { 
      success: false, 
      message: "Failed to run database test",
      error: error instanceof Error ? error.message : String(error)
    };
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h2 className="font-semibold mb-2">
          {result.success ? '✅ Test Passed' : '❌ Test Failed'}
        </h2>
        
        <p className="mb-4">{result.message}</p>
        
        {result.details && (
          <div className="bg-white p-3 rounded border">
            <h3 className="font-medium mb-2">Details:</h3>
            <pre className="text-sm">{JSON.stringify(result.details, null, 2)}</pre>
          </div>
        )}
        
        {result.error && (
          <div className="bg-white p-3 rounded border mt-2">
            <h3 className="font-medium mb-2">Error:</h3>
            <pre className="text-sm text-red-600">{result.error}</pre>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-600">
          This page tests the database connection, adapter selection, and basic CRUD operations.
        </p>
      </div>
    </div>
  );
}
