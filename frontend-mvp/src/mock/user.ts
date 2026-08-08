import type { MockUser } from '@/types/user'
import { placeholder } from '@/lib/placeholder'

export const mockUser: MockUser = {
  id: 'u_001',
  displayName: '张三',
  department: '营销部',
  role: 'admin',
  avatarUrl: placeholder('张三', 25, 80, 80, '张'),
}
