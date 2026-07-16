<script setup lang="ts">
defineProps<{ status: string }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="
      status.includes('发布') ||
      status.includes('启用') ||
      status === '在线' ||
      status === '已完成' ||
      status === '已生成'
        ? 'bg-emerald-50 text-emerald-700'
        : status.includes('运行') || status.includes('审核') || status.includes('复核')
          ? 'bg-amber-50 text-amber-700'
          : status.includes('禁用') || status.includes('归档') || status === '离线'
            ? 'bg-rose-50 text-rose-700'
            : 'bg-zinc-100 text-zinc-600'
    "
  >
    <span class="h-1.5 w-1.5 rounded-full bg-current" />{{ status }}
  </span>
</template>
