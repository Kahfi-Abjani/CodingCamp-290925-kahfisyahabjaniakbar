/* Clean, robust implementation */
let tasks = JSON.parse(localStorage.getItem('tasks')||'[]');
const taskBody = document.getElementById('taskBody');
const emptyRow = document.getElementById('emptyRow');
const fileInput = document.getElementById('fileInput');
const globalFill = document.getElementById('globalFill');
const globalPercent = document.getElementById('globalPercent');
const sumTotal = document.getElementById('sumTotal');
const sumCompleted = document.getElementById('sumCompleted');
const sumPending = document.getElementById('sumPending');
const toastEl = document.getElementById('toast');
let sortState = {key:null,dir:'asc'};



function saveTasks(){
  localStorage.setItem('tasks', JSON.stringify(tasks));
}


function now() {
  return new Date().toISOString();
}


function showToast(msg){
  toastEl.textContent = msg; toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'), 3000); 
}


function addTask(){ 
  const t = document.getElementById('taskInput').value.trim();
  const d = document.getElementById('dateInput').value;
  if(!t){ showToast('Tasks cannot be empty'); return; }
  if(!d){ showToast('A date & time must be selected'); return; }

  const selected = new Date(d);
  const nowDate = new Date();
  if(selected < nowDate){
    showToast('The due date cannot be in the past');
    return;
  }
  tasks.push({task:t,date:d,created:now(),updated:'',status:'Pending'});
  saveTasks(); renderTasks(); document.getElementById('taskInput').value=''; document.getElementById('dateInput').value=''; showToast('Task added');
}


// Format tanggal jadi dd/mm/YYYY
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// Format created/updated jadi dd/mm/YYYY hh:mm
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}


// Format khusus untuk export (supaya rapi di file)
function formatExportDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}


function renderTasks(){
  taskBody.innerHTML='';
  if(tasks.length===0){ taskBody.appendChild(emptyRow); return; }

  let display = [...tasks];

  // --- filtering ---
  const searchVal = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const statusVal = document.getElementById('statusFilter')?.value || 'all';

  display = display.filter(t=>{
    const matchSearch = t.task.toLowerCase().includes(searchVal);
    const matchStatus = (statusVal === 'all') || (t.status === statusVal);
    return matchSearch && matchStatus;
  });

  // --- sorting ---
  if(sortState.key){
    display.sort((a,b)=>{
      let va=(a[sortState.key]||'').toString().toLowerCase(); 
      let vb=(b[sortState.key]||'').toString().toLowerCase();
      if(va<vb) return sortState.dir==='asc'?-1:1;
      if(va>vb) return sortState.dir==='asc'?1:-1;
      return 0;
    });
  }

  if(display.length===0){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="empty">No tasks match the filter</td>`;
    taskBody.appendChild(tr);
    updateSummary();
    return;
  }


  // --- render rows ---
  display.forEach((task, index)=>{
    const tr = document.createElement('tr');
    // ✅ Cek expired
    const nowTime = new Date();
    if (task.date && new Date(task.date) < nowTime && task.status === 'Pending') {
      tr.classList.add('expired');
    }
    tr.innerHTML = `
      <td>${escapeHtml(task.task)}</td>
      <td>${formatDateTime(task.created)}</td>
      <td>${formatDate(task.date||'-')}</td>
      <td>${formatDateTime(task.updated||'-')}</td>
      <td>
        <input type="checkbox" class="status-checkbox" data-i="${index}" 
          ${task.status==='Completed'?'checked':''}>
      </td>
      <td>
        <div class="mini-wrap">
          <div class="mini-fill" style="width:${task.status==='Completed'?'100%':'0%'}"></div>
        </div>
      </td>
      <td>
        <button class="action-btn edit" data-i="${index}" title="Edit">✏️</button>
        <button class="action-btn delete" data-i="${index}" title="Delete">🗑</button>
      </td>
    `;
    taskBody.appendChild(tr);
  });


  // bind buttons
  document.querySelectorAll('.status-checkbox').forEach(cb => {
    cb.addEventListener('change', e => {
      const i = +e.target.getAttribute('data-i');
      tasks[i].status = e.target.checked ? 'Completed' : 'Pending';
      tasks[i].updated = now();
      saveTasks();
      renderTasks();
      updateSummary();
      showToast('Status updated');
    });
  });
  document.querySelectorAll('.action-btn.edit').forEach(btn=> btn.addEventListener('click', e=>{
    const i = +e.currentTarget.getAttribute('data-i'); const newVal = prompt('Edit task', tasks[i].task); if(newVal!==null){ tasks[i].task = newVal; tasks[i].updated = now(); saveTasks(); renderTasks(); showToast('Task updated'); }
  }));
  document.querySelectorAll('.action-btn.delete').forEach(btn=> btn.addEventListener('click', e=>{
    const i = +e.currentTarget.getAttribute('data-i'); if(confirm('Delete task?')){ tasks.splice(i,1); saveTasks(); renderTasks(); updateSummary(); showToast('Task deleted'); }
  }));
  updateSummary();
}


function updateSummary(){
  const total = tasks.length; const completed = tasks.filter(t=>t.status==='Completed').length; const pending = total-completed;
  sumTotal.textContent = total; sumCompleted.textContent = completed; sumPending.textContent = pending;
  const pct = total? Math.round((completed/total)*100):0; globalFill.style.width = pct+'%'; globalPercent.textContent = pct+'%';
}


function escapeHtml(s){
   if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


function escapeCsv(s) {
  if (s == null) return '';
  let str = String(s);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// sorting
document.querySelectorAll('#taskTable th[data-sort]').forEach(th=> th.addEventListener('click', ()=>{
  const k = th.getAttribute('data-sort'); if(sortState.key===k) sortState.dir = sortState.dir==='asc'?'desc':'asc'; else { sortState.key=k; sortState.dir='asc'; } document.querySelectorAll('#taskTable th').forEach(h=> h.classList.remove('sorted-asc','sorted-desc')); th.classList.add(sortState.dir==='asc'?'sorted-asc':'sorted-desc'); renderTasks();
}));

// file input handling for import
fileInput.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const name = f.name.toLowerCase();
  if(name.endsWith('.csv')){
    const reader = new FileReader();
    reader.onload = ev=>{
      const rows = ev.target.result.split(/\r?\n/).filter(Boolean);
      const data = rows.slice(1).map(l=>{
        const cols = l.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
        return {
          task: cols[0] || '',
          created: cols[1] || now(),
          date: cols[2] || '',
          updated: cols[3] || '',
          status: cols[4] || 'Pending'
        }
      });
      tasks = tasks.concat(data);
      saveTasks(); renderTasks(); updateSummary();
      showToast('CSV import successful: '+data.length+' rows');
    };
    reader.readAsText(f);
  } else if(name.endsWith('.xls')||name.endsWith('.xlsx')){
    const reader = new FileReader(); reader.onload = ev=>{ const data = new Uint8Array(ev.target.result); const wb = XLSX.read(data,{type:'array'}); const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(ws,{defval:''}); const mapped = json.map(row=>({ task: row.task||row.Task||'', created: row.created||now(), date: row.date||row.Date||'', updated: row.updated||'', status: row.status||'Pending' })); tasks = tasks.concat(mapped); saveTasks(); renderTasks(); updateSummary(); showToast('Excel import successful: '+mapped.length+' rows'); }; reader.readAsArrayBuffer(f);
  }
  fileInput.value = '';
});

// tombol Import CSV
document.getElementById('importCsvBtn').addEventListener('click', () => {
  fileInput.accept = ".csv";  // hanya izinkan file csv
  fileInput.click();
});

// tombol Import Excel
document.getElementById('importXlsBtn').addEventListener('click', () => {
  fileInput.accept = ".xls,.xlsx";  // hanya izinkan excel
  fileInput.click();
});


// export CSV
document.getElementById('exportCsvBtn').addEventListener('click', ()=>{
  if(tasks.length===0){ showToast('No data to export'); return; }
  let csv = 'task,created,date,updated,status\n'; 
  tasks.forEach(t=> {
    csv += [
      escapeCsv(t.task),
      escapeCsv(formatExportDateTime(t.created)),
      escapeCsv(formatDate(t.date)),
      escapeCsv(formatExportDateTime(t.updated)),
      escapeCsv(t.status)
    ].join(',') + '\n';
  });
  const blob = new Blob([csv],{type:'text/csv'}); 
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(blob); 
  a.download = 'tasks.csv'; 
  a.click(); 
  URL.revokeObjectURL(a.href); 
  showToast('CSV export successful');
});

// export Excel
document.getElementById('exportXlsBtn').addEventListener('click', ()=>{
  if(tasks.length===0){ 
    showToast('No data to export'); 
    return; 
  }

  const ordered = tasks.map(t => [
    t.task || '',
    formatExportDateTime(t.created),
    formatDate(t.date || ''),
    formatExportDateTime(t.updated),
    t.status || 'Pending'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([
    ["task","created","date","updated","status"], 
    ...ordered
  ]);

  const wb = XLSX.utils.book_new(); 
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks'); 
  XLSX.writeFile(wb, 'tasks.xlsx'); 
  showToast('Excel export successful'); 
});

// delete all
document.getElementById('deleteAllBtn').addEventListener('click', ()=>{ if(confirm('Delete all tasks?')){ tasks = []; saveTasks(); renderTasks(); updateSummary(); showToast('All tasks are deleted'); } });

// add listener for add button and dark toggle
document.getElementById('addTaskBtn').addEventListener('click', addTask);
const darkToggleBtn = document.getElementById('darkToggle');

darkToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  
  // Simpan preferensi
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  // Ubah icon & tooltip
  darkToggleBtn.textContent = isDark ? 'Switch to Mode : ☀️' : 'Switch to Mode : 🌙';
  darkToggleBtn.title = isDark ? 'Toggle light mode' : 'Toggle dark mode';
});

// Saat halaman dibuka, set icon sesuai theme tersimpan
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  darkToggleBtn.textContent = 'Switch to Mode : ☀️';
  darkToggleBtn.title = 'Toggle light mode';
} else {
  darkToggleBtn.textContent = 'Switch to Mode : 🌙';
  darkToggleBtn.title = 'Toggle dark mode';
}
document.getElementById('searchInput').addEventListener('input', renderTasks);
document.getElementById('statusFilter').addEventListener('change', renderTasks);

// restore theme and initial render
if(localStorage.getItem('theme')==='dark') document.body.classList.add('dark');
renderTasks();

// ✅ auto-refresh tiap 30 detik untuk cek expired
setInterval(() => {
  renderTasks();
}, 30000);
