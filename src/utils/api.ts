import { createClient } from "@/utils/supabase/client"

export async function apiRequest(url: string, options: RequestInit = {}) {
  const supabase = createClient()
  
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession()
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  
  // Add authorization header if user is authenticated
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  try {
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error occurred')
  }
}

// Convenience functions for common HTTP methods
export const api = {
  get: (url: string) => apiRequest(url),
  post: (url: string, data?: any) => apiRequest(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  put: (url: string, data?: any) => apiRequest(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),
  delete: (url: string) => apiRequest(url, {
    method: 'DELETE',
  }),
} 