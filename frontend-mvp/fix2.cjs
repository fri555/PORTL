const fs = require('fs');
const file = 'src/components/chat/source-clone/SourceChatSidebar.vue';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Add groupIsClosed helper after groupLimit
const fnIdx = lines.findIndex(l => l.includes('function groupLimit'));
if (fnIdx >= 0) {
  lines.splice(fnIdx + 1, 0, 'function groupIsClosed(id:string) { return !groupDisplay.value[id]?.open }');
}

// Fix heading line - replace !groupIsOpen with groupIsClosed in :class
const hIdx = lines.findIndex(l => l.includes('source-chat-sidebar__heading') && l.includes('groupAriaLabel'));
if (hIdx >= 0) {
  lines[hIdx] = lines[hIdx].replace('!groupIsOpen(group.id)', 'groupIsClosed(group.id)');
}

fs.writeFileSync(file, lines.join('\n'));

// Verify
const v = fs.readFileSync(file, 'utf8').split('\n');
const hLine = v.find(l => l.includes('source-chat-sidebar__heading') && l.includes('groupAriaLabel'));
console.log('Heading line contains groupIsClosed:', hLine && hLine.includes('groupIsClosed'));
console.log('Heading line contains !groupIsOpen:', hLine && hLine.includes('!groupIsOpen'));
console.log('groupIsClosed function exists:', v.some(l => l.includes('function groupIsClosed')));
