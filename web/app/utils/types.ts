export interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  provider: 'local' | 'google' | 'github'
}

export interface Session {
  accessToken: string
  user: User
}

export interface Item {
  id: string
  name: string
  description: string
  category: string
  price: number
  tags: string[]
  inStock: boolean
  ownerId: string | null
  createdAt: string
}

export interface SearchResult {
  hits: Item[]
  total: number
  categories: Record<string, number>
  processingTimeMs: number
}

export interface ImportResult {
  jobId: string
  created: number
  skipped: number
  errors: { line: number, message: string }[]
}
