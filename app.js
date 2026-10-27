const $ = id => document.getElementById(id);
let token = localStorage.getItem('pp_token') || '';
let me = null, authMode = 'login', actionMode = 'add';
const money = cents => '₹' + (Number(cents || 0) / 100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path, options={}) {
  const res = await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(options.headers||{})}});
  const data = await res.json().catch(()=>({error:'Unexpected server response'}));
  if(!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),3200)}
function showAuth(){ $('authView').classList.remove('hidden');$('appView').classList.add('hidden'); }
function showApp(){ $('authView').classList.add('hidden');$('appView').classList.remove('hidden');const ad=document.querySelector('.home-ad');if(ad)ad.classList.remove('hidden');$('userName').textContent=me.name;$('avatar').textContent=(me.name||'U').trim().charAt(0).toUpperCase();if($('balance'))$('balance').textContent=money(me.balance);$('adminNav').classList.toggle('hidden',me.role!=='admin');renderAll().catch(e=>toast(e.message));refreshRewardSummary().catch(e=>toast(e.message));}
function setAuthMode(mode){authMode=mode;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('nameLabel').classList.toggle('hidden',mode==='login');$('phoneLabel').classList.toggle('hidden',mode==='login');$('name').required=mode==='register';$('phone').required=mode==='register';$('authSubmit').textContent=mode==='login'?'Login':'Create account';$('password').autocomplete=mode==='login'?'current-password':'new-password';$('authError').textContent='';}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.mode)));
$('fillUser').onclick=()=>{$('email').value='user@pudinapay.demo';$('password').value='DemoUser123!';setAuthMode('login')};
$('fillAdmin').onclick=()=>{$('email').value='admin@pudinapay.demo';$('password').value='DemoAdmin123!';setAuthMode('login')};
$('authForm').onsubmit=async e=>{e.preventDefault();$('authError').textContent='';try{const path=authMode==='login'?'/auth/login':'/auth/register';const body={email:$('email').value.trim(),password:$('password').value};if(authMode==='register'){body.name=$('name').value.trim();body.phone=$('phone').value.trim();}const d=await api(path,{method:'POST',body:JSON.stringify(body)});token=d.token;me=d.user;localStorage.setItem('pp_token',token);showApp()}catch(err){$('authError').textContent=err.message}};
function logout(){token='';me=null;localStorage.removeItem('pp_token');showAuth()}
$('settingsLogout').onclick=logout;
function gotoPage(page){if(page==='scan')stopCamera();document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$('page-'+page)?.classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('appView').classList.toggle('home-mode',page==='home');const ad=document.querySelector('.home-ad');if(ad)ad.classList.toggle('hidden',page!=='home');if(page==='history')loadTransactions('historyList');if(page==='notifications')loadNotifications();if(page==='qr')renderQR();if(page==='admin')loadAdmin();if(page==='scan')setScanStatus('Camera scanner ready.');if(page==='recharge')renderRechargePlans();if(page==='settings')renderSettings();window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>gotoPage(b.dataset.page)));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.action==='recharge')gotoPage('recharge');else openAction(b.dataset.action)}));
$('avatar').onclick=()=>gotoPage('qr');
if($('addBtn'))$('addBtn').onclick=()=>openAction('add');if($('sendBtn'))$('sendBtn').onclick=()=>openAction('send');
function openAction(mode, recipient=''){actionMode=mode;$('dialogTitle').textContent=mode==='add'?'Add demo money':'Send demo money';$('dialogDesc').textContent=mode==='add'?'Increase your simulated balance. No payment will be charged.':'Transfer simulated balance to another registered demo account.';$('amountWrap').classList.remove('hidden');$('recipientWrap').classList.toggle('hidden',mode!=='send');$('sourceBankWrap').classList.toggle('hidden',mode!=='send');if(mode==='send')renderBankSelect();$('amount').value=mode==='add'?100:10;$('recipientEmail').value=recipient;$('recipientPhone').value='';$('recipientNameLookup').textContent='Enter a registered Pudina Pay mobile number to look up the recipient name.';$('actionSubmit').textContent=mode==='add'?'Add demo balance':'Continue transfer';$('actionDialog').showModal();}

let recipientLookupTimer=null;
$('recipientPhone').addEventListener('input',()=>{clearTimeout(recipientLookupTimer);const phone=$('recipientPhone').value.replace(/\D/g,'');$('recipientNameLookup').textContent='';if(!/^[6-9]\d{9}$/.test(phone)){ $('recipientNameLookup').textContent='Enter a valid 10-digit number.';return;}recipientLookupTimer=setTimeout(async()=>{try{const d=await api('/users/lookup-phone?phone='+encodeURIComponent(phone));$('recipientNameLookup').textContent='Recipient: '+d.name;}catch(e){$('recipientNameLookup').textContent=e.message.includes('not found')?'No Pudina Pay account found for this number.':'Could not look up name yet.';}},350)});

$('actionForm').onsubmit=async e=>{e.preventDefault();try{const amount=Number($('amount').value);if(!Number.isInteger(amount)||amount<1)throw new Error('Enter a whole-rupee amount.');let d;if(actionMode==='add'){d=await api('/wallet/add-demo',{method:'POST',body:JSON.stringify({amount})})}else{d=await api('/wallet/send-demo',{method:'POST',body:JSON.stringify({amount,recipientEmail:$('recipientEmail').value.trim(),recipientPhone:$('recipientPhone').value.trim(),sourceBankId:$('sourceBank').value})})}$('actionDialog').close();toast(d.message);await refreshMe();await renderAll()}catch(err){toast(err.message)}};
async function refreshMe(){const d=await api('/me');me=d.user;if($('balance'))$('balance').textContent=money(me.balance);$('userName').textContent=me.name;$('avatar').textContent=me.name.trim().charAt(0).toUpperCase();await refreshRewardSummary()}
async function refreshRewardSummary(){try{const d=await api('/rewards/summary');if($('rewardBalance'))$('rewardBalance').textContent=money(d.rewardBalance);if($('withdrawAvailable'))$('withdrawAvailable').textContent=money(d.rewardBalance);if($('payoutHistory'))$('payoutHistory').innerHTML=d.payouts.length?'<h3>Withdrawal requests</h3>'+d.payouts.map(p=>`<div class="item"><div class="item-main"><b>${money(p.amount)}</b><small>${esc(p.upi_id)} · ${esc(p.status)} · ${esc(p.created_at)}</small></div></div>`).join(''):'<p class="muted">No withdrawal requests yet.</p>';}catch(e){if($('rewardBalance'))$('rewardBalance').textContent='₹0.00';}}
function txItem(t){const credit=t.type==='CREDIT';const raw=String(t.note||'Transaction');const match=raw.match(/(?:Transfer to|Transfer from)\s+(.+?)(?:\s+— simulated)?$/i);const person=match?match[1]:raw;const initial=(person.trim().replace(/^.*[@\s]/,'').charAt(0)|| (credit?'C':'D')).toUpperCase();const txnId='PP'+String(t.id||'').padStart(8,'0');return `<div class="item tx-item"><div class="person-avatar ${credit?'credit-avatar':'debit-avatar'}" aria-label="${credit?'Credit':'Debit'} profile avatar">${esc(initial)}</div><div class="item-main"><b>${esc(person)}</b><small><span class="tx-kind ${credit?'credit-kind':'debit-kind'}">${credit?'CREDIT (+)':'DEBIT (−)'} · ${money(t.amount)}</span></small><small>${esc(t.created_at)} · ${esc(t.status)}</small><button class="text-btn tx-detail" type="button" data-txid="${esc(txnId)}" data-note="${esc(raw)}" data-amount="${esc(money(t.amount))}" data-type="${credit?'CREDIT':'DEBIT'}" data-status="${esc(t.status)}" data-date="${esc(t.created_at)}">${esc(txnId)} · View details</button></div><div class="amount-value ${credit?'credit':'debit'}">${credit?'+':'−'}${money(t.amount)}</div></div>`}
async function loadTransactions(target){const d=await api('/transactions');const html=d.transactions.length?d.transactions.map(txItem).join(''):'<div class="empty">No demo transactions yet.</div>';$ (target).innerHTML=html;document.querySelectorAll('[data-txid]').forEach(b=>b.onclick=()=>{alert('Transaction ID: '+b.dataset.txid+'\nType: '+b.dataset.type+'\nAmount: '+b.dataset.amount+'\nStatus: '+b.dataset.status+'\nDate: '+b.dataset.date+'\nDetails: '+b.dataset.note+'\n\nMessage option will require a connected messaging backend.');});}
async function loadNotifications(){const d=await api('/notifications');$('notificationList').innerHTML=d.notifications.length?d.notifications.map(n=>`<div class="item"><div class="item-icon">${n.read?'✓':'♧'}</div><div class="item-main"><b>${esc(n.message)}</b><small>${esc(n.created_at)} · ${n.read?'Read':'New'}</small></div>${n.read?'':`<button class="text-btn" data-read="${n.id}">Mark read</button>`}</div>`).join(''):'<div class="empty">You are all caught up.</div>';document.querySelectorAll('[data-read]').forEach(b=>b.onclick=async()=>{await api('/notifications/'+b.dataset.read+'/read',{method:'POST'});loadNotifications();updateNotifDot()});updateNotifDot(d.notifications)}
async function updateNotifDot(items){if(!items){try{items=(await api('/notifications')).notifications}catch{return}}$('notifDot').classList.toggle('hidden',!items.some(n=>!n.read))}
function makeQr(target,payload){const box=$(target);box.innerHTML='';if(window.QRCode){new QRCode(box,{text:payload,width:180,height:180,colorDark:'#163e30',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}else{box.textContent=payload}}
function accountQrPayload(bank){return JSON.stringify({app:'Pudina Pay',mode:'DEMO_ONLY',name:me.name,email:me.email,phone:me.phone||'',bankId:bank?.id||'personal',bankName:bank?.bank||''})}
async function renderQR(){ $('qrName').textContent=me.name;$('qrEmail').textContent=me.email;makeQr('qrCanvas',accountQrPayload(null));const banks=getDemoBanks();$('bankQrList').innerHTML=banks.length?banks.map((b,i)=>`<div class="qr-card bank-qr-card"><div class="bank-logo">${esc(b.logo||'🏦')}</div><div id="bankQr${i}" class="qr-box"></div><h3>${esc(b.bank)}</h3><p class="muted">${esc(b.holder||me.name)} · ••••${esc(b.last4||'0000')}</p><div class="share-actions"><button class="primary" type="button" data-share-qr="${i}">Share QR</button><button class="ghost" type="button" data-share-platform="whatsapp" data-share-qr="${i}">WhatsApp</button><button class="ghost" type="button" data-share-platform="facebook" data-share-qr="${i}">Facebook</button><button class="ghost" type="button" data-share-platform="instagram" data-share-qr="${i}">Instagram</button></div></div>`).join(''):'<div class="empty">No bank QR yet. Add a bank in Settings.</div>';banks.forEach((b,i)=>makeQr('bankQr'+i,accountQrPayload(b)));}
$('copyQr').onclick=async()=>{const payload=accountQrPayload(null);try{await navigator.clipboard.writeText(payload);toast('My QR text copied.')}catch{toast(payload)}};
async function qrPngBlob(targetId){const box=$(targetId);const node=box?.querySelector('canvas')||box?.querySelector('img');if(!node)return null;if(node.tagName==='CANVAS')return await new Promise(resolve=>node.toBlob(resolve,'image/png'));const res=await fetch(node.src);return await res.blob()}
async function shareQr(targetId,payload,label,platform='native'){const text=`${label}\n${me.name} — Pudina Pay\n${payload}`;if(platform==='whatsapp'){window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');return;}if(platform==='facebook'){window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.origin)+'&quote='+encodeURIComponent(text),'_blank','noopener');return;}if(platform==='instagram'){try{await navigator.clipboard.writeText(text)}catch{};if(navigator.share){try{const blob=await qrPngBlob(targetId);if(blob&&typeof File!=='undefined'){const file=new File([blob], 'pudina-pay-qr.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({title:label,text:`${me.name} — Pudina Pay`,files:[file]});return;}}}catch(e){if(e.name==='AbortError')return;}}window.open('https://www.instagram.com/','_blank','noopener');toast('QR text copied if clipboard permission is available. Instagram may require selecting the saved QR image manually.');return;}try{const blob=await qrPngBlob(targetId);if(blob&&typeof File!=='undefined'&&navigator.share){const file=new File([blob],'pudina-pay-qr.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({title:label,text:`${me.name} — Pudina Pay`,files:[file]});return;}}if(navigator.share){await navigator.share({title:label,text});return;}await navigator.clipboard.writeText(text);toast('QR details copied. Choose an app to share.');}catch(e){if(e.name!=='AbortError')toast('Sharing unavailable in this browser. Try WhatsApp or copy QR text.')}}
$('shareMyQr').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'My Pudina Pay QR');$('shareMyQrWhatsApp').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'My Pudina Pay QR','whatsapp');$('shareMyQrFacebook').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'My Pudina Pay QR','facebook');$('shareMyQrInstagram').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'My Pudina Pay QR','instagram');$('shareScan').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'Pudina Pay QR');$('shareScanWhatsApp').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'Pudina Pay QR','whatsapp');$('shareScanFacebook').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'Pudina Pay QR','facebook');$('shareScanInstagram').onclick=()=>shareQr('qrCanvas',accountQrPayload(null),'Pudina Pay QR','instagram');document.addEventListener('click',e=>{const b=e.target.closest('[data-share-qr]');if(!b)return;const i=Number(b.dataset.shareQr);const banks=getDemoBanks();const bank=banks[i];if(!bank)return;const plat=b.dataset.sharePlatform||'native';shareQr('bankQr'+i,accountQrPayload(bank),bank.bank+' QR',plat)});
// QR camera and gallery scanning. This app accepts only Pudina Pay account QR payloads.
let qrStream=null, qrScanTimer=null;
function setScanStatus(msg){$('scanStatus').textContent=msg}
function parsePudinaQR(raw){
  try { const d=JSON.parse(raw); if(d && d.app==='Pudina Pay' && (d.email || d.phone)) return d; } catch {}
  // Also accept a simple Pudina Pay recipient URI.
  try { const u=new URL(raw); if(u.protocol==='pudinapay:' && u.hostname==='pay'){return {app:'Pudina Pay',email:u.searchParams.get('email')||'',phone:u.searchParams.get('phone')||''};} } catch {}
  return null;
}
function useScannedQR(raw){const d=parsePudinaQR(raw);if(!d){setScanStatus('यह Pudina Pay का समर्थित QR नहीं है।');return;}if(d.email){openAction('send',d.email);$('recipientNameLookup').textContent='QR account: '+(d.name||d.email);setScanStatus('खाता मिला: '+(d.name||d.email)+'। राशि डालकर ट्रांसफर की पुष्टि करें।');}else if(d.phone){openAction('send');$('recipientPhone').value=d.phone;$('recipientNameLookup').textContent='QR account: '+(d.name||d.phone);setScanStatus('खाता मिला: '+(d.name||d.phone)+'। राशि डालकर ट्रांसफर की पुष्टि करें।');}}
async function stopCamera(){if(qrScanTimer){clearInterval(qrScanTimer);qrScanTimer=null;}if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null;}$('qrVideo').srcObject=null;$('qrVideo').classList.add('hidden');$('scanPlaceholder').classList.remove('hidden');$('stopCamera').classList.add('hidden');$('startCamera').classList.remove('hidden')}
$('startCamera').onclick=async()=>{
  if(!('BarcodeDetector' in window)){setScanStatus('इस ब्राउज़र में कैमरा QR स्कैनिंग उपलब्ध नहीं है। गैलरी से QR इमेज चुनें या Chrome के नए संस्करण में खोलें।');return;}
  try { const detector=new BarcodeDetector({formats:['qr_code']});qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const v=$('qrVideo');v.srcObject=qrStream;v.classList.remove('hidden');$('scanPlaceholder').classList.add('hidden');$('startCamera').classList.add('hidden');$('stopCamera').classList.remove('hidden');await v.play();setScanStatus('QR को कैमरे के सामने रखें…');qrScanTimer=setInterval(async()=>{try{if(v.readyState>=2){const codes=await detector.detect(v);if(codes.length){await stopCamera();useScannedQR(codes[0].rawValue);}}}catch{}},500); } catch(e){setScanStatus('कैमरा नहीं खुला। अनुमति दें या गैलरी से QR इमेज चुनें।');}
};
$('stopCamera').onclick=stopCamera;
$('qrImageInput').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;if(!('BarcodeDetector' in window)){setScanStatus('गैलरी QR स्कैनिंग के लिए Android Chrome का नया संस्करण इस्तेमाल करें।');return;}try{const bitmap=await createImageBitmap(f);const detector=new BarcodeDetector({formats:['qr_code']});const codes=await detector.detect(bitmap);bitmap.close?.();if(codes.length)useScannedQR(codes[0].rawValue);else setScanStatus('इस तस्वीर में QR कोड नहीं मिला।');}catch{setScanStatus('इस तस्वीर को स्कैन नहीं कर सके। दूसरी साफ QR तस्वीर चुनें।');}finally{e.target.value='';}};
window.addEventListener('pagehide',stopCamera);
async function loadAdmin(){try{const d=await api('/admin/overview');$('adminStats').innerHTML=`<div class="stat"><small>Accounts</small><b>${d.stats.users}</b></div><div class="stat"><small>Transactions</small><b>${d.stats.transactions}</b></div><div class="stat"><small>Credit volume*</small><b>${money(d.stats.simulatedVolume)}</b></div>`;$('adminUsers').innerHTML=d.users.map(u=>`<div class="item"><div class="item-icon">${u.role==='admin'?'A':'U'}</div><div class="item-main"><b>${esc(u.name)} ${u.role==='admin'?'· Admin':''}</b><small>${esc(u.email)}</small></div><div class="amount-value">${money(u.balance)}</div></div>`).join('');$('adminTransactions').innerHTML=d.transactions.length?d.transactions.map(t=>txItem({...t,note:t.email+' · '+t.note})).join(''):'<div class="empty">No transactions yet.</div>'}catch(e){$('adminStats').innerHTML='<div class="empty">Could not load admin data.</div>';toast(e.message)}}
async function renderAll(){await Promise.all([loadTransactions('recentList'),updateNotifDot()]);if(me.role==='admin')loadAdmin();}


// Service-specific recharge and bill forms. Examples are UI previews; live offers/payments require an authorized provider API.
const planExamples=[
 {price:199,validity:'28 days',data:'2 GB/day',calls:'Unlimited voice',sms:'100 SMS/day',label:'Daily data plan'},
 {price:299,validity:'28 days',data:'1.5 GB/day',calls:'Unlimited voice',sms:'100 SMS/day',label:'Value plan'},
 {price:349,validity:'28 days',data:'2 GB/day',calls:'Unlimited voice',sms:'100 SMS/day',label:'Popular plan'},
 {price:579,validity:'56 days',data:'1.5 GB/day',calls:'Unlimited voice',sms:'100 SMS/day',label:'2-month plan'},
 {price:899,validity:'90 days',data:'2 GB/day',calls:'Unlimited voice',sms:'100 SMS/day',label:'Long validity'}
];
const rechargeConfigs={
 'Prepaid Mobile':{operators:['Jio','Airtel','Vi','BSNL'],label:'10-digit mobile number',placeholder:'Enter mobile number',input:'tel',hint:'Choose a plan to see data, calling, SMS and validity.'},
 'Data Pack':{operators:['Jio','Airtel','Vi','BSNL'],label:'10-digit mobile number',placeholder:'Enter mobile number',input:'tel',hint:'Data-pack examples are shown in the plan list.'},
 'Postpaid Mobile':{operators:['Jio','Airtel','Vi','BSNL'],label:'Postpaid mobile number',placeholder:'Enter postpaid number',input:'tel',hint:'Enter the number and bill amount shown by your operator.'},
 'DTH':{operators:['Tata Play','Airtel Digital TV','Dish TV','Sun Direct','d2h'],label:'DTH customer ID / subscriber number',placeholder:'Enter DTH customer ID',input:'text',hint:'Use the customer ID from your DTH provider.'},
 'Electricity':{operators:['UPPCL','PVVNL','DVVNL','MVVNL','PuVVNL','Other board'],label:'Electricity account / consumer number',placeholder:'Enter consumer number',input:'text',hint:'Check the board and consumer number on your electricity bill.'},
 'Broadband':{operators:['JioFiber','Airtel Xstream Fiber','BSNL Bharat Fiber','ACT Fibernet','Other'],label:'Broadband account / customer ID',placeholder:'Enter customer ID',input:'text',hint:'Use your internet provider account ID.'},
 'Gas':{operators:['Indane','Bharat Gas','HP Gas','PNG / City Gas','Other'],label:'LPG consumer number / customer ID',placeholder:'Enter consumer ID',input:'text',hint:'Choose your gas provider and use the customer ID on your bill/book.'},
 'Water':{operators:['Municipal Water Board','Jal Board','Other water provider'],label:'Water connection / consumer number',placeholder:'Enter water consumer number',input:'text',hint:'Use the account number printed on your water bill.'},
 'Landline':{operators:['BSNL','Airtel','Jio','MTNL','Other'],label:'Landline number with STD code',placeholder:'Enter landline number',input:'tel',hint:'Include the STD code if your provider requires it.'},
 'FASTag':{operators:['SBI FASTag','HDFC FASTag','ICICI FASTag','Airtel Payments Bank FASTag','Paytm FASTag','Other bank'],label:'Vehicle registration / FASTag ID',placeholder:'Enter vehicle number or FASTag ID',input:'text',hint:'Choose the FASTag issuer linked to your vehicle.'}
};
function renderRechargePlans(){const box=$('mobilePlans');if(box)box.classList.add('hidden')}
function populateRechargeForm(service){const cfg=rechargeConfigs[service]||rechargeConfigs['Prepaid Mobile'];$('rechargeType').value=service;$('rechargeDialogTitle').textContent=service==='Electricity'||service==='Broadband'||service==='Gas'||service==='Water'||service==='Landline'?'Pay '+service+' Bill':service+' Recharge';$('rechargeOperator').innerHTML=cfg.operators.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');$('rechargeOperatorLabel').firstChild.textContent=service==='Electricity'?'Electricity board':service==='Gas'?'Gas provider':service==='Water'?'Water provider':service==='FASTag'?'FASTag issuer':service==='DTH'?'DTH operator':service==='Broadband'?'Broadband provider':service==='Landline'?'Telephone provider':'Operator';$('rechargeNumberLabel').firstChild.textContent=cfg.label;$('rechargeNumber').placeholder=cfg.placeholder;$('rechargeNumber').type=cfg.input;$('rechargeNumber').value='';$('rechargeNumber').setAttribute('autocomplete','off');$('rechargeAmount').value=service==='Prepaid Mobile'||service==='Data Pack'?'199':'';$('rechargeAmount').placeholder='Enter amount';$('rechargeFormStatus').textContent=cfg.hint||'';$('rechargeForm').dataset.planInfo='';}
function openRechargeService(service){if(service==='Prepaid Mobile'||service==='Data Pack'){const box=$('mobilePlans');box.classList.remove('hidden');box.scrollIntoView({behavior:'smooth',block:'start'});renderPlanCards(service);}else{populateRechargeForm(service);$('rechargeDialog').showModal();}}
function renderPlanCards(service='Prepaid Mobile'){const op=$('planOperator').value;const dataPlans=service==='Data Pack';$('mobilePlans').querySelector('h3').textContent=dataPlans?'Mobile data packs':'Mobile recharge plans';$('planList').innerHTML=planExamples.map((p,i)=>{const plan=dataPlans?{...p,label:'Data pack',calls:'Data only'}:p;return `<button type="button" class="plan-card" data-plan="${i}"><div class="plan-price">₹${plan.price}<span>${plan.label}</span></div><div class="plan-benefits"><b>${plan.validity}</b><span>${plan.data}</span><span>${plan.calls}</span><span>${plan.sms}</span></div><span class="plan-select">Select plan →</span></button>`}).join('');document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{const p=planExamples[Number(b.dataset.plan)];const phone=$('planPhone').value.trim();if(!/^[6-9]\d{9}$/.test(phone)){toast('Enter a valid 10-digit mobile number first.');$('planPhone').focus();return}const chosenService=service;$('mobilePlans').classList.add('hidden');populateRechargeForm(chosenService);$('rechargeOperator').value=op;$('rechargeNumber').value=phone;$('rechargeAmount').value=p.price;$('rechargeForm').dataset.planInfo=`${p.validity}; ${p.data}; ${p.calls}; ${p.sms}`;$('rechargeFormStatus').textContent=`Selected: ₹${p.price} · ${p.validity} · ${p.data} · ${p.calls} · ${p.sms}. These are example details, not live operator offers.`;$('rechargeDialog').showModal();});}
document.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>openRechargeService(b.dataset.service)));
$('planOperator')?.addEventListener('change',()=>renderPlanCards($('mobilePlans').querySelector('h3').textContent.toLowerCase().includes('data')?'Data Pack':'Prepaid Mobile'));
$('closePlans')?.addEventListener('click',()=>$('mobilePlans').classList.add('hidden'));
$('rechargeType')?.addEventListener('change',()=>populateRechargeForm($('rechargeType').value));
$('rechargeForm')?.addEventListener('submit',e=>{e.preventDefault();const service=$('rechargeType').value,number=$('rechargeNumber').value.trim(),amount=Number($('rechargeAmount').value);if(!number||!Number.isFinite(amount)||amount<=0){toast('Enter valid service details and amount.');return}const detail=$('rechargeForm').dataset.planInfo?`\nPlan: ${$('rechargeForm').dataset.planInfo}`:'';$('rechargeFormStatus').textContent=`Details checked: ${service} · ${$('rechargeOperator').value} · ${number} · ₹${amount.toFixed(2)}${detail}. Preview only—no bill was paid or recharge submitted.`;toast('Service details ready. Live recharge provider is not connected.');});

// Demo bank catalogue and mobile OTP flow. Real bank linking requires an authorized provider.
const bankCatalogue=[
 {name:'State Bank of India',logo:'SBI'},
 {name:'HDFC Bank',logo:'HDFC'},
 {name:'ICICI Bank',logo:'ICICI'},
 {name:'Axis Bank',logo:'AXIS'},
 {name:'Kotak Mahindra Bank',logo:'KOTAK'},
 {name:'IndusInd Bank',logo:'INDUS'},
 {name:'Yes Bank',logo:'YES'},
 {name:'IDFC FIRST Bank',logo:'IDFC'},
 {name:'Federal Bank',logo:'FED'},
 {name:'Bandhan Bank',logo:'BANDHAN'},
 {name:'RBL Bank',logo:'RBL'},
 {name:'South Indian Bank',logo:'SIB'},
 {name:'Karnataka Bank',logo:'KBL'},
 {name:'Karur Vysya Bank',logo:'KVB'},
 {name:'City Union Bank',logo:'CUB'},
 {name:'CSB Bank',logo:'CSB'},
 {name:'DCB Bank',logo:'DCB'},
 {name:'Tamilnad Mercantile Bank',logo:'TMB'},
 {name:'Punjab National Bank',logo:'PNB'},
 {name:'Bank of Baroda',logo:'BOB'},
 {name:'Canara Bank',logo:'CANARA'},
 {name:'Union Bank of India',logo:'UBI'},
 {name:'Bank of India',logo:'BOI'},
 {name:'Indian Bank',logo:'IB'},
 {name:'Central Bank of India',logo:'CBI'},
 {name:'UCO Bank',logo:'UCO'},
 {name:'Bank of Maharashtra',logo:'BOM'},
 {name:'Punjab & Sind Bank',logo:'PSB'},
 {name:'Indian Overseas Bank',logo:'IOB'},
 {name:'IDBI Bank',logo:'IDBI'},
 {name:'AU Small Finance Bank',logo:'AU'},
 {name:'Ujjivan Small Finance Bank',logo:'UJJIVAN'},
 {name:'Equitas Small Finance Bank',logo:'EQUITAS'},
 {name:'Jana Small Finance Bank',logo:'JANA'},
 {name:'ESAF Small Finance Bank',logo:'ESAF'},
 {name:'Suryoday Small Finance Bank',logo:'SURYODAY'},
 {name:'Utkarsh Small Finance Bank',logo:'UTKARSH'},
 {name:'Unity Small Finance Bank',logo:'UNITY'},
 {name:'Capital Small Finance Bank',logo:'CAPITAL'},
 {name:'North East Small Finance Bank',logo:'NESFB'},
 {name:'India Post Payments Bank',logo:'IPPB'},
 {name:'Airtel Payments Bank',logo:'AIRTEL'},
 {name:'Fino Payments Bank',logo:'FINO'},
 {name:'NSDL Payments Bank',logo:'NSDL'},
 {name:'Jammu & Kashmir Bank',logo:'JKB'},
 {name:'Kashmir Bank',logo:'KB'},
 {name:'Jammu and Kashmir Bank',logo:'JKB'},
 {name:'Maharashtra Gramin Bank',logo:'MGB'},
 {name:'Kerala Gramin Bank',logo:'KGB'},
 {name:'Baroda UP Bank',logo:'BUPB'},
 {name:'Uttar Pradesh Gramin Bank',logo:'UPGB'},
 {name:'Aryavart Bank',logo:'ARYAVART'},
 {name:'Bihar Gramin Bank',logo:'BGB'},
 {name:'Rajasthan Marudhara Gramin Bank',logo:'RMGB'},
 {name:'Punjab Gramin Bank',logo:'PGB'},
 {name:'Himachal Pradesh Gramin Bank',logo:'HPGB'},
 {name:'Odisha Gramya Bank',logo:'OGB'},
 {name:'Assam Gramin Vikash Bank',logo:'AGVB'},
 {name:'Tripura Gramin Bank',logo:'TGB'},
 {name:'Bangiya Gramin Vikash Bank',logo:'BGVB'},
 {name:'Andhra Pradesh Grameena Vikas Bank',logo:'APGVB'},
 {name:'Telangana Grameena Bank',logo:'TGB'},
 {name:'Karnataka Gramin Bank',logo:'KRGB'},
 {name:'Tamil Nadu Grama Bank',logo:'TNGB'},
 {name:'Madhya Pradesh Gramin Bank',logo:'MPGB'},
 {name:'Chhattisgarh Rajya Gramin Bank',logo:'CRGB'},
 {name:'Jharkhand Rajya Gramin Bank',logo:'JRGB'},
 {name:'Uttarakhand Gramin Bank',logo:'UKGB'},
 {name:'Haryana Gramin Bank',logo:'HGB'},
 {name:'Saurashtra Gramin Bank',logo:'SGB'},
 {name:'Vidharbha Konkan Gramin Bank',logo:'VKGB'}
];let chosenBank=null, demoOtp=null;
function bankStorageKey(){return 'pp_demo_banks_'+String(me?.email||'guest').toLowerCase()}
function getDemoBanks(){try{return JSON.parse(localStorage.getItem(bankStorageKey())||'[]')}catch{return []}}
function saveDemoBanks(items){localStorage.setItem(bankStorageKey(),JSON.stringify(items))}
function renderBankChoices(){const q=($('bankSearch').value||'').trim().toLowerCase();const list=bankCatalogue.filter(b=>b.name.toLowerCase().includes(q));$('bankChoices').innerHTML=list.map(b=>`<button type="button" class="bank-choice" data-bank="${esc(b.name)}"><span class="bank-logo">${b.logo}</span><span>${esc(b.name)}</span><span>＋</span></button>`).join('')||'<div class="empty">No bank found. Try another name.</div>';document.querySelectorAll('[data-bank]').forEach(btn=>btn.onclick=()=>{chosenBank=bankCatalogue.find(b=>b.name===btn.dataset.bank);$('chosenBankLabel').textContent=chosenBank.logo+'  '+chosenBank.name;$('bankLinkFlow').classList.remove('hidden');$('bankOtpStep').classList.add('hidden');$('bankLinkPhone').value=me.phone||'';});}
function renderBankRows(target){const banks=getDemoBanks();$(target).innerHTML=banks.length?banks.map((b,i)=>`<div class="item"><div class="item-icon">${esc(b.logo||'🏦')}</div><div class="item-main"><b>${esc(b.bank)}</b><small>${esc(b.holder||me.name)} · ••••${esc(b.last4||'0000')} · Mobile verified (test)</small></div><button class="text-btn" type="button" data-check-bank="${i}">Check balance</button><button class="text-btn" type="button" data-remove-bank="${i}">Remove</button></div>`).join(''):'<div class="empty">No bank accounts added.</div>';$(target).querySelectorAll('[data-check-bank]').forEach(btn=>btn.onclick=()=>{const b=getDemoBanks()[Number(btn.dataset.checkBank)];const pin=prompt('Enter your 4-digit Pudina Pay app PIN for '+b.bank+' (demo only):');if(pin===null)return;if(!/^\d{4}$/.test(pin)){toast('Enter a 4-digit app PIN.');return}if(pin!==b.pin){toast('Incorrect PIN for this bank account.');return}alert(b.bank+' demo balance: Not available from the bank. Bank API is not connected.');});$(target).querySelectorAll('[data-remove-bank]').forEach(btn=>btn.onclick=()=>{const a=getDemoBanks();a.splice(Number(btn.dataset.removeBank),1);saveDemoBanks(a);renderSettings();$('bankAccountSummary').textContent=a.length?`${a.length} demo bank account(s) saved.`:'No bank account added yet.';renderBankRows('balanceBankList');renderQR();});}
function renderSettings(){if(!me)return;$('settingsUser').textContent=`${me.name} · ${me.email}`;renderBankRows('settingsBankList');}
function renderBankSelect(){const select=$('sourceBank');const banks=getDemoBanks();select.innerHTML='<option value="wallet">Pudina Pay wallet (simulated)</option>'+banks.map((b,i)=>`<option value="${esc(b.id)}">${esc(b.bank)} · ••••${esc(b.last4)}</option>`).join('');}
function openBankDialog(){chosenBank=null;demoOtp=null;$('bankSearch').value='';$('bankLinkFlow').classList.add('hidden');$('bankOtpStep').classList.add('hidden');renderBankChoices();$('bankDialog').showModal()}
$('bankSearch').addEventListener('input',renderBankChoices);
if($('checkBalanceBtn'))$('checkBalanceBtn').onclick=async()=>{try{await refreshMe();$('balanceDialogValue').textContent=money(me.balance);const banks=getDemoBanks();$('bankAccountSummary').textContent=banks.length?`${banks.length} demo bank account(s) saved.`:'No bank account added yet.';renderBankRows('balanceBankList');$('balanceDialog').showModal()}catch(e){toast(e.message)}};
if($('withdrawRewardBtn'))$('withdrawRewardBtn').onclick=async()=>{try{await refreshRewardSummary();$('withdrawStatus').textContent='';$('withdrawAmount').value='1.00';$('withdrawDialog').showModal()}catch(e){toast(e.message)}};
if($('withdrawForm'))$('withdrawForm').addEventListener('submit',async e=>{e.preventDefault();$('withdrawStatus').textContent='Submitting request…';try{const amount=Number($('withdrawAmount').value);const upiId=$('withdrawUpi').value.trim();const d=await api('/rewards/withdraw',{method:'POST',body:JSON.stringify({amount,upiId})});$('withdrawStatus').textContent=d.message;await refreshRewardSummary();await renderAll()}catch(err){$('withdrawStatus').textContent=err.message}});
$('openBankAccount').onclick=openBankDialog;$('settingsAddBank').onclick=openBankDialog;
$('requestBankOtp').onclick=()=>{const phone=$('bankLinkPhone').value.trim();if(!/^[6-9]\d{9}$/.test(phone)){toast('Enter a valid 10-digit mobile number.');return}if(!/^\d{4}$/.test($('bankPinInput').value.trim())){toast('Create a 4-digit Pudina Pay app PIN for this bank.');return}demoOtp=String(Math.floor(100000+Math.random()*900000));$('bankOtpHint').textContent='Test OTP: '+demoOtp+' (shown only for this demo; no SMS is sent).';$('bankOtpStep').classList.remove('hidden');toast('Demo OTP generated.')};
$('verifyBankOtp').onclick=()=>{if(!chosenBank||!demoOtp){toast('Select a bank and request the test OTP first.');return}if($('bankOtpInput').value.trim()!==demoOtp){toast('OTP does not match.');return}const accounts=getDemoBanks();if(accounts.some(a=>a.bank===chosenBank.name&&a.phone===$('bankLinkPhone').value.trim())){toast('This demo bank is already added.');return}accounts.push({holder:me.name,bank:chosenBank.name,logo:chosenBank.logo,last4:String(Date.now()).slice(-4),phone:$('bankLinkPhone').value.trim(),pin:$('bankPinInput').value.trim(),ifsc:'DEMO0000000',id:'bank_'+Date.now()});saveDemoBanks(accounts);$('bankDialog').close();$('bankOtpInput').value='';demoOtp=null;renderSettings();renderBankRows('balanceBankList');renderBankSelect();renderQR();toast('Demo bank linked after OTP verification.');};
async function init(){try{if(token){const d=await api('/me');me=d.user;showApp()}else showAuth()}catch{token='';localStorage.removeItem('pp_token');showAuth()}}
init();


// Commission split estimator. Rates are the user's supplied indicative provider rates.
// It never credits a reward: that must wait for provider-confirmed success and commission settlement.
const commissionRates={
 'Vodafone':[3.30,3.40,3.50], 'Airtel':[1.30,1.40,1.50], 'Jio':[0.80,0.90,1.00],
 'BSNL':[3.40,3.50,3.60], 'Idea':[3.30,3.40,3.50], 'Dish TV':[3.60,3.70,3.80],
 'Airtel Digital TV':[3.50,3.60,3.70], 'Sun Direct':[3.30,3.40,3.50],
 'Videocon DTH':[4.00,4.10,4.20], 'Tata Play':[3.50,3.60,3.70]
};
function updateCommissionEstimate(){
 const operator=$('commissionOperator')?.value||'Jio';
 const tier=['starter','gold','platinum'].indexOf($('commissionTier')?.value||'starter');
 const amount=Number($('commissionAmount')?.value||0);
 const rate=(commissionRates[operator]||commissionRates.Jio)[Math.max(0,tier)];
 const valid=Number.isFinite(amount)&&amount>0&&amount<=1000000;
 const gross=valid?Math.round(amount*rate)/100:0;
 const customer=Math.round(gross*70)/100;
 const owner=Math.round(gross*30)/100;
 $('commissionGross').textContent=money(Math.round(gross*100));
 $('commissionCustomer').textContent=money(Math.round(customer*100));
 $('commissionOwner').textContent=money(Math.round(owner*100));
}
['commissionTier','commissionOperator','commissionAmount'].forEach(id=>$(id)?.addEventListener('input',updateCommissionEstimate));
['commissionTier','commissionOperator'].forEach(id=>$(id)?.addEventListener('change',updateCommissionEstimate));
updateCommissionEstimate();
