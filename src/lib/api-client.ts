// Utility for making API calls with proper error handling
export async function apiCall(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Authentication required - redirect to login
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    
    // Try to parse error response
    try {
      const error = await response.json();
      throw new Error(error.error?.message || error.message || `API error: ${response.status}`);
    } catch {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  
  return response.json();
}