import type { MockUser } from '@/types/user'
import { placeholder } from '@/lib/placeholder'

export const mockUser: MockUser = {
  id: 'u_001',
  displayName: '朝暮',
  department: '天马集团',
  role: 'admin',
  avatarUrl: placeholder('朝暮', 25, 80, 80, '暮'),
}
