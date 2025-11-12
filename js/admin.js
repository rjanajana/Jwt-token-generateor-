import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBOrXbkrde5xTxD3q54JF9PwhwhLQ2_nWA",
    authDomain: "emotebot-678ce.firebaseapp.com",
    databaseURL: "https://emotebot-678ce-default-rtdb.firebaseio.com",
    projectId: "emotebot-678ce",
    storageBucket: "emotebot-678ce.firebasestorage.app",
    messagingSenderId: "424825439257",
    appId: "1:424825439257:web:5ca282c6c2d70a086b5688",
    measurementId: "G-24KHRVXERP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Loader Functions
function showLoader() {
    document.getElementById('adminLoader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('adminLoader').classList.add('hidden');
}

// Hash Password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== ADMIN LOGIN =====
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminLoginError');

    showLoader();
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('adminLoginView').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        await loadAllData();
    } catch (error) {
        errorDiv.textContent = '❌ Invalid credentials';
        errorDiv.classList.remove('hidden');
        setTimeout(() => errorDiv.classList.add('hidden'), 3000);
        console.error('Login error:', error);
    } finally {
        hideLoader();
    }
});

// Admin Logout
document.getElementById('adminLogout').addEventListener('click', async () => {
    await signOut(auth);
    location.reload();
});

// Load All Data
async function loadAllData() {
    await loadServers();
    await loadCategories();
    await loadCategoryDropdown();
    await loadEmotes();
    await loadLinks();
    await loadMaintenance();
}

// ===== SERVER MANAGEMENT =====
async function loadServers() {
    const serverList = document.getElementById('serverList');
    serverList.innerHTML = '';
    
    try {
        const serversCol = collection(db, 'servers');
        const snapshot = await getDocs(serversCol);
        
        if (snapshot.empty) {
            serverList.innerHTML = '<p class="no-data">No servers added yet</p>';
            return;
        }
        
        const servers = [];
        snapshot.forEach(doc => {
            servers.push({ id: doc.id, ...doc.data() });
        });
        
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        servers.forEach(server => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div class="admin-item-info">
                    <strong>${server.name}</strong>
                    <span style="color: var(--text-gray); font-size: 12px;">${server.baseUrl}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="action-icon-btn pin" onclick="editServer('${server.id}', '${server.name}', '${server.baseUrl}', ${server.order || 0})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn close" onclick="deleteServer('${server.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            serverList.appendChild(item);
        });
    } catch (error) {
        console.error('Server load error:', error);
        serverList.innerHTML = '<p class="error-text">Error loading servers</p>';
    }
}

document.getElementById('serverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editServerId').value;
    const name = document.getElementById('serverName').value;
    const baseUrl = document.getElementById('serverUrl').value;
    const order = parseInt(document.getElementById('serverOrder').value) || 0;

    showLoader();
    try {
        const serverData = { name, baseUrl, order };
        
        if (editId) {
            await updateDoc(doc(db, 'servers', editId), serverData);
        } else {
            await addDoc(collection(db, 'servers'), serverData);
        }
        
        document.getElementById('serverForm').reset();
        document.getElementById('editServerId').value = '';
        document.getElementById('serverBtnText').textContent = 'ADD SERVER';
        document.getElementById('cancelServerEdit').classList.add('hidden');
        await loadServers();
        alert('✅ Server saved successfully!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error('Server save error:', error);
    } finally {
        hideLoader();
    }
});

window.editServer = (id, name, url, order) => {
    document.getElementById('editServerId').value = id;
    document.getElementById('serverName').value = name;
    document.getElementById('serverUrl').value = url;
    document.getElementById('serverOrder').value = order;
    document.getElementById('serverBtnText').textContent = 'UPDATE SERVER';
    document.getElementById('cancelServerEdit').classList.remove('hidden');
    window.scrollTo(0, 0);
};

window.deleteServer = async (id) => {
    if (confirm('❌ Delete this server?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'servers', id));
            await loadServers();
            alert('✅ Server deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
};

document.getElementById('cancelServerEdit').addEventListener('click', () => {
    document.getElementById('serverForm').reset();
    document.getElementById('editServerId').value = '';
    document.getElementById('serverBtnText').textContent = 'ADD SERVER';
    document.getElementById('cancelServerEdit').classList.add('hidden');
});

// ===== CATEGORY MANAGEMENT =====
async function loadCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        
        if (snapshot.empty) {
            categoryList.innerHTML = '<p class="no-data">No categories added yet</p>';
            return;
        }
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div class="admin-item-info">
                    <strong>${cat.icon || ''} ${cat.name}</strong>
                    <span style="color: var(--text-gray); font-size: 12px;">Order: ${cat.order || 0}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="action-icon-btn pin" onclick='editCategory("${cat.id}", "${cat.name}", "${cat.icon || ''}", ${cat.order || 0})'>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn close" onclick="deleteCategory('${cat.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            categoryList.appendChild(item);
        });
    } catch (error) {
        console.error('Category load error:', error);
    }
}

async function loadCategoryDropdown() {
    try {
        const categoriesCol = collection(db, 'categories');
        const snapshot = await getDocs(categoriesCol);
        const select = document.getElementById('emoteCategory');
        
        select.innerHTML = '<option value="">Select Category</option>';
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = `${cat.icon || ''} ${cat.name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Category dropdown error:', error);
    }
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editCategoryId').value;
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value;
    const order = parseInt(document.getElementById('categoryOrder').value) || 0;

    showLoader();
    try {
        const categoryData = { name, icon, order };
        
        if (editId) {
            await updateDoc(doc(db, 'categories', editId), categoryData);
        } else {
            await addDoc(collection(db, 'categories'), categoryData);
        }
        
        document.getElementById('categoryForm').reset();
        document.getElementById('editCategoryId').value = '';
        document.getElementById('categoryBtnText').textContent = 'ADD CATEGORY';
        document.getElementById('cancelCategoryEdit').classList.add('hidden');
        await loadCategories();
        await loadCategoryDropdown();
        alert('✅ Category saved!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        hideLoader();
    }
});

window.editCategory = (id, name, icon, order) => {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryIcon').value = icon;
    document.getElementById('categoryOrder').value = order;
    document.getElementById('categoryBtnText').textContent = 'UPDATE CATEGORY';
    document.getElementById('cancelCategoryEdit').classList.remove('hidden');
    window.scrollTo(0, 0);
};

window.deleteCategory = async (id) => {
    if (confirm('❌ Delete this category?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'categories', id));
            await loadCategories();
            await loadCategoryDropdown();
            alert('✅ Category deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
};

document.getElementById('cancelCategoryEdit').addEventListener('click', () => {
    document.getElementById('categoryForm').reset();
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryBtnText').textContent = 'ADD CATEGORY';
    document.getElementById('cancelCategoryEdit').classList.add('hidden');
});

// ===== EMOTE MANAGEMENT =====
async function loadEmotes() {
    const emoteList = document.getElementById('emoteList');
    emoteList.innerHTML = '';
    
    try {
        const emotesCol = collection(db, 'emotes');
        const snapshot = await getDocs(emotesCol);
        
        if (snapshot.empty) {
            emoteList.innerHTML = '<p class="no-data">No emotes added yet</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const emote = doc.data();
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <div class="admin-item-info" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${emote.imageUrl}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 8px;">
                    <div>
                        <strong>${emote.emoteId}</strong>
                        <span style="color: var(--text-gray); font-size: 12px; display: block;">Category: ${emote.category}</span>
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="action-icon-btn pin" onclick='editEmote("${doc.id}", "${emote.imageUrl}", "${emote.category}")'>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn close" onclick="deleteEmote('${doc.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            emoteList.appendChild(item);
        });
    } catch (error) {
        console.error('Emote load error:', error);
    }
}

document.getElementById('emoteImageUrl').addEventListener('input', (e) => {
    const url = e.target.value;
    const preview = document.getElementById('emotePreview');
    if (url) {
        preview.innerHTML = `<img src="${url}" style="max-width: 150px; max-height: 150px; border-radius: 10px;">`;
    } else {
        preview.innerHTML = '';
    }
});

document.getElementById('emoteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('editEmoteId').value;
    const imageUrl = document.getElementById('emoteImageUrl').value;
    const category = document.getElementById('emoteCategory').value;
    
    // Extract emote ID from URL
    const filename = imageUrl.split('/').pop();
    const emoteId = filename.split('.')[0];

    showLoader();
    try {
        const emoteData = { imageUrl, category, emoteId };
        
        if (editId) {
            await updateDoc(doc(db, 'emotes', editId), emoteData);
        } else {
            await addDoc(collection(db, 'emotes'), emoteData);
        }
        
        document.getElementById('emoteForm').reset();
        document.getElementById('editEmoteId').value = '';
        document.getElementById('emoteBtnText').textContent = 'ADD EMOTE';
        document.getElementById('cancelEmoteEdit').classList.add('hidden');
        document.getElementById('emotePreview').innerHTML = '';
        await loadEmotes();
        alert('✅ Emote saved!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        hideLoader();
    }
});

window.editEmote = (id, url, category) => {
    document.getElementById('editEmoteId').value = id;
    document.getElementById('emoteImageUrl').value = url;
    document.getElementById('emoteCategory').value = category;
    document.getElementById('emoteBtnText').textContent = 'UPDATE EMOTE';
    document.getElementById('cancelEmoteEdit').classList.remove('hidden');
    document.getElementById('emotePreview').innerHTML = `<img src="${url}" style="max-width: 150px; max-height: 150px; border-radius: 10px;">`;
    window.scrollTo(0, document.getElementById('emoteForm').offsetTop - 100);
};

window.deleteEmote = async (id) => {
    if (confirm('❌ Delete this emote?')) {
        showLoader();
        try {
            await deleteDoc(doc(db, 'emotes', id));
            await loadEmotes();
            alert('✅ Emote deleted!');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            hideLoader();
        }
    }
};

document.getElementById('cancelEmoteEdit').addEventListener('click', () => {
    document.getElementById('emoteForm').reset();
    document.getElementById('editEmoteId').value = '';
    document.getElementById('emoteBtnText').textContent = 'ADD EMOTE';
    document.getElementById('cancelEmoteEdit').classList.add('hidden');
    document.getElementById('emotePreview').innerHTML = '';
});

// ===== FOOTER LINKS =====
async function loadLinks() {
    try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const links = docSnap.data();
            document.getElementById('telegramUrl').value = links.telegram || '';
            document.getElementById('githubUrl').value = links.github || '';
            document.getElementById('discordUrl').value = links.discord || '';
            document.getElementById('youtubeUrl').value = links.youtube || '';
        }
    } catch (error) {
        console.log('Footer links not configured');
    }
}

document.getElementById('linksForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await setDoc(doc(db, 'settings', 'footerLinks'), {
            telegram: document.getElementById('telegramUrl').value,
            github: document.getElementById('githubUrl').value,
            discord: document.getElementById('discordUrl').value,
            youtube: document.getElementById('youtubeUrl').value
        });
        alert('✅ Links updated!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        hideLoader();
    }
});

// ===== MAINTENANCE MODE =====
async function loadMaintenance() {
    try {
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('maintenanceToggle').checked = data.enabled || false;
            document.getElementById('maintenanceMessage').value = data.message || '';
        }
    } catch (error) {
        console.log('Maintenance settings not configured');
    }
}

document.getElementById('maintenanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await setDoc(doc(db, 'settings', 'maintenance'), {
            enabled: document.getElementById('maintenanceToggle').checked,
            message: document.getElementById('maintenanceMessage').value
        });
        alert('✅ Maintenance settings saved!');
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        hideLoader();
    }
});

// ===== PASSWORD MANAGER =====
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    
    showLoader();
    try {
        const hash = await hashPassword(newPassword);
        await setDoc(doc(db, 'settings', 'loginPassword'), { hash });
        alert('✅ Password updated!\nNew password: ' + newPassword);
        document.getElementById('newPassword').value = '';
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        hideLoader();
    }
});

console.log('🔥 PHANTOMS Admin Panel Ready!');
