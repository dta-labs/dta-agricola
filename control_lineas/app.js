const API_URL = './api/index.php';
const CACHE_KEY = 'linea-clara-records-cache-v2';
const $ = selector => document.querySelector(selector);
const dialog = $('#lineDialog');
const form = $('#lineForm');
const lineModal = bootstrap.Modal.getOrCreateInstance(dialog);
let records = loadCache();
let deferredPrompt;

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch { return []; }
}
function cacheRecords() { localStorage.setItem(CACHE_KEY, JSON.stringify(records)); }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = withTime ? new Date(value) : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('es-MX', withTime ? {dateStyle:'medium',timeStyle:'short'} : {dateStyle:'medium'}).format(date);
}
function showToast(message) { const toast=$('#toast'); toast.textContent=message; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2800); }

async function api(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {'Content-Type':'application/json', 'Accept':'application/json', ...(options.headers || {})}
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Error del servidor (${response.status})`);
  return result;
}

async function refreshRecords({quiet = false} = {}) {
  try {
    const result = await api();
    records = result.data || [];
    cacheRecords();
    render();
  } catch (error) {
    render();
    if (!quiet) showToast(records.length ? 'Sin conexión: mostrando la última copia guardada' : error.message);
  }
}

function render() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const device = $('#deviceFilter').value;
  const filtered = records.filter(r => (!device || r.device === device) && Object.values(r).some(v => String(v ?? '').toLowerCase().includes(query)));
  $('#totalCount').textContent = records.length;
  $('#activeCount').textContent = records.filter(r => r.status === 'active').length;
  $('#clientCount').textContent = new Set(records.map(r => r.client.trim().toLowerCase())).size;
  $('#deviceCount').textContent = new Set(records.map(r => r.device)).size;
  $('#resultCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`;
  $('#clearDataBtn').hidden = !records.length;
  $('#linesTable').innerHTML = filtered.map(r => {
    const coordinates = r.latitude !== null && r.latitude !== '' && r.longitude !== null && r.longitude !== '' ? `${r.latitude}, ${r.longitude}` : '';
    const map = coordinates ? `<a class="map-link" href="https://www.google.com/maps?q=${encodeURIComponent(coordinates)}" target="_blank" rel="noopener">${escapeHtml(coordinates)} ↗</a>` : '<span class="subtext">Sin coordenadas</span>';
    return `<tr>
      <td><div class="line-number d-flex align-items-center gap-2"><span class="status-dot ${r.status === 'active' ? '' : 'inactive'}"></span>${escapeHtml(r.phone)}</div><div class="subtext mt-1">ICCID ${escapeHtml(r.iccid)}</div></td>
      <td><strong>${escapeHtml(r.client)}</strong><div class="subtext mt-1">${r.status === 'active' ? 'Línea activa' : 'Línea inactiva'}</div></td>
      <td><span class="device-pill d-inline-block px-2 py-1">${escapeHtml(r.device)}</span></td>
      <td><strong>${escapeHtml(r.location)}</strong><div class="mt-1">${map}</div></td>
      <td>${formatDate(r.installedAt)}</td><td>${formatDate(r.updatedAt,true)}</td>
      <td><div class="actions d-flex gap-1"><button class="icon-btn edit" data-id="${r.id}" title="Editar" aria-label="Editar línea">✎</button><button class="icon-btn delete" data-id="${r.id}" title="Eliminar" aria-label="Eliminar línea">×</button></div></td>
    </tr>`;
  }).join('');
  $('#emptyState').hidden = filtered.length > 0;
  updateDeviceFilter();
}

function updateDeviceFilter() {
  const filter=$('#deviceFilter'), selected=filter.value;
  const devices=[...new Set(records.map(r=>r.device))].sort();
  filter.innerHTML='<option value="">Todos los dispositivos</option>'+devices.map(d=>`<option ${d===selected?'selected':''}>${escapeHtml(d)}</option>`).join('');
}

function openForm(record) {
  form.reset(); $('#recordId').value = record?.id || '';
  $('#dialogTitle').textContent = record ? 'Editar línea' : 'Nueva línea';
  $('#saveBtn').textContent = record ? 'Guardar cambios' : 'Guardar línea';
  if (record) ['iccid','phone','client','device','location','latitude','longitude','installedAt','status'].forEach(k => $(`#${k}`).value=record[k]??'');
  else { $('#installedAt').value = new Date().toISOString().slice(0,10); $('#status').value='active'; }
  lineModal.show();
  dialog.addEventListener('shown.bs.modal', ()=>$('#iccid').focus(), {once:true});
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const id=$('#recordId').value;
  const data={iccid:$('#iccid').value.trim(),phone:$('#phone').value.trim(),client:$('#client').value.trim(),device:$('#device').value,location:$('#location').value.trim(),latitude:$('#latitude').value,longitude:$('#longitude').value,installedAt:$('#installedAt').value,status:$('#status').value};
  const save=$('#saveBtn'); save.disabled=true; save.textContent='Guardando…';
  try {
    await api(id ? `?id=${encodeURIComponent(id)}` : '', {method:id?'PUT':'POST', body:JSON.stringify(data)});
    await refreshRecords({quiet:true});
    lineModal.hide(); showToast(id?'Línea actualizada':'Línea registrada');
  } catch(error) { showToast(error.message); }
  finally { save.disabled=false; save.textContent=id?'Guardar cambios':'Guardar línea'; }
});

$('#linesTable').addEventListener('click', async e => {
  const button=e.target.closest('button[data-id]'); if(!button)return;
  const record=records.find(r=>String(r.id)===button.dataset.id); if(!record)return;
  if(button.classList.contains('edit')) openForm(record);
  if(button.classList.contains('delete')&&confirm(`¿Eliminar la línea ${record.phone}?`)) {
    button.disabled=true;
    try { await api(`?id=${encodeURIComponent(record.id)}`,{method:'DELETE'}); await refreshRecords({quiet:true}); showToast('Línea eliminada'); }
    catch(error) { button.disabled=false; showToast(error.message); }
  }
});
$('#newLineBtn').addEventListener('click',()=>openForm());
$('#emptyAddBtn').addEventListener('click',()=>openForm());
$('#searchInput').addEventListener('input',render);
$('#deviceFilter').addEventListener('change',render);
$('#clearDataBtn').addEventListener('click',async()=>{
  if(!confirm('¿Eliminar todos los registros? Esta acción no se puede deshacer.'))return;
  try { await api('?all=1',{method:'DELETE'}); await refreshRecords({quiet:true}); showToast('Registros eliminados'); }
  catch(error) { showToast(error.message); }
});
$('#year').textContent=new Date().getFullYear();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false;});
$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true;});
window.addEventListener('appinstalled',()=>showToast('Aplicación instalada'));
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
render();
refreshRecords();
