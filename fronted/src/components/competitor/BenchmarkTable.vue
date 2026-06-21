<script setup lang="ts">
import { Building2 } from 'lucide-vue-next'
import type { CompetitorProfile } from '@/types/competitor'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { timeAgo } from '@/lib/format'

defineProps<{ rows: CompetitorProfile[]; self: CompetitorProfile }>()
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-white shadow-sm">
    <div class="border-b bg-muted/30 px-4 py-3">
      <h3 class="flex items-center gap-2 font-semibold">
        <Building2 class="h-4 w-4 text-primary" /> 行业对标看板
      </h3>
    </div>
    <Table>
      <TableHeader>
        <TableRow class="bg-muted/40 hover:bg-muted/40">
          <TableHead class="w-36">竞品</TableHead>
          <TableHead>AI 覆盖部门</TableHead>
          <TableHead class="w-24 text-right">AI 项目数</TableHead>
          <TableHead>核心场景</TableHead>
          <TableHead class="w-24">最新动态</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="r in rows" :key="r.id">
          <TableCell>
            <div class="font-medium">{{ r.name }}</div>
            <div class="text-xs text-muted-foreground">{{ r.industry }}</div>
          </TableCell>
          <TableCell>{{ r.aiCoverage }}</TableCell>
          <TableCell class="text-right font-semibold">{{ r.aiProjectCount }}</TableCell>
          <TableCell class="text-sm text-muted-foreground">{{ r.coreScenarios }}</TableCell>
          <TableCell class="text-xs text-muted-foreground">{{ timeAgo(r.lastUpdated) }}</TableCell>
        </TableRow>

        <TableRow class="border-t-2 border-primary bg-primary/5 hover:bg-primary/5">
          <TableCell>
            <div class="flex items-center gap-2 font-semibold text-primary">
              {{ self.name }}
              <span class="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">我司</span>
            </div>
            <div class="text-xs text-muted-foreground">{{ self.industry }}</div>
          </TableCell>
          <TableCell class="font-medium">{{ self.aiCoverage }}</TableCell>
          <TableCell class="text-right font-bold text-primary">{{ self.aiProjectCount }}</TableCell>
          <TableCell class="text-sm text-muted-foreground">{{ self.coreScenarios }}</TableCell>
          <TableCell class="text-xs text-muted-foreground">{{ timeAgo(self.lastUpdated) }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div class="border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
      💡 我司 AI 覆盖与项目数均落后于头部竞对，亟需加速
    </div>
  </div>
</template>
