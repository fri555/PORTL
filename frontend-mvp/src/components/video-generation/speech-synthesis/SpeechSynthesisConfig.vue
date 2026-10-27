<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronDown, Check, Headphones, Search, Volume2 } from 'lucide-vue-next'
import { normalizeSpeechInput, speechCharacterCount, speechValidationMessage } from '@/composables/useSpeechSynthesis'
import { speechBitRates, speechSampleRates, speechVoices } from '@/mock/speech-synthesis'
import type { SpeechSynthesisInput, SpeechVoice } from '@/types/speech-synthesis'

const props = defineProps<{ initialData?: Record<string, any>; initialName?: string }>()
const emit = defineEmits<{ submit: [input: SpeechSynthesisInput, name: string]; updateName: [name: string] }>()
const name = ref(props.initialName ?? '')
const input = ref(normalizeSpeechInput(props.initialData))
input.value.format = 'mp3'
input.value.sampleRate = 24000
input.value.bitRate = 64000
const advanced = ref(false)
const keyword = ref('')
const language = ref('')
const style = ref('')
const error = ref('')
const invalidField = ref<'name' | 'text' | ''>('')
const nameInput = ref<HTMLInputElement | null>(null)
const textInput = ref<HTMLTextAreaElement | null>(null)
const auditionError = ref('')
const playing = ref('')
let audition: HTMLAudioElement | undefined
const voices = computed(() => speechVoices.filter(voice => (!keyword.value.trim() || voice.name.toLowerCase().includes(keyword.value.trim().toLowerCase())) && (!language.value || voice.language === language.value) && (!style.value || voice.style === style.value)))
const languages = [...new Set(speechVoices.map(voice => voice.language))]
const styles = [...new Set(speechVoices.map(voice => voice.style))]
const selectedVoice = computed(() => speechVoices.find(voice => voice.id === input.value.speaker)!)
const speedMultiplier = computed({
  get: () => Number((1 + input.value.speechRate / 100).toFixed(1)),
  set: (value: number) => {
    const number = Number(value)
    const bounded = Math.min(2, Math.max(0.5, Number.isFinite(number) ? number : 1))
    input.value.speechRate = Math.round((bounded - 1) * 100)
  },
})

watch(name, value => { emit('updateName', value); clearValidation() })
watch(() => input.value.speaker, () => {
  stopAudition()
  if (!['中文', '英文'].includes(selectedVoice.value.language)) input.value.enableSubtitle = false
})
function stopAudition() {
  if (audition) { audition.pause(); audition.currentTime = 0; audition = undefined }
  playing.value = ''
}
function selectVoice(voice: SpeechVoice) { input.value.speaker = voice.id }
async function playVoice(voice: SpeechVoice) {
  if (!voice.sampleUrl) return
  if (playing.value === voice.id) { stopAudition(); return }
  stopAudition(); auditionError.value = ''
  const audio = new Audio(voice.sampleUrl)
  audition = audio; playing.value = voice.id
  audio.onended = () => { if (audition === audio) stopAudition() }
  audio.onerror = () => { if (audition === audio) { stopAudition(); auditionError.value = '样音暂时无法播放，请稍后重试' } }
  try { await audio.play() } catch { if (audition === audio) { stopAudition(); auditionError.value = '样音播放失败，请重试' } }
}
function clearValidation() { error.value = ''; invalidField.value = '' }
async function submit() {
  error.value = speechValidationMessage(name.value, input.value)
  if (error.value) {
    invalidField.value = !name.value.trim() || name.value.trim().length > 20 ? 'name' : !input.value.text.trim() ? 'text' : ''
    await nextTick()
    const field = invalidField.value === 'name' ? nameInput.value : invalidField.value === 'text' ? textInput.value : null
    field?.focus({ preventScroll: true })
    field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    return
  }
  invalidField.value = ''
  stopAudition()
  emit('submit', normalizeSpeechInput(input.value), name.value.trim())
}
onBeforeUnmount(stopAudition)
</script>

<template>
  <form class="speech-config" @submit.prevent="submit">
    <section class="speech-name">
      <label for="speech-task-name">任务名称 <span class="required">*</span></label>
      <div class="name-field"><input id="speech-task-name" ref="nameInput" v-model="name" aria-label="任务名称" :aria-invalid="invalidField === 'name'" :aria-describedby="invalidField === 'name' ? 'speech-validation-error' : undefined" maxlength="20" placeholder="请输入任务名称" /><span>{{ name.length }}/20</span></div>
    </section>
    <div class="speech-main-grid">
      <section class="speech-text-section">
        <div class="label-row"><label for="speech-text">合成文本 <span class="required">*</span></label><small>{{ speechCharacterCount(input.text) }} 字符</small></div>
        <textarea id="speech-text" ref="textInput" v-model="input.text" aria-label="合成文本" :aria-invalid="invalidField === 'text'" :aria-describedby="invalidField === 'text' ? 'speech-validation-error' : undefined" placeholder="输入需要朗读的内容，例如：欢迎来到天马智擎。让每一个好创意，都拥有自己的声音。" @input="clearValidation" />
      </section>
      <section class="speech-voice-section">
        <div class="label-row"><label>音色 <span class="required">*</span></label><small data-testid="speech-selected-voice">已选：{{ selectedVoice.name }}</small></div>
        <div class="voice-toolbar"><div class="voice-search"><Search :size="14" /><input v-model="keyword" aria-label="搜索音色" placeholder="搜索音色" /></div><select v-model="language" aria-label="音色语种"><option value="">全部语种</option><option v-for="item in languages" :key="item">{{ item }}</option></select><select v-model="style" aria-label="音色风格"><option value="">全部风格</option><option v-for="item in styles" :key="item">{{ item }}</option></select></div>
        <div class="voice-grid" role="group" aria-label="预置音色">
          <article v-for="voice in voices" :key="voice.id" class="voice-card" :class="{ selected: input.speaker === voice.id }">
            <button type="button" class="voice-choice" data-testid="speech-voice" :aria-pressed="input.speaker === voice.id" @click="selectVoice(voice)"><span class="voice-avatar"><Volume2 :size="16" /></span><span><strong>{{ voice.name }}</strong><small>{{ voice.language }} · {{ voice.gender }} · {{ voice.style }}</small></span><Check v-if="input.speaker === voice.id" :size="13" class="voice-check" /></button>
            <button type="button" class="voice-audition" :aria-label="`试听${voice.name}`" :disabled="!voice.sampleUrl" :title="voice.sampleUrl ? '官方音色样音，与当前输入文本无关' : '暂无官方样音'" @click="playVoice(voice)"><Headphones :size="12" />{{ !voice.sampleUrl ? '暂无样音' : playing === voice.id ? '停止试听' : '试听' }}</button>
          </article>
          <p v-if="!voices.length" class="empty-voices">暂无匹配音色，请调整搜索或筛选条件</p>
        </div>
        <p v-if="auditionError" role="status" class="field-error">{{ auditionError }}</p>
      </section>
    </div>
    <section class="speech-basic-grid" aria-label="基础参数">
      <div><label for="speech-rate">语速</label><div class="number-field"><input id="speech-rate" v-model.number="speedMultiplier" type="number" min="0.5" max="2" step="0.1" aria-label="语速" /><span>倍</span></div></div>
      <div><label for="speech-loudness">音量</label><div class="number-field"><input id="speech-loudness" v-model.number="input.loudnessRate" type="number" min="-50" max="100" step="1" aria-label="音量" /><span>%</span></div></div>
      <div class="subtitle-field"><label class="checkbox-label"><input v-model="input.enableSubtitle" type="checkbox" aria-label="同时生成字幕" :disabled="!['中文', '英文'].includes(selectedVoice.language)" /><span>同时生成字幕</span></label><small>输出 SRT 文件，便于导入剪辑软件</small></div>
    </section>
    <button type="button" data-testid="speech-advanced-toggle" class="advanced-toggle" :aria-expanded="advanced" @click="advanced = !advanced">高级设置<ChevronDown :size="15" :class="{ expanded: advanced }" /></button>
    <section v-if="advanced" class="speech-advanced-grid" aria-label="高级设置">
      <div><label for="speech-sample-rate">采样率</label><select id="speech-sample-rate" v-model.number="input.sampleRate" aria-label="采样率"><option v-for="rate in speechSampleRates" :key="rate" :value="rate">{{ rate }} Hz</option></select></div>
      <div><label for="speech-bit-rate">码率</label><select id="speech-bit-rate" v-model.number="input.bitRate" aria-label="码率"><option v-for="rate in speechBitRates" :key="rate" :value="rate">{{ rate / 1000 }} kbps</option></select></div>
    </section>
    <div class="speech-footer"><button type="submit" class="primary-button" data-testid="speech-submit">开始合成</button></div>
    <p v-if="error" id="speech-validation-error" role="alert" class="field-error">{{ error }}</p>
  </form>
</template>

<style scoped>
.speech-config{display:flex;flex-direction:column;gap:20px;padding-bottom:24px;font-size:13px;color:#18181b}.speech-config label{font-weight:500}.speech-config input,.speech-config textarea,.speech-config select,.speech-config button{font:inherit}.speech-config input:not([type=checkbox]),.speech-config select,.speech-config textarea{outline:none;border:1px solid #e4e4e7;border-radius:7px;background:white;color:#18181b}.speech-config input:focus,.speech-config textarea:focus,.speech-config select:focus{border-color:#a1a1aa}.required{color:#dc6262}.name-field{position:relative;margin-top:8px}.name-field input{height:36px;width:100%;padding:0 64px 0 12px;box-sizing:border-box}.name-field>span{position:absolute;right:12px;top:10px;color:#a1a1aa;font-size:12px}.label-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.label-row small,.speech-config small{font-size:11px;color:#929298}.speech-main-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:24px}.speech-text-section textarea{width:100%;height:206px;padding:11px 12px;box-sizing:border-box;resize:vertical;line-height:1.7}.speech-config textarea::placeholder,.speech-config input::placeholder{color:#b1b1b8}.voice-toolbar{display:flex;gap:6px;margin-bottom:10px}.voice-toolbar select{height:31px;padding:0 4px;font-size:11px;max-width:90px}.voice-search{display:flex;align-items:center;gap:6px;flex:1;min-width:70px;border:1px solid #e4e4e7;border-radius:6px;padding:0 8px;color:#929298}.voice-search input{width:100%;height:29px;border:0!important;padding:0;min-width:0;font-size:11px!important}.voice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:206px;overflow-y:auto;padding-right:5px;scrollbar-gutter:stable}.voice-grid::-webkit-scrollbar{width:7px}.voice-grid::-webkit-scrollbar-thumb{border-radius:7px;background:#d4d4d8}.voice-card{position:relative;border:1px solid #e8e8ec;border-radius:7px;background:white;min-width:0}.voice-card.selected{border-color:#18181b;background:#fafafa}.voice-choice{display:flex;gap:8px;align-items:center;width:100%;border:0;background:transparent;padding:9px 8px 27px;text-align:left;cursor:pointer;position:relative}.voice-avatar{display:grid;place-items:center;flex-shrink:0;width:26px;height:26px;border-radius:50%;background:#f0f0f2;color:#68686e}.voice-choice>span:nth-child(2){min-width:0}.voice-choice strong{display:block;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.voice-choice small{display:block;margin-top:3px;font-size:10px;white-space:nowrap}.voice-check{position:absolute;right:7px;top:9px}.voice-audition{position:absolute;bottom:7px;left:42px;border:0;background:transparent;display:flex;align-items:center;gap:4px;font-size:10px!important;color:#555;cursor:pointer;padding:0}.voice-audition:disabled{color:#aaa;cursor:not-allowed}.empty-voices{grid-column:1/-1;text-align:center;padding:42px 0;color:#929298;font-size:12px}.speech-basic-grid,.speech-advanced-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:24px}.speech-basic-grid select,.speech-advanced-grid select{display:block;width:100%;height:35px;padding:0 10px;margin-top:8px}.number-field{position:relative;margin-top:8px}.number-field input{width:100%;height:35px;padding:0 38px 0 10px;box-sizing:border-box}.number-field span{position:absolute;right:12px;top:8px;color:#777}.subtitle-field{padding-top:25px}.checkbox-label{display:flex;align-items:center;gap:6px;cursor:pointer}.checkbox-label input{accent-color:#18181b;width:14px;height:14px;margin:0}.subtitle-field small{display:block;margin-top:7px}.advanced-toggle{display:inline-flex;align-self:flex-start;align-items:center;gap:7px;border:0;background:transparent;padding:0;color:#666;cursor:pointer;font-size:12px!important}.advanced-toggle svg{transition:transform .2s}.advanced-toggle svg.expanded{transform:rotate(180deg)}.speech-advanced-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:17px;background:#fafafa;border:1px solid #eee;border-radius:8px}.speech-footer{display:flex;justify-content:flex-end;border-top:1px solid #f0f0f2;padding-top:16px}.primary-button{height:35px;min-width:96px;padding:0 16px;border:1px solid #18181b;border-radius:7px;background:#18181b;color:white;cursor:pointer}.field-error{margin:0;color:#c24138;font-size:12px}@media(max-width:1000px){.speech-main-grid{grid-template-columns:1fr}.speech-text-section textarea{height:160px}.voice-grid{grid-template-columns:repeat(3,minmax(0,1fr));max-height:206px}.speech-basic-grid,.speech-advanced-grid{gap:16px}}@media(max-width:620px){.speech-main-grid{gap:20px}.voice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.speech-basic-grid,.speech-advanced-grid{grid-template-columns:1fr}.subtitle-field{padding-top:0}.voice-toolbar select{max-width:80px}}
</style>
