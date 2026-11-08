<script setup lang="ts">
import { Volume2, VolumeX } from 'lucide-vue-next'
import type { VideoTask } from '@/types/video-generation'

defineProps<{ task: VideoTask }>()
defineEmits<{ back: [] }>()
</script>

<template>
  <section class="video-generate-result">
    <div class="preview"><span>视频生成结果</span></div>
    <dl>
      <div><dt>模型</dt><dd>{{ task.input.model }}</dd></div>
      <div><dt>输出规格</dt><dd>{{ task.input.resolution }} · {{ task.input.ratio }} · {{ task.input.duration }} 秒</dd></div>
      <div><dt>音频</dt><dd><Volume2 v-if="task.input.generateAudio" :size="15" /><VolumeX v-else :size="15" />{{ task.input.generateAudio ? '已生成' : '未生成' }}</dd></div>
      <div><dt>视频描述</dt><dd>{{ task.input.description }}</dd></div>
    </dl>
    <button type="button" @click="$emit('back')">返回任务列表</button>
  </section>
</template>

<style scoped>
.video-generate-result{display:flex;max-width:880px;flex-direction:column;gap:20px;padding-bottom:28px;color:#18181b;font-size:14px}.preview{display:grid;min-height:300px;place-items:center;border-radius:10px;background:#171717;color:#fff}.video-generate-result dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0}.video-generate-result dl>div{border:1px solid #e4e4e7;border-radius:8px;padding:14px}.video-generate-result dt{margin-bottom:7px;color:#71717a;font-size:12px}.video-generate-result dd{display:flex;align-items:center;gap:6px;margin:0;line-height:1.6}.video-generate-result button{align-self:flex-end;height:36px;border:1px solid #18181b;border-radius:7px;background:#18181b;padding:0 16px;color:#fff;font:inherit;cursor:pointer}@media(max-width:760px){.video-generate-result dl{grid-template-columns:1fr}}
</style>
