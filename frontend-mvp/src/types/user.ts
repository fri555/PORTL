export type UserRole = 'user' | 'editor' | 'demand_admin' | 'admin'

export interface MockUser {
  id: string
  displayName: string
  department: string
  role: UserRole
  avatarUrl: string
}
