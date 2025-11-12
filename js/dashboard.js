import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, collection, getDocs, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State Variables
let currentCategory = null;
let selectedEmoteId = null;
let selectedServerUrl = null;
let uidCount = 1;
const maxUids = 5;
let toastQueue = [];
let isProcessingToast = false;

// Check Authentication
if (!sessionStorage.getItem('auth')) {
    window.location.href = 'index.html';
}

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('auth');
    window.location.href = 'index.html';
}); 

// Loader Functions
function showLoader() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

// ===== TOAST NOTIFICATION SYSTEM (INSTANT) =====
function showToast(message, type = 'success') {
    toastQueue.push({ message, type });
    if (!isProcessingToast) {
        processToastQueue();
    }
}

async function processToastQueue() {
    if (toastQueue.length === 0) {
        isProcessingToast = false;
        return;
    }
    
    isProcessingToast = true;
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    });
    
    // INSTANT: No delay before showing toast
    const { message, type } = toastQueue.shift();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(async () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
            // Process next toast in queue
            if (toastQueue.length > 0) {
                processToastQueue();
            } else {
                isProcessingToast = false;
            }
        }, 300);
    }, 3000);
}

// ===== LOAD SERVERS FROM FIREBASE =====
async function loadServers() {
    try {
        console.log('🔄 Loading servers from Firebase...');
        
        const serversCol = collection(db, 'servers');
        const serverSnapshot = await getDocs(serversCol);
        const serverSelect = document.getElementById('serverSelect');
        
        serverSelect.innerHTML = '<option value="">Select Server...</option>';
        
        const servers = [];
        serverSnapshot.forEach(doc => {
            const serverData = doc.data();
            console.log('📡 Found server:', serverData);
            servers.push({ id: doc.id, ...serverData });
        });
        
        // Sort by order
        servers.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Add to dropdown
        servers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.baseUrl;
            option.textContent = server.name;
            serverSelect.appendChild(option);
            console.log('✅ Added server option:', server.name, server.baseUrl);
        });

        if (servers.length === 0) {
            console.log('⚠️ No servers found in database');
            serverSelect.innerHTML = '<option value="">No servers available - Add servers in Admin Panel</option>';
            showToast('No servers available. Please add servers in Admin Panel.', 'error');
        } else {
            console.log('✅ Successfully loaded', servers.length, 'servers');
            showToast(`Loaded ${servers.length} servers`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Server load error:', error);
        showToast('Error loading servers. Check console for details.', 'error');
        
        // Fallback: Add some default servers for testing
        const serverSelect = document.getElementById('serverSelect');
        serverSelect.innerHTML = `
            <option value="">Select Server...</option>
            <option value="https://server1.novra.com">Server 1 (Test)</option>
            <option value="https://server2.novra.com">Server 2 (Test)</option>
        `;
        console.log('🔄 Using fallback servers for testing');
    }
}

// Server Selection Handler
document.getElementById('serverSelect').addEventListener('change', (e) => {
    selectedServerUrl = e.target.value;
    const selectedText = e.target.options[e.target.selectedIndex].text;
    document.getElementById('statServer').textContent = selectedText || 'Not Selected';
    console.log('🎯 Server selected:', selectedText, selectedServerUrl);
    
    if (selectedServerUrl) {
        showToast(`Server "${selectedText}" selected`, 'success');
    }
});

// ===== LOAD CATEGORIES FROM FIREBASE =====
async function loadCategories() {
    try {
        const categoriesCol = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesCol);
        const categoryTabs = document.getElementById('categoryTabs');
        
        categoryTabs.innerHTML = '';
        
        const categories = [];
        categorySnapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (categories.length === 0) {
            // Default categories if none exist
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
                <button class="category-tab" data-category="RARE">💎 RARE</button>
            `;
            currentCategory = 'HOT';
        } else {
            // Create tabs from Firebase
            categories.forEach((cat, index) => {
                const btn = document.createElement('button');
                btn.className = 'category-tab' + (index === 0 ? ' active' : '');
                btn.dataset.category = cat.id;
                btn.textContent = `${cat.icon || ''} ${cat.name}`;
                btn.onclick = () => switchCategory(cat.id, btn);
                categoryTabs.appendChild(btn);
                
                if (index === 0) currentCategory = cat.id;
            });
        }
        
        loadEmotes(currentCategory);
        
        // Add click listeners
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                loadEmotes(currentCategory);
            });
        });
        
        console.log('✅ Loaded', categories.length, 'categories');
    } catch (error) {
        console.error('❌ Category load error:', error);
        // Fallback to defaults
        document.getElementById('categoryTabs').innerHTML = `
            <button class="category-tab active" data-category="HOT">🔥 HOT</button>
            <button class="category-tab" data-category="EVO">⚡ EVO</button>
        `;
        currentCategory = 'HOT';
        loadEmotes('HOT');
    }
}

function switchCategory(category, btnElement) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
    currentCategory = category;
    loadEmotes(category);
}

// ===== LOAD EMOTES FROM FIREBASE (4 PER ROW - 1:1 CARDS) =====
async function loadEmotes(category) {
    try {
        const emotesCol = collection(db, 'emotes');
        const emoteSnapshot = await getDocs(emotesCol);
        const emoteGrid = document.getElementById('emoteGrid');
        emoteGrid.innerHTML = '';
        
        let count = 0;
        emoteSnapshot.forEach(doc => {
            const emote = doc.data();
            // Filter by category
            if (emote.category === category) {
                const card = document.createElement('div');
                card.className = 'emote-card';
                card.innerHTML = `
                    <div class="emote-image-wrapper">
                        <img src="${emote.imageUrl}" alt="${emote.emoteId}" loading="lazy">
                    </div>
                    <p class="emote-name">${emote.emoteId}</p>
                `;
                card.onclick = () => sendEmoteInstantly(emote.emoteId, card);
                emoteGrid.appendChild(card);
                count++;
            }
        });

        if (count === 0) {
            emoteGrid.innerHTML = '<div class="no-emotes">No emotes in this category</div>';
        }
        
        console.log('✅ Loaded', count, 'emotes for category:', category);
    } catch (error) {
        console.error('❌ Emote load error:', error);
        document.getElementById('emoteGrid').innerHTML = '<div class="no-emotes">Error loading emotes</div>';
    }
}

// ===== SEND EMOTE (INSTANT - NO DELAYS) =====
async function sendEmoteInstantly(emoteId, cardElement) {
    // Validation
    if (!selectedServerUrl) {
        showToast('Please select a server first', 'error');
        return;
    }
    
    const teamCode = document.getElementById('teamCode').value.trim();
    if (!teamCode) {
        showToast('Please enter team code', 'error');
        return;
    }
    
    const uid1 = document.getElementById('uid1').value.trim();
    if (!uid1) {
        showToast('Please enter UID 1', 'error');
        return;
    }
    
    if (!/^[0-9]{9,12}$/.test(uid1)) {
        showToast('UID must be 9-12 digits', 'error');
        return;
    }
    
    // Visual feedback
    selectedEmoteId = emoteId;
    document.getElementById('statEmote').textContent = emoteId;
    
    document.querySelectorAll('.emote-card').forEach(card => {
        card.classList.remove('selected');
    });
    cardElement.classList.add('selected');
    
    // Collect all UIDs
    const uids = [uid1];
    for (let i = 2; i <= maxUids; i++) {
        const uidInput = document.getElementById(`uid${i}`);
        if (uidInput && uidInput.value.trim()) {
            const uidValue = uidInput.value.trim();
            if (/^[0-9]{9,12}$/.test(uidValue)) {
                uids.push(uidValue);
            }
        }
    }
    
    // Build API URL
    let apiUrl = `${selectedServerUrl}/join?tc=${teamCode}`;
    uids.forEach((uid, index) => {
        apiUrl += `&uid${index + 1}=${uid}`;
    });
    apiUrl += `&emote_id=${emoteId}`;
    
    console.log('🚀 API Call:', apiUrl);
    
    showLoader();
    
    try {
        // INSTANT: No delays in API call
        const response = await fetch(apiUrl, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        hideLoader();
        showToast(`Emote ${emoteId} sent successfully!`, 'success');
        
    } catch (error) {
        hideLoader();
        console.error('API Error:', error);
        showToast(`Request sent! Check game for emote.`, 'info');
    }
}

// ===== UID MANAGEMENT =====
document.getElementById('addUidBtn').addEventListener('click', () => {
    if (uidCount < maxUids) {
        uidCount++;
        addUidField(uidCount);
        document.getElementById('statUids').textContent = uidCount;
        
        if (uidCount >= maxUids) {
            document.getElementById('addUidBtn').disabled = true;
            document.getElementById('addUidBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" stroke-width="2"/></svg> MAX UIDs ADDED';
        }
    }
});

function addUidField(number) {
    const container = document.getElementById('uidContainer');
    const uidBox = document.createElement('div');
    uidBox.className = 'input-group-box uid-field';
    uidBox.id = `uidBox${number}`;
    uidBox.innerHTML = `
        <label>TARGET UID ${number} <span style="color: var(--text-gray); font-size: 11px;">(Optional)</span></label>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="uid${number}" placeholder="Enter UID (9-12 digits)" class="config-input uid-input" pattern="[0-9]{9,12}">
            <button class="remove-uid-btn" onclick="removeUid(${number})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2"/>
                </svg>
            </button>
        </div>
    `;
    container.appendChild(uidBox);
}

window.removeUid = function(number) {
    const uidBox = document.getElementById(`uidBox${number}`);
    if (uidBox) {
        uidBox.remove();
        uidCount--;
        document.getElementById('statUids').textContent = uidCount;
        
        const addBtn = document.getElementById('addUidBtn');
        addBtn.disabled = false;
        addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg> ADD UID';
    }
};

// ===== MAINTENANCE CHECK =====
async function checkMaintenance() {
    try {
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().enabled) {
            document.getElementById('maintenanceMsg').textContent = docSnap.data().message;
            document.getElementById('maintenanceOverlay').classList.remove('hidden');
        }
        
        // Real-time listener
        onSnapshot(docRef, (doc) => {
            if (doc.exists() && doc.data().enabled) {
                document.getElementById('maintenanceMsg').textContent = doc.data().message;
                document.getElementById('maintenanceOverlay').classList.remove('hidden');
            } else {
                document.getElementById('maintenanceOverlay').classList.add('hidden');
            }
        });
    } catch (error) {
        console.log('Maintenance check skipped');
    }
}

// ===== LOAD FOOTER LINKS =====
async function loadFooterLinks() {
    try {
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const links = docSnap.data();
            document.getElementById('footerTelegram').href = links.telegram || '#';
            document.getElementById('footerGithub').href = links.github || '#';
            document.getElementById('footerDiscord').href = links.discord || '#';
            document.getElementById('footerYoutube').href = links.youtube || '#';
            document.getElementById('maintenanceTG').href = links.telegram || '#';
        }
    } catch (error) {
        console.log('Footer links not configured');
    }
}

// ===== INITIALIZE EVERYTHING =====
console.log('🔥 NOVRA X Dashboard Initializing...');
console.log('📱 Firebase Project:', firebaseConfig.projectId);

// Initialize with proper error handling
async function initializeDashboard() {
    try {
        await checkMaintenance();
        await loadServers();
        await loadCategories();
        await loadFooterLinks();
        
        console.log('✅ NOVRA X Dashboard Ready!');
        console.log('📝 Click any emote to send instantly!');
        
        // Show welcome message
        setTimeout(() => {
            showToast('Dashboard loaded successfully!', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showToast('Dashboard initialization failed. Check console.', 'error');
    }
}

// Start the dashboard
initializeDashboard();