// Import Firebase modules
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
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

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
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('auth');
    window.location.href = 'index.html';
}); 

// Loader Functions
function showLoader() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.add('hidden');
}

// ===== TOAST NOTIFICATION SYSTEM =====
function showToast(message, type = 'success') {
    console.log(`📢 Toast: ${message} (${type})`);
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
    
    const { message, type } = toastQueue.shift();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;
    
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                if (toastQueue.length > 0) {
                    processToastQueue();
                } else {
                    isProcessingToast = false;
                }
            }, 300);
        }, 3000);
    }
}

// ===== LOAD SERVERS FROM FIREBASE =====
async function loadServers() {
    try {
        console.log('🔄 Loading servers from Firebase...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            showToast('Database connection failed', 'error');
            return;
        }
        
        const serversCol = collection(db, 'servers');
        const serverSnapshot = await getDocs(serversCol);
        const serverSelect = document.getElementById('serverSelect');
        
        if (!serverSelect) {
            console.error('❌ Server select element not found');
            return;
        }
        
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
            console.log('✅ Added server:', server.name);
        });

        if (servers.length === 0) {
            console.log('⚠️ No servers found');
            serverSelect.innerHTML = '<option value="">No servers available</option>';
            showToast('No servers available', 'error');
        } else {
            console.log(`✅ Loaded ${servers.length} servers`);
            showToast(`Loaded ${servers.length} servers`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Server load error:', error);
        showToast('Error loading servers: ' + error.message, 'error');
    }
}

// Server Selection Handler
const serverSelect = document.getElementById('serverSelect');
if (serverSelect) {
    serverSelect.addEventListener('change', (e) => {
        selectedServerUrl = e.target.value;
        const selectedText = e.target.options[e.target.selectedIndex].text;
        const statServer = document.getElementById('statServer');
        if (statServer) {
            statServer.textContent = selectedText || 'Not Selected';
        }
        console.log('🎯 Server selected:', selectedText, selectedServerUrl);
        
        if (selectedServerUrl) {
            showToast(`Server "${selectedText}" selected`, 'success');
        }
    });
}

// ===== LOAD CATEGORIES FROM FIREBASE =====
async function loadCategories() {
    try {
        console.log('🔄 Loading categories...');
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        const categoriesCol = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesCol);
        const categoryTabs = document.getElementById('categoryTabs');
        
        if (!categoryTabs) {
            console.error('❌ Category tabs element not found');
            return;
        }
        
        categoryTabs.innerHTML = '';
        
        const categories = [];
        categorySnapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (categories.length === 0) {
            console.log('⚠️ No categories found, using defaults');
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
                <button class="category-tab" data-category="RARE">💎 RARE</button>
            `;
            currentCategory = 'HOT';
        } else {
            categories.forEach((cat, index) => {
                const btn = document.createElement('button');
                btn.className = 'category-tab' + (index === 0 ? ' active' : '');
                btn.dataset.category = cat.id;
                btn.textContent = `${cat.icon || ''} ${cat.name}`;
                btn.addEventListener('click', () => switchCategory(cat.id, btn));
                categoryTabs.appendChild(btn);
                
                if (index === 0) currentCategory = cat.id;
            });
            console.log(`✅ Loaded ${categories.length} categories`);
        }
        
        // Add click listeners for default tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.dataset.category;
                loadEmotes(currentCategory);
            });
        });
        
        loadEmotes(currentCategory);
        
    } catch (error) {
        console.error('❌ Category load error:', error);
        const categoryTabs = document.getElementById('categoryTabs');
        if (categoryTabs) {
            categoryTabs.innerHTML = `
                <button class="category-tab active" data-category="HOT">🔥 HOT</button>
                <button class="category-tab" data-category="EVO">⚡ EVO</button>
            `;
        }
        currentCategory = 'HOT';
        loadEmotes('HOT');
    }
}

function switchCategory(category, btnElement) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
    currentCategory = category;
    loadEmotes(category);
    console.log('🔄 Switched to category:', category);
}

// ===== LOAD EMOTES FROM FIREBASE =====
async function loadEmotes(category) {
    try {
        console.log('🔄 Loading emotes for category:', category);
        
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        
        const emotesCol = collection(db, 'emotes');
        const emoteSnapshot = await getDocs(emotesCol);
        const emoteGrid = document.getElementById('emoteGrid');
        
        if (!emoteGrid) {
            console.error('❌ Emote grid element not found');
            return;
        }
        
        emoteGrid.innerHTML = '';
        
        let count = 0;
        emoteSnapshot.forEach(doc => {
            const emote = doc.data();
            if (emote.category === category) {
                const card = document.createElement('div');
                card.className = 'emote-card';
                card.innerHTML = `
                    <div class="emote-image-wrapper">
                        <img src="${emote.imageUrl}" alt="${emote.emoteId}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E?%3C/text%3E%3C/svg%3E'">
                    </div>
                    <p class="emote-name">${emote.emoteId}</p>
                `;
                card.addEventListener('click', () => sendEmoteInstantly(emote.emoteId, card));
                emoteGrid.appendChild(card);
                count++;
            }
        });

        if (count === 0) {
            emoteGrid.innerHTML = '<div class="no-emotes">No emotes in this category</div>';
            console.log('⚠️ No emotes found for category:', category);
        } else {
            console.log(`✅ Loaded ${count} emotes for ${category}`);
        }
        
    } catch (error) {
        console.error('❌ Emote load error:', error);
        const emoteGrid = document.getElementById('emoteGrid');
        if (emoteGrid) {
            emoteGrid.innerHTML = '<div class="no-emotes">Error loading emotes</div>';
        }
    }
}

// ===== SEND EMOTE FUNCTION =====
async function sendEmoteInstantly(emoteId, cardElement) {
    console.log('🚀 Sending emote:', emoteId);
    
    // Validation
    if (!selectedServerUrl) {
        showToast('Please select a server first', 'error');
        return;
    }
    
    const teamCodeInput = document.getElementById('teamCode');
    const uid1Input = document.getElementById('uid1');
    
    if (!teamCodeInput || !uid1Input) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const teamCode = teamCodeInput.value.trim();
    if (!teamCode) {
        showToast('Please enter team code', 'error');
        return;
    }
    
    const uid1 = uid1Input.value.trim();
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
    const statEmote = document.getElementById('statEmote');
    if (statEmote) {
        statEmote.textContent = emoteId;
    }
    
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
    let apiUrl = `${selectedServerUrl}/join?tc=${encodeURIComponent(teamCode)}`;
    uids.forEach((uid, index) => {
        apiUrl += `&uid${index + 1}=${encodeURIComponent(uid)}`;
    });
    apiUrl += `&emote_id=${encodeURIComponent(emoteId)}`;
    
    console.log('🌐 API URL:', apiUrl);
    
    showLoader();
    
    try {
        // Try with fetch first
        const response = await fetch(apiUrl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        
        hideLoader();
        console.log('✅ API call completed');
        showToast(`Emote ${emoteId} sent successfully!`, 'success');
        
    } catch (error) {
        hideLoader();
        console.error('⚠️ API Error:', error);
        // In no-cors mode, we can't read the response, so treat as success
        showToast(`Request sent! Check game for emote.`, 'info');
    }
}

// ===== UID MANAGEMENT =====
const addUidBtn = document.getElementById('addUidBtn');
if (addUidBtn) {
    addUidBtn.addEventListener('click', () => {
        if (uidCount < maxUids) {
            uidCount++;
            addUidField(uidCount);
            const statUids = document.getElementById('statUids');
            if (statUids) {
                statUids.textContent = uidCount;
            }
            
            if (uidCount >= maxUids) {
                addUidBtn.disabled = true;
                addUidBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" stroke-width="2"/></svg> MAX UIDs ADDED';
            }
        }
    });
}

function addUidField(number) {
    const container = document.getElementById('uidContainer');
    if (!container) return;
    
    const uidBox = document.createElement('div');
    uidBox.className = 'input-group-box uid-field';
    uidBox.id = `uidBox${number}`;
    uidBox.innerHTML = `
        <label>TARGET UID ${number} <span style="color: var(--text-gray); font-size: 11px;">(Optional)</span></label>
        <div style="display: flex; gap: 10px;">
            <input type="text" id="uid${number}" placeholder="Enter UID (9-12 digits)" class="config-input uid-input" pattern="[0-9]{9,12}">
            <button class="remove-uid-btn" onclick="window.removeUid(${number})">
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
        const statUids = document.getElementById('statUids');
        if (statUids) {
            statUids.textContent = uidCount;
        }
        
        const addBtn = document.getElementById('addUidBtn');
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" stroke-width="2"/></svg> ADD UID';
        }
    }
};

// ===== MAINTENANCE CHECK =====
async function checkMaintenance() {
    try {
        if (!db) return;
        
        const docRef = doc(db, 'settings', 'maintenance');
        const docSnap = await getDoc(docRef);
        
        const overlay = document.getElementById('maintenanceOverlay');
        const msg = document.getElementById('maintenanceMsg');
        
        if (docSnap.exists() && docSnap.data().enabled) {
            if (msg) msg.textContent = docSnap.data().message;
            if (overlay) overlay.classList.remove('hidden');
        }
        
        // Real-time listener
        onSnapshot(docRef, (doc) => {
            if (doc.exists() && doc.data().enabled) {
                if (msg) msg.textContent = doc.data().message;
                if (overlay) overlay.classList.remove('hidden');
            } else {
                if (overlay) overlay.classList.add('hidden');
            }
        });
    } catch (error) {
        console.log('⚠️ Maintenance check skipped:', error.message);
    }
}

// ===== LOAD FOOTER LINKS =====
async function loadFooterLinks() {
    try {
        if (!db) return;
        
        const docRef = doc(db, 'settings', 'footerLinks');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const links = docSnap.data();
            const telegram = document.getElementById('footerTelegram');
            const github = document.getElementById('footerGithub');
            const discord = document.getElementById('footerDiscord');
            const youtube = document.getElementById('footerYoutube');
            const maintenanceTG = document.getElementById('maintenanceTG');
            
            if (telegram) telegram.href = links.telegram || '#';
            if (github) github.href = links.github || '#';
            if (discord) discord.href = links.discord || '#';
            if (youtube) youtube.href = links.youtube || '#';
            if (maintenanceTG) maintenanceTG.href = links.telegram || '#';
        }
    } catch (error) {
        console.log('⚠️ Footer links not configured');
    }
}

// ===== INITIALIZE DASHBOARD =====
async function initializeDashboard() {
    console.log('🔥 NOVRA X Dashboard Initializing...');
    console.log('📱 Firebase Project:', firebaseConfig.projectId);
    
    try {
        await checkMaintenance();
        await loadServers();
        await loadCategories();
        await loadFooterLinks();
        
        console.log('✅ NOVRA X Dashboard Ready!');
        console.log('📝 Click any emote to send instantly!');
        
        setTimeout(() => {
            showToast('Dashboard loaded successfully!', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showToast('Dashboard initialization failed. Check console.', 'error');
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}