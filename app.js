const C=window.SHOPMATE_CONFIG||{};
const sample=[
{id:'1',name:'Keripik Pisang',category:'Keripik',description:'Renyah & gurih',price:18000,image_url:'assets/keripik-pisang.png',active:true},
{id:'2',name:'Keripik Tempe Daun Jeruk',category:'Keripik',description:'Gurih & wangi',price:26000,image_url:'assets/keripik-tempe.png',active:true},
{id:'3',name:'Basreng Pedas',category:'Makanan Ringan',description:'Pedas nagih',price:24000,image_url:'assets/basreng-pedas.png',active:true},
{id:'4',name:'Pilus Keju',category:'Makanan Ringan',description:'Praktis & lezat',price:20000,image_url:'assets/pilus-keju.png',active:true},
{id:'5',name:'Kacang Bawang',category:'Kacang-kacangan',description:'Sehat & bergizi',price:22000,image_url:'assets/kacang-bawang.png',active:true}
];
let products=[...sample],cart=JSON.parse(localStorage.getItem('shopmate_cart')||'[]'),db=null;
window.PADE_PRODUCTS = products;
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const save=()=>localStorage.setItem('shopmate_cart',JSON.stringify(cart));
function initDB(){if(C.supabaseUrl&&C.supabaseAnonKey&&!C.supabaseUrl.includes('YOUR-')){db=supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);loadProducts();db.channel('products-live').on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>loadProducts()).subscribe()}else render();}
async function loadProducts(){try{const {data,error}=await db.from('products').select('*').eq('active',true).order('created_at',{ascending:true});if(!error&&data?.length){products=data;window.PADE_PRODUCTS=products;}render()}catch(e){render()}}
function render(){renderCategories();renderProducts();renderCart();const footerName=document.getElementById('footerStoreName');if(footerName)footerName.textContent=C.storeName||'Keripik Pade'}
function renderCategories(){const cats=[...new Set(products.map(p=>p.category).filter(Boolean))];const row=document.getElementById('categoryRow'),select=document.getElementById('category');row.innerHTML=cats.slice(0,4).map((c,i)=>`<div class="category" data-cat="${c}"><img src="${products.find(p=>p.category===c)?.image_url||'assets/keripik-pisang.png'}"><div><b>${c}</b><small>${i===0?'Renyah & gurih':i===1?'Praktis & lezat':i===2?'Manis & nagih':'Sehat & bergizi'}</small></div><i>→</i></div>`).join('');select.innerHTML='<option value="">Semua Kategori</option>'+cats.map(c=>`<option>${c}</option>`).join('');row.querySelectorAll('.category').forEach(el=>el.onclick=()=>{select.value=el.dataset.cat;renderProducts()})}
let productPage=1;
const PRODUCTS_PER_PAGE=15;
function renderProducts(){
 const q=document.getElementById('search').value.toLowerCase(),cat=document.getElementById('category').value;
 const list=products.filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!cat||p.category===cat));
 const totalPages=Math.max(1,Math.ceil(list.length/PRODUCTS_PER_PAGE));
 if(productPage>totalPages) productPage=totalPages;
 const start=(productPage-1)*PRODUCTS_PER_PAGE;
 const pageItems=list.slice(start,start+PRODUCTS_PER_PAGE);
 const grid=document.getElementById('productGrid');
 grid.innerHTML=pageItems.map(p=>{const qty=cart.find(x=>x.id===p.id)?.qty||0;return `<article class="product-card"><img src="${p.image_url||'assets/keripik-pisang.png'}" alt="${p.name}"><h3>${p.name}</h3><div class="price">${rupiah(p.price)}</div><div class="qty"><button onclick="changeQty('${p.id}',-1)">−</button><span>${qty}</span><button onclick="changeQty('${p.id}',1)">+</button></div><button class="add" onclick="changeQty('${p.id}',1)">Tambah ke Keranjang</button></article>`}).join('')||'<div style="grid-column:1/-1;padding:30px;text-align:center;color:#8a796d">Produk tidak ditemukan.</div>';
 renderProductPagination(totalPages,list.length);
}
function renderProductPagination(totalPages,totalItems){
 let nav=document.getElementById('productPagination');
 if(!nav){nav=document.createElement('div');nav.id='productPagination';document.getElementById('productGrid').after(nav)}
 if(totalPages<=1){nav.innerHTML='';nav.style.display='none';return}
 nav.style.display='flex';
 const buttons=[];
 buttons.push(`<button class="page-btn" ${productPage===1?'disabled':''} onclick="goProductPage(${productPage-1})">‹</button>`);
 for(let i=1;i<=totalPages;i++){
   if(i===1||i===totalPages||Math.abs(i-productPage)<=1) buttons.push(`<button class="page-btn ${i===productPage?'active':''}" onclick="goProductPage(${i})">${i}</button>`);
   else if((i===2&&productPage>3)||(i===totalPages-1&&productPage<totalPages-2)) buttons.push('<span class="page-dots">…</span>');
 }
 buttons.push(`<button class="page-btn" ${productPage===totalPages?'disabled':''} onclick="goProductPage(${productPage+1})">›</button>`);
 nav.innerHTML=buttons.join('')+`<span class="page-info">${totalItems} produk</span>`;
}
function goProductPage(page){
 productPage=Math.max(1,page);
 renderProducts();
 const heading=document.getElementById('productGrid');
 if(heading) heading.scrollIntoView({behavior:'smooth',block:'start'});
}

function changeQty(id,d){const p=products.find(x=>x.id===id);if(!p)return;let item=cart.find(x=>x.id===id);if(!item&&d>0){cart.push({...p,qty:1})}else if(item){item.qty+=d;if(item.qty<=0)cart=cart.filter(x=>x.id!==id)}save();renderProducts();renderCart()}
function renderCart(){const wrap=document.getElementById('cartItems');document.getElementById('cartCount').textContent=cart.reduce((a,b)=>a+b.qty,0);if(!cart.length){wrap.innerHTML='<div style="padding:20px 0;color:#8d7d72;font-size:11px">Keranjang kamu masih kosong.</div>';document.getElementById('cartTotal').textContent=rupiah(0);return}wrap.innerHTML=cart.map(x=>`<div class="cart-item"><img src="${x.image_url}"><div><b>${x.name}</b><small>${rupiah(x.price)}</small><div class="mini-qty"><button onclick="changeQty('${x.id}',-1)">−</button>${x.qty}<button onclick="changeQty('${x.id}',1)">+</button></div></div><button class="remove" onclick="changeQty('${x.id}',-${x.qty})">♲</button></div>`).join('');document.getElementById('cartTotal').textContent=rupiah(cart.reduce((s,x)=>s+x.price*x.qty,0))}
function checkout(){if(!cart.length){document.getElementById('checkoutHint').textContent='Tambahkan produk ke keranjang dulu.';return}const name=document.getElementById('customerName').value.trim()||'Pelanggan';const note=document.getElementById('customerNote').value.trim();const total=cart.reduce((s,x)=>s+x.price*x.qty,0);const lines=cart.map(x=>`• ${x.name} x${x.qty} = ${rupiah(x.price*x.qty)}`).join('%0A');const msg=`Halo ${C.storeName||'ShopMate AI'}, saya ingin pesan:%0A%0A${lines}%0A%0ATotal: ${rupiah(total)}%0ANama: ${encodeURIComponent(name)}${note?`%0ACatatan: ${encodeURIComponent(note)}`:''}`;const num=(C.whatsappNumber||'628XXXXXXXXXX').replace(/\D/g,'');if(num.includes('XXXXXXXX')){document.getElementById('checkoutHint').textContent='Isi nomor WhatsApp toko di config.js terlebih dahulu.';return}window.open(`https://wa.me/${num}?text=${msg}`,'_blank')}
function tanyaShopper(){const num=(C.whatsappNumber||'628XXXXXXXXXX').replace(/\D/g,'');if(num.includes('XXXXXXXX')){alert('Isi nomor WhatsApp toko di config.js terlebih dahulu.');return}const msg='Halo Toko Keripik Pade, saya mau daftar menjadi Reseller Pade.%0ANama : %0AAlamat :';window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank')}
document.getElementById('search').addEventListener('input',()=>{productPage=1;renderProducts()});document.getElementById('category').addEventListener('change',()=>{productPage=1;renderProducts()});document.getElementById('clearCart').onclick=()=>{cart=[];save();renderProducts();renderCart()};document.getElementById('checkoutBtn').onclick=checkout;document.getElementById('cartJump').onclick=()=>document.getElementById('cartCard').scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('tanyaShopper').addEventListener('click',e=>{e.preventDefault();tanyaShopper()});initDB();
