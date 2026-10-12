from pathlib import Path
p=Path(r"D:\工作\portal\frontend-mvp\src\components\chat\source-clone\ConversationSearchDialog.vue")
s=p.read_text(encoding="utf-8-sig")
old="""              ><time>{{ item.date }}</time></span
            >
          </span>"""
new="""              ><time>{{ item.date }}</time></span
            >
            <span class="result-excerpt">
              <span v-if="excerptData(item.excerpt).leading">…</span><template v-for="(segment, index) in excerptData(item.excerpt).segments" :key="index"><mark v-if="segment.matched">{{ segment.text }}</mark><span v-else>{{ segment.text }}</span></template><span v-if="excerptData(item.excerpt).trailing">…</span>
            </span>
          </span>"""
if old not in s: raise SystemExit("Missing result excerpt anchor")
s=s.replace(old,new,1)
old=".empty {"
new=""".result-excerpt {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #858c96;
  font-size: 12px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-excerpt mark {
  border-radius: 2px;
  background: #fff0b5;
  color: #3d4552;
  padding: 0 1px;
}
.empty {"""
s=s.replace(old,new,1)
p.write_text(s,encoding="utf-8")

