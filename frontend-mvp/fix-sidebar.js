const fs = require('fs');
const file = process.argv[2];
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Check current line 164
console.log('Before fix, line 164:');
console.log(lines[163]);
console.log('---');

// Add helper function after groupLimit
const fnInsertIdx = lines.findIndex(l => l.includes('function groupLimit'));
if (fnInsertIdx >= 0) {
  lines.splice(fnInsertIdx + 1, 0, 'function groupIsClosed(id:string) { return !groupDisplay.value[id]?.open }');
  console.log('Added groupIsClosed function');
}

// Now find and replace the problematic line (index shifted by 1)
const targetIdx = lines.findIndex(l => l.includes('source-chat-sidebar__heading') && l.includes('groupAriaLabel'));
if (targetIdx >= 0) {
  // Build the new line using only ASCII, no ! in template
  const newLine = '        <div class="source-chat-sidebar__heading" :id="group.id' + "+'-session-heading'" + '><button class="group-toggle" :aria-label="groupAriaLabel(group.id)" :aria-expanded="groupIsOpen(group.id)" @click="toggleGroup(group.id)"><span>{{group.title}}</span><span class="pinned-count">{{group.items.length}}</span><ChevronDown :size="12" :class="{closed:groupIsClosed(group.id)}"/></button></div>';
  lines[targetIdx] = newLine;
  console.log('Fixed heading line. New length:', newLine.length);
}

// Fix pagination line
const pagIdx = lines.findIndex(l => l.includes('group-pagination') && l.includes('groupIsOpen'));
if (pagIdx >= 0) {
  const newPag = '        <div v-if="groupIsOpen(group.id)" class="group-pagination"><button v-if="visible(group).length<group.items.length" @click="more(group.id)">' + '{{group.items.length-visible(group).length}}' + '</button><button v-else-if="groupLimit(group.id)>5" @click="collapseGroup(group.id)">' + '收起' + '</button></div>';
  lines[pagIdx] = newPag;
  console.log('Fixed pagination line');
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Done. File written.');

// Verify
const verify = fs.readFileSync(file, 'utf8').split('\n');
const vLine = verify.find(l => l.includes('source-chat-sidebar__heading') && l.includes('groupAriaLabel'));
console.log('Verify heading line has no !:', !vLine.includes('!groupIsOpen'));
console.log('Verify heading line has groupIsClosed:', vLine.includes('groupIsClosed'));
