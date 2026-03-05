// INITIAL DATA
let companyProfile = JSON.parse(localStorage.getItem('companyProfile')) || { name:'', reg:'', address:'', phone:'', logo:'', stamp:'' };
let crmData = JSON.parse(localStorage.getItem('crm')) || [];
let inventoryData = JSON.parse(localStorage.getItem('inventory')) || [];
let clientData = JSON.parse(localStorage.getItem('clients')) || [];
let historyData = JSON.parse(localStorage.getItem('history')) || [];
let currentBillItems = [];

// NAVIGATION
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    renderAll();
}

// PROFILE HANDLERS
function handleFileUpload(event, type) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        if (type === 'logo') companyProfile.logo = e.target.result;
        if (type === 'stamp') companyProfile.stamp = e.target.result;
    };
    if (file) reader.readAsDataURL(file);
}

function saveCompanyProfile() {
    companyProfile.name = document.getElementById('conf-name').value;
    companyProfile.reg = document.getElementById('conf-reg').value;
    companyProfile.address = document.getElementById('conf-address').value;
    companyProfile.phone = document.getElementById('conf-phone').value;
    localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
    alert("✅ Profil berjaya dikemaskini!");
    renderAll();
}

// SYNC HANDLERS
function exportData() {
    const data = { companyProfile, crmData, inventoryData, clientData, historyData };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MyBiz_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            localStorage.setItem('companyProfile', JSON.stringify(data.companyProfile || {}));
            localStorage.setItem('crm', JSON.stringify(data.crmData || []));
            localStorage.setItem('inventory', JSON.stringify(data.inventoryData || []));
            localStorage.setItem('clients', JSON.stringify(data.clientData || []));
            localStorage.setItem('history', JSON.stringify(data.historyData || []));
            location.reload();
        } catch (err) { alert("Fail tidak sah!"); }
    };
    reader.readAsText(file);
}

// WHATSAPP
async function startWhatsAppAutopilot() {
    const rawMsg = document.getElementById('wa-message').value;
    const delay = parseInt(document.getElementById('wa-delay').value) * 1000;
    if (!rawMsg) return alert("Sila isi mesej!");
    if (clientData.length === 0) return alert("Tiada pelanggan untuk di-blast!");

    for (let i = 0; i < clientData.length; i++) {
        const c = clientData[i];
        if (!c.phone) continue;
        
        document.getElementById('wa-status').innerText = `Menghantar ke ${c.name}...`;
        let msg = rawMsg.replace(/{nama}/g, c.name);
        let phone = c.phone.replace(/\D/g, '');
        if(!phone.startsWith('6')) phone = '6' + phone;
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        if (i < clientData.length - 1) await new Promise(r => setTimeout(r, delay));
    }
    document.getElementById('wa-status').innerText = "✅ Blast Selesai!";
}

// INVENTORY
document.getElementById('inv-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const newItem = {
        id: editId == "-1" ? Date.now() : parseInt(editId),
        item: document.getElementById('item-name').value,
        qty: parseInt(document.getElementById('item-qty').value),
        price: parseFloat(document.getElementById('item-price').value)
    };

    if (editId == "-1") inventoryData.push(newItem);
    else {
        const idx = inventoryData.findIndex(i => i.id == editId);
        inventoryData[idx] = newItem;
    }
    
    document.getElementById('edit-id').value = "-1";
    document.getElementById('inv-btn').innerText = "Tambah Stok";
    e.target.reset();
    saveAndRender();
});

function editProduct(id) {
    const p = inventoryData.find(i => i.id == id);
    document.getElementById('item-name').value = p.item;
    document.getElementById('item-qty').value = p.qty;
    document.getElementById('item-price').value = p.price;
    document.getElementById('edit-id').value = id;
    document.getElementById('inv-btn').innerText = "Update Stok";
}

// CLIENTS
document.getElementById('client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newClient = {
        id: Date.now(),
        name: document.getElementById('client-name').value,
        phone: document.getElementById('client-phone').value,
        email: document.getElementById('client-email').value
    };
    clientData.push(newClient);
    e.target.reset();
    saveAndRender();
});

// BILLING
function addToBill() {
    const idx = document.getElementById('bill-item-select').value;
    if (idx === "") return;
    const item = inventoryData[idx];
    currentBillItems.push({ ...item });
    renderBillingTable();
}

function removeFromBill(idx) {
    currentBillItems.splice(idx, 1);
    renderBillingTable();
}

function renderBillingTable() {
    const list = document.getElementById('bill-items-list');
    let total = 0;
    list.innerHTML = currentBillItems.map((i, idx) => {
        total += i.price;
        return `<tr><td>${i.item}</td><td style="text-align:right">${i.price.toFixed(2)}</td><td class="no-print"><button onclick="removeFromBill(${idx})" style="color:red">X</button></td></tr>`;
    }).join('');
    document.getElementById('bill-total').innerText = total.toFixed(2);
}

function generateDocument(type) {
    const cIdx = document.getElementById('bill-client-select').value;
    if (cIdx === "" || currentBillItems.length === 0) return alert("Pilih client & barang!");

    // Tolak Stok (Jika bukan Quotation)
    if (type !== 'QUOTATION') {
        currentBillItems.forEach(b => {
            let inv = inventoryData.find(i => i.item === b.item);
            if (inv && inv.qty > 0) inv.qty -= 1;
        });
    }

    // Paparan Header Dokumen
    document.getElementById('bill-type').innerText = type;
    document.getElementById('print-comp-name').innerText = companyProfile.name || "NAMA SYARIKAT";
    document.getElementById('print-comp-reg').innerText = companyProfile.reg;
    document.getElementById('print-comp-addr').innerText = companyProfile.address;
    document.getElementById('print-comp-phone').innerText = companyProfile.phone;
    
    if(companyProfile.logo) { 
        document.getElementById('print-logo').src = companyProfile.logo; 
        document.getElementById('print-logo').style.display='block'; 
    }
    if(companyProfile.stamp) { 
        document.getElementById('print-stamp').src = companyProfile.stamp; 
        document.getElementById('print-stamp').style.display='block'; 
    }

    const docNo = `${type.slice(0,3)}-${Date.now().toString().slice(-4)}`;
    document.getElementById('bill-ref-no').innerText = docNo;
    document.getElementById('bill-date').innerText = new Date().toLocaleDateString('ms-MY');
    
    const client = clientData[cIdx];
    document.getElementById('bill-client-display').innerHTML = `<strong>${client.name}</strong><br>${client.phone}`;
    
    document.getElementById('display-bank').innerText = document.getElementById('bill-bank-name').value || "-";
    document.getElementById('display-acc').innerText = document.getElementById('bill-bank-acc').value || "-";
    document.getElementById('display-holder').innerText = document.getElementById('bill-bank-holder').value || "-";
    document.getElementById('display-remark').innerText = document.getElementById('bill-remark').value || "-";

    // Simpan History
    historyData.push({ 
        id: Date.now(), 
        date: new Date().toLocaleDateString('ms-MY'), 
        docNo, 
        clientName: client.name, 
        amount: document.getElementById('bill-total').innerText, 
        type 
    });
    
    saveAndRender();
    setTimeout(() => { window.print(); }, 700);
}

// RENDER & DELETE
function renderAll() {
    // Inventory
    const invList = document.getElementById('inv-list');
    if(invList) invList.innerHTML = inventoryData.map(d => `<tr><td>${d.item}</td><td>${d.qty}</td><td>RM ${d.price.toFixed(2)}</td><td><button class="btn-edit" onclick="editProduct(${d.id})">Edit</button> <button class="btn-del" onclick="deleteItem('inventory', ${d.id})">Padam</button></td></tr>`).join('');
    
    // Clients
    const clientList = document.getElementById('client-list');
    if(clientList) clientList.innerHTML = clientData.map(d => `<tr><td>${d.name}</td><td>${d.email || '-'}</td><td>${d.phone}</td><td><button class="btn-del" onclick="deleteItem('clients', ${d.id})">Padam</button></td></tr>`).join('');
    
    // Dropdowns
    const clientSelect = document.getElementById('bill-client-select');
    if(clientSelect) clientSelect.innerHTML = '<option value="">-- Pelanggan --</option>' + clientData.map((c,i) => `<option value="${i}">${c.name}</option>`).join('');
    
    const itemSelect = document.getElementById('bill-item-select');
    if(itemSelect) itemSelect.innerHTML = '<option value="">-- Barang --</option>' + inventoryData.map((n,i) => `<option value="${i}">${n.item} (Stok: ${n.qty})</option>`).join('');

    // CRM
    const crmList = document.getElementById('crm-list');
    if(crmList) crmList.innerHTML = crmData.map(d => `<tr><td>${d.name}</td><td><span class="badge ${d.status}">${d.status}</span></td><td><button class="btn-del" onclick="deleteItem('crm', ${d.id})">Padam</button></td></tr>`).join('');

    // History
    const historyList = document.getElementById('history-list');
    if(historyList) historyList.innerHTML = historyData.slice().reverse().map(h => `<tr><td>${h.date}</td><td>${h.docNo}</td><td>${h.clientName}</td><td>RM ${h.amount}</td><td><button class="btn-del" onclick="deleteHistoryItem(${h.id})">Padam</button></td></tr>`).join('');

    // Dashboard Stats
    let totalSales = 0;
    historyData.forEach(h => { if(h.type !== 'QUOTATION') totalSales += parseFloat(h.amount); });
    document.getElementById('dash-total-sales').innerText = `RM ${totalSales.toFixed(2)}`;
    document.getElementById('dash-total-inv').innerText = historyData.length;

    // Load Profile Inputs
    document.getElementById('conf-name').value = companyProfile.name || '';
    document.getElementById('conf-reg').value = companyProfile.reg || '';
    document.getElementById('conf-address').value = companyProfile.address || '';
    document.getElementById('conf-phone').value = companyProfile.phone || '';
}

function deleteItem(type, id) {
    if(!confirm("Padam data ini?")) return;
    if (type === 'crm') crmData = crmData.filter(i => i.id !== id);
    else if (type === 'inventory') inventoryData = inventoryData.filter(i => i.id !== id);
    else if (type === 'clients') clientData = clientData.filter(i => i.id !== id);
    saveAndRender();
}

function deleteHistoryItem(id) {
    if(confirm("Padam rekod ini?")) {
        historyData = historyData.filter(h => h.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
    localStorage.setItem('inventory', JSON.stringify(inventoryData));
    localStorage.setItem('history', JSON.stringify(historyData));
    localStorage.setItem('clients', JSON.stringify(clientData));
    localStorage.setItem('crm', JSON.stringify(crmData));
    renderAll();
}

// CRM Form Event
document.getElementById('crm-form').addEventListener('submit', (e) => {
    e.preventDefault();
    crmData.push({ id: Date.now(), name: document.getElementById('lead-name').value, status: document.getElementById('lead-status').value });
    e.target.reset();
    saveAndRender();
});

// Initial Run
renderAll();
