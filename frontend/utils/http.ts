export interface HttpResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Headers
}

export interface HttpError extends Error {
  response?: HttpResponse
  status?: number
}

async function httpRequest<T>(
  url: string,
  options: RequestInit & { json?: boolean } = {}
): Promise<HttpResponse<T>> {
  // Ensure URL doesn't inherit query params from the page
  let requestUrl: URL
  try {
    // Check if it's an absolute URL
    requestUrl = new URL(url)
  } catch {
    // It's a relative URL, build it properly
    requestUrl = new URL(url, window.location.origin)
    requestUrl.search = ''
  }

  const { json = true, ...fetchOptions } = options

  // Only add JSON content-type if we're sending JSON and haven't specified headers
  const headers: Record<string, string> = {}
  if (json && fetchOptions.headers) {
    const hasContentType =
      (fetchOptions.headers as Record<string, string>)?.['Content-Type'] ||
      (fetchOptions.headers as Record<string, string>)?.['content-type']
    if (!hasContentType) {
      headers['Content-Type'] = 'application/json'
    }
  } else if (json) {
    headers['Content-Type'] = 'application/json'
  }

  // Merge headers correctly
  const finalHeaders: HeadersInit = {
    ...headers,
    ...(fetchOptions.headers || {}),
  }

  const response = await fetch(requestUrl.toString(), {
    ...fetchOptions,
    headers: finalHeaders,
    credentials: 'same-origin',
  })

  let data: any
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`) as HttpError
    error.response = { data, status: response.status, statusText: response.statusText, headers: response.headers }
    error.status = response.status
    throw error
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }
}

export const http = {
  get<T = any>(url: string, options?: RequestInit): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...options, method: 'GET' })
  },
  post<T = any>(url: string, data?: any, options?: RequestInit): Promise<HttpResponse<T>> {
    const isJson = typeof data !== 'string' && !(data instanceof Blob) && !(data instanceof FormData)
    return httpRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data !== undefined ? (isJson ? JSON.stringify(data) : data) : undefined,
      json: isJson,
    })
  },
  put<T = any>(url: string, data?: any, options?: RequestInit): Promise<HttpResponse<T>> {
    const isJson = typeof data !== 'string' && !(data instanceof Blob) && !(data instanceof FormData)
    return httpRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data !== undefined ? (isJson ? JSON.stringify(data) : data) : undefined,
      json: isJson,
    })
  },
  patch<T = any>(url: string, data?: any, options?: RequestInit): Promise<HttpResponse<T>> {
    const isJson = typeof data !== 'string' && !(data instanceof Blob) && !(data instanceof FormData)
    return httpRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data !== undefined ? (isJson ? JSON.stringify(data) : data) : undefined,
      json: isJson,
    })
  },
  delete<T = any>(url: string, options?: RequestInit): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...options, method: 'DELETE' })
  },
}
