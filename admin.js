const C=window.SHOPMATE_CONFIG||{};let db=null,products=[];
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const csvFields=['id','name','category','description','price','image_url','active'];
function ready(){if(!C.supabaseUrl||!C.supabaseAnonKey||C.supabaseUrl.includes('YOUR-')){$('loginMsg').textContent='Isi config.js terlebih dahulu.';return false}db=supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);return true}
async function load(){const {data,error}=await db.from('products').select('*').order('created_at',{ascending:true});if(error){$('dbStatus').textContent='Error';alert(error.message);return}products=data||[];renderTable();$('statProducts').textContent=products.length;$('statActive').textContent=products.filter(x=>x.active).length;$('dbStatus').textContent='Terhubung'}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderTable(){$('productTable').innerHTML=products.map(p=>`<tr><td><img src="${esc(p.image_url||'assets/keripik-pisang.png')}" alt=""></td><td><b>${esc(p.name)}</b><br><small>${esc(p.description||'')}</small></td><td>${esc(p.category)}</td><td>${rupiah(p.price)}</td><td><span class="badge">${p.active?'Aktif':'Nonaktif'}</span></td><td class="actions"><button onclick="editProduct('${esc(p.id)}')">✎</button><button onclick="deleteProduct('${esc(p.id)}')">🗑</button></td></tr>`).join('')}
function openModal(p){$('modal').classList.remove('hidden');$('modalTitle').textContent=p?'Edit Produk':'Tambah Produk';$('pid').value=p?.id||'';$('pname').value=p?.name||'';$('pcat').value=p?.category||'Keripik';$('pdesc').value=p?.description||'';$('pprice').value=p?.price??'';$('pimage').value=p?.image_url||'';$('pactive').checked=p?.active!==false}
window.editProduct=id=>openModal(products.find(p=>p.id===id));window.deleteProduct=async id=>{if(!confirm('Hapus produk ini?'))return;const {error}=await db.from('products').delete().eq('id',id);if(error)alert(error.message);else load()};
$('productForm').onsubmit=async e=>{e.preventDefault();const row={name:$('pname').value.trim(),category:$('pcat').value.trim(),description:$('pdesc').value.trim(),price:Number($('pprice').value),image_url:$('pimage').value.trim(),active:$('pactive').checked};const id=$('pid').value;let res=id?await db.from('products').update(row).eq('id',id):await db.from('products').insert(row);if(res.error){$('formMsg').textContent=res.error.message;return}$('modal').classList.add('hidden');load()};
$('addBtn').onclick=()=>openModal();$('closeModal').onclick=()=>$('modal').classList.add('hidden');$('logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};$('loginBtn').onclick=async()=>{if(!ready())return;const {data,error}=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error){$('loginMsg').textContent=error.message;return}start(data.user)};
async function start(user){
  const {data:admin,error:adminError}=await db.from('admin_users').select('email').eq('email',user.email).maybeSingle();
  if(adminError || !admin){await db.auth.signOut();$('loginMsg').textContent='Akun ini bukan admin yang terdaftar.';return}
  $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('adminEmail').textContent=user.email;await load();
  const s=await db.from('settings').select('*').limit(1).maybeSingle();if(s.data){$('storeName').value=s.data.store_name||'';$('waNumber').value=s.data.whatsapp_number||''}
  db.channel('admin-live').on('postgres_changes',{event:'*',schema:'public',table:'products'},load).subscribe();
}
$('saveSettings').onclick=async()=>{const row={store_name:$('storeName').value.trim(),whatsapp_number:$('waNumber').value.trim()};const {data}=await db.from('settings').select('id').limit(1).maybeSingle();const res=data?await db.from('settings').update(row).eq('id',data.id):await db.from('settings').insert(row);$('settingsMsg').textContent=res.error?res.error.message:'Tersimpan'};

// ---------- Bulk CSV import / export ----------
function csvEscape(value){const s=String(value??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function productsToCsv(rows){const lines=[csvFields.join(',')];for(const p of rows){lines.push(csvFields.map(k=>csvEscape(p[k])).join(','))}return '\ufeff'+lines.join('\r\n')+'\r\n'}
function downloadText(filename,text,type='text/csv;charset=utf-8'){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function exportCsv(){downloadText('produk-shopmate.csv',productsToCsv(products));showBulkMsg(`Berhasil export ${products.length} produk ke CSV.`,'ok')}
function templateCsv(){const sample={id:'',name:'Nama Produk Baru',category:'Keripik',description:'Deskripsi produk',price:'18000',image_url:'assets/keripik-pisang.png',active:'true'};downloadText('template-produk-shopmate.csv',productsToCsv([sample]));showBulkMsg('Template CSV berhasil diunduh. Kosongkan kolom id untuk menambahkan produk baru.','ok')}
function showBulkMsg(text,type=''){const el=$('bulkMsg');el.textContent=text;el.className='bulk-msg '+type}
function parseCsv(text){
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(quoted){if(ch==='"'&&next==='"'){cell+='"';i++;}else if(ch==='"'){quoted=false}else cell+=ch}else{if(ch==='"'){quoted=true}else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=ch}}
  if(cell.length||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
  if(!rows.length)return [];
  // Support Excel files exported with semicolon separators.
  if(rows[0].length===1 && rows[0][0].includes(';')) return parseCsv(text.replaceAll(';',','));
  const headers=rows[0].map(h=>h.trim().toLowerCase());return rows.slice(1).filter(r=>r.some(v=>String(v).trim()!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??'').trim()])));
}
function boolValue(v){const s=String(v??'').trim().toLowerCase();if(['true','1','yes','ya','aktif','active'].includes(s))return true;if(['false','0','no','tidak','nonaktif','inactive'].includes(s))return false;return true}
async function importCsvFile(file){
  showBulkMsg('Membaca file CSV...');
  const text=await file.text();const rows=parseCsv(text);
  if(!rows.length){showBulkMsg('CSV kosong atau formatnya tidak valid.','error');return}
  const required=['name','category','price'];const missing=required.filter(k=>!(k in rows[0]));
  if(missing.length){showBulkMsg('Kolom wajib tidak ditemukan: '+missing.join(', '),'error');return}
  const invalid=[];const existingIds=new Set(products.map(p=>p.id));const updates=[];const inserts=[];
  rows.forEach((r,i)=>{const line=i+2;const name=String(r.name||'').trim(),category=String(r.category||'').trim();const price=Number(String(r.price||'').replace(/[^0-9.-]/g,''));if(!name||!category||!Number.isFinite(price)||price<0){invalid.push(`baris ${line}`);return}const row={name,category,description:String(r.description||''),price,image_url:String(r.image_url||''),active:boolValue(r.active)};const id=String(r.id||'').trim();if(id){row.id=id;updates.push(row)}else inserts.push(row)});
  if(invalid.length){showBulkMsg(`Import dibatalkan. Data tidak valid pada ${invalid.join(', ')}.`,'error');return}
  if(updates.length){const {error}=await db.from('products').upsert(updates,{onConflict:'id'});if(error){showBulkMsg('Gagal mengubah produk: '+error.message,'error');return}}
  if(inserts.length){const {error}=await db.from('products').insert(inserts);if(error){showBulkMsg('Sebagian proses berhasil, tetapi penambahan produk gagal: '+error.message,'error');await load();return}}
  await load();showBulkMsg(`Import berhasil: ${updates.length} produk diubah, ${inserts.length} produk ditambahkan.`,'ok');
}
$('exportBtn').onclick=exportCsv;$('templateBtn').onclick=templateCsv;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const file=e.target.files?.[0];if(file)await importCsvFile(file);e.target.value=''};

// Jangan auto-login dari session Supabase yang tersimpan di browser.
ready();
