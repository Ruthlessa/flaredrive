import { http, type HttpResponse } from '@/utils/http'

export type StorageListObject = {
  key: string
  version: string
  size: number
  etag: string
  httpEtag: string
  checksums: any
  uploaded: Date
  httpMetadata?: Record<string, any>
  customMetadata?: Record<string, any>
  range?: any
  storageClass: string
}

export type StorageListResult = {
  objects: StorageListObject[]
  folders: string[]
  prefix: string
  limit: number
  startAfter: string
  hasMore: boolean
  moreAfter: string | null
}

export interface BucketInfo {
  id: string
  name: string
  cdnBaseUrl?: string
  edgeThumbnailUrl?: string
  bucketName: string
  endpointUrl: string
  region: string
  accessKeyId?: string // Usually masked or not returned fully if secure
  forcePathStyle?: number | boolean
  uploadMethod?: 'presigned' | 'proxy'
}

export class BucketClient {
  constructor(private baseURL: string = '/api/bucket/') {}

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL
    return this
  }

  list(prefix: string, options?: { delimiter?: string; limit?: number; startAfter?: string }) {
    const { delimiter, limit, startAfter } = options || {}
    const url = new URL(prefix, window.location.origin + this.baseURL)
    if (delimiter !== undefined) url.searchParams.set('delimiter', delimiter)
    if (limit !== undefined) url.searchParams.set('limit', String(limit))
    if (startAfter !== undefined) url.searchParams.set('startAfter', startAfter)
    const path = url.pathname + url.search
    return http.get<StorageListResult>(path)
  }

  upload(
    key: string,
    file: File | Blob | ArrayBuffer | string,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
    }
  ) {
    const metadata = options?.metadata || {}
    const contentType = options?.contentType || (file as File).type || 'application/octet-stream'
    const metaHeaders = Object.entries(metadata).reduce(
      (acc, [key, value]) => {
        key = this.convertNonAsciiString(key)
        value = this.convertNonAsciiString(value)
        if (key.length > 128 || value.length > 128) {
          throw new Error('Key or value length exceeds 128 characters')
        }
        acc[`x-amz-meta-${key}`] = value
        return acc
      },
      {} as Record<string, string>
    )
    const url = this.baseURL + key
    return http.put<StorageListObject>(url, file, {
      headers: {
        ...metaHeaders,
        'Content-Type': contentType || 'application/octet-stream',
      },
    })
  }

  delete(key: string): Promise<HttpResponse<any>> {
    const url = this.baseURL + key
    return http.delete(url)
  }

  rename(oldKey: string, newKey: string): Promise<HttpResponse<any>> {
    const url = this.baseURL + newKey
    const fullUrl = new URL(url, window.location.origin)
    fullUrl.searchParams.set('copySource', oldKey)
    const path = fullUrl.pathname + fullUrl.search
    return http.put(path)
  }

  private convertNonAsciiString(str: string) {
    const hasNonAscii = /[^\x00-\x7F]/.test(str)
    if (hasNonAscii) {
      return encodeURIComponent(str)
    } else {
      return str
    }
  }
}
