/**
 * ai-chat.js
 * Encapsulates all AI Chat Assistant frontend logic.
 * Exposes initAIChat() and cleanupAIChat() for integration with the main app.
 */

// State
let aiSessionId = null;
let isAiChatOpen = false;
let isAiChatWaiting = false;

// DOM Elements
const aiChatFab = document.getElementById('aiChatFab');
const aiChatPanel = document.getElementById('aiChatPanel');
const aiChatCloseBtn = document.getElementById('aiChatCloseBtn');
const aiChatMinimizeBtn = document.getElementById('aiChatMinimizeBtn');
const aiChatExpandBtn = document.getElementById('aiChatExpandBtn');
const aiChatClearBtn = document.getElementById('aiChatClearBtn');
const aiChatMessages = document.getElementById('aiChatMessages');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');
const aiChatEmptyState = document.getElementById('aiChatEmptyState');
const aiChatWelcomeText = document.getElementById('aiChatWelcomeText');
const aiChatPromptText = document.getElementById('aiChatPromptText');
const aiChatQuickActions = document.getElementById('aiChatQuickActions');

// Quick Actions Configuration
const AI_QUICK_ACTIONS = {
    patient: ["💊 Today's Medicines", "📋 My Active Prescription", "⏰ My Reminders", "📖 Explain My Prescription", "🏥 Medicine Information"],
    doctor: ["📝 Create Prescription", "👨‍⚕️ Find Patient", "📊 Patient History", "🔍 Search Medicine", "💡 Draft Prescription"],
    pharmacist: ["📦 Low Stock Medicines", "💊 Inventory Status", "📅 Expiring Medicines", "📈 Sales Summary", "🔍 Search Medicine"],
    admin: ["📊 Dashboard Analytics", "👥 User Statistics", "👨‍⚕️ Pending Approvals", "📦 Inventory Analytics", "📝 Audit Logs"]
};

// Helper to generate a UUID v4
function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Inject new CSS for Phase 6 enhancements
const style = document.createElement('style');
style.innerHTML = `
.ai-chat-copy-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.1); border: none; color: var(--text-secondary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; transition: all 0.2s; opacity: 0; }
.ai-chat-msg-wrapper:hover .ai-chat-copy-btn { opacity: 1; }
.ai-chat-copy-btn:hover { background: rgba(255,255,255,0.2); color: white; }
.ai-chat-bubble { position: relative; padding-right: 30px; }
.ai-chat-bubble table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; font-size: 0.9em; }
.ai-chat-bubble th, .ai-chat-bubble td { border: 1px solid var(--border-color); padding: 6px; text-align: left; }
.ai-chat-bubble th { background: rgba(255,255,255,0.05); }
.ai-chat-bubble blockquote { border-left: 3px solid var(--accent-blue); padding-left: 10px; margin: 10px 0; background: rgba(59,130,246,0.05); padding: 10px; border-radius: 4px; }
.ai-chat-freshness { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
.ai-chat-freshness i { color: var(--accent-green); }
.ai-chat-loading-text { font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; font-style: italic; animation: pulse 1.5s infinite; }
`;
document.head.appendChild(style);

// Basic markdown parser wrapper using marked.js
function parseMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }
    // Fallback if marked is not loaded
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

// Auto-scroll to bottom of messages
function scrollToBottom() {
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// Format timestamp
function formatTime(dateString) {
    const d = dateString ? new Date(dateString) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Handle copying text
window.copyChatText = function(btn, text) {
    navigator.clipboard.writeText(decodeURIComponent(text)).then(() => {
        const icon = btn.querySelector('i');
        icon.className = 'fas fa-check';
        setTimeout(() => icon.className = 'fas fa-copy', 2000);
    });
};

// Render a single message bubble (with simulated progressive streaming for AI)
function renderMessage(role, text, toolUsed = null, timestamp = null) {
    // 1. Extract dynamic suggestions if present
    let suggestions = [];
    const suggestionMatch = text.match(/SUGGESTIONS:\s*(.*)$/m);
    if (suggestionMatch) {
        suggestions = suggestionMatch[1].split('|').map(s => s.trim());
        text = text.replace(suggestionMatch[0], '').trim();
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-chat-msg-wrapper ${role === 'user' ? 'user' : 'ai'}`;

    if (role === 'user') {
        msgDiv.innerHTML = `
        <div class="ai-chat-msg-content-row">
            <div class="ai-chat-bubble">
                ${text}
            </div>
        </div>
        <div class="ai-chat-timestamp">${formatTime(timestamp)}</div>
        `;
        aiChatMessages.appendChild(msgDiv);
        updateChatVisibility();
        scrollToBottom();
        return;
    }

    // Role is AI: Set up progressive streaming
    const writeTools = ['createPrescription', 'updatePrescription', 'cancelPrescription', 'addInventory', 'increaseStock', 'reduceStock', 'updateExpiryDate', 'updateBatchDetails', 'dispensePrescription', 'approveDoctor', 'rejectDoctor', 'approvePharmacist', 'rejectPharmacist', 'approveFirstPendingUser', 'rejectFirstPendingUser'];
    const isLiveRead = toolUsed && !writeTools.includes(toolUsed);
    
    // Create skeleton
    msgDiv.innerHTML = `
    <div class="ai-chat-msg-content-row">
        <div class="ai-chat-avatar">🤖</div>
        <div class="ai-chat-bubble">
            <button class="ai-chat-copy-btn" onclick="copyChatText(this, '${encodeURIComponent(text)}')"><i class="fas fa-copy"></i></button>
            <div class="ai-chat-bubble-content"></div>
        </div>
    </div>
    <div class="ai-chat-timestamp">
        ${formatTime(timestamp)}
        ${isLiveRead ? '<div class="ai-chat-freshness"><i class="fas fa-check-circle"></i> Retrieved from live system data</div>' : ''}
    </div>
    <div class="ai-chat-dynamic-suggestions ai-chat-quick-actions" style="margin-top: 8px; display: none;"></div>
    `;
    
    aiChatMessages.appendChild(msgDiv);
    updateChatVisibility();
    
    const contentDiv = msgDiv.querySelector('.ai-chat-bubble-content');
    const suggestionsDiv = msgDiv.querySelector('.ai-chat-dynamic-suggestions');
    
    // Simulated Streaming
    let i = 0;
    const chunkSize = 3; // chars per tick
    const streamInterval = setInterval(() => {
        i += chunkSize;
        const currentText = text.substring(0, i);
        contentDiv.innerHTML = parseMarkdown(currentText + (i < text.length ? '...' : ''));
        scrollToBottom();
        
        if (i >= text.length) {
            clearInterval(streamInterval);
            contentDiv.innerHTML = parseMarkdown(text); // Final parse
            
            // Render dynamic suggestions
            if (suggestions.length > 0) {
                suggestionsDiv.innerHTML = '';
                suggestions.forEach(action => {
                    const chip = document.createElement('div');
                    chip.className = 'ai-chat-chip';
                    chip.innerHTML = action; 
                    chip.addEventListener('click', () => {
                        aiChatInput.value = chip.textContent.trim();
                        handleSend();
                    });
                    suggestionsDiv.appendChild(chip);
                });
                suggestionsDiv.style.display = 'flex';
                scrollToBottom();
            }
        }
    }, 15);
}

function renderErrorCard(msg, title = 'AI Service Unavailable') {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-chat-msg-wrapper ai';
    msgDiv.innerHTML = `
        <div class="ai-chat-msg-content-row">
            <div class="ai-chat-avatar">🤖</div>
            <div class="ai-chat-error-card">
                <div class="ai-chat-error-card-title">
                    <i class="fas fa-exclamation-triangle"></i> ${title}
                </div>
                <div class="ai-chat-error-card-text">${msg}</div>
            </div>
        </div>
    `;
    aiChatMessages.appendChild(msgDiv);
    updateChatVisibility();
    scrollToBottom();
}

function updateChatVisibility() {
    // Exclude typing indicator from counting as a real message
    const hasMessages = Array.from(aiChatMessages.children).some(child => child.id !== 'aiChatTypingIndicator');
    
    if (!hasMessages) {
        aiChatEmptyState.classList.remove('ai-chat-hidden');
        aiChatWelcomeText.classList.remove('ai-chat-hidden');
        aiChatPromptText.classList.remove('ai-chat-hidden');
        aiChatQuickActions.classList.remove('ai-chat-hidden');
        aiChatMessages.classList.add('ai-chat-hidden');
    } else {
        aiChatEmptyState.classList.add('ai-chat-hidden');
        aiChatWelcomeText.classList.add('ai-chat-hidden');
        aiChatPromptText.classList.add('ai-chat-hidden');
        aiChatQuickActions.classList.add('ai-chat-hidden');
        aiChatMessages.classList.remove('ai-chat-hidden');
    }
}

// Render typing indicator with rotating text
let typingInterval;
const typingMessages = [
    "Understanding your request...",
    "Retrieving information...",
    "Analyzing data...",
    "Checking records...",
    "Preparing your response..."
];

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'aiChatTypingIndicator';
    typingDiv.className = 'ai-chat-msg-wrapper ai';
    typingDiv.innerHTML = `
        <div class="ai-chat-msg-content-row">
            <div class="ai-chat-avatar">🤖</div>
            <div class="ai-chat-bubble ai-chat-typing">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <div class="ai-chat-typing-dot"></div>
                    <div class="ai-chat-typing-dot"></div>
                    <div class="ai-chat-typing-dot"></div>
                </div>
                <div id="aiChatTypingText" class="ai-chat-loading-text">Understanding your request...</div>
            </div>
        </div>
    `;
    aiChatMessages.appendChild(typingDiv);
    updateChatVisibility();
    scrollToBottom();

    let msgIndex = 0;
    typingInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % typingMessages.length;
        const textEl = document.getElementById('aiChatTypingText');
        if (textEl) textEl.textContent = typingMessages[msgIndex];
    }, 2000);
}

function hideTypingIndicator() {
    clearInterval(typingInterval);
    const typingDiv = document.getElementById('aiChatTypingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

async function fetchWelcomeSummary() {
    const token = localStorage.getItem('authToken');
    try {
        isAiChatWaiting = true;
        showTypingIndicator();
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message: "open chat", sessionId: aiSessionId })
        });
        hideTypingIndicator();
        isAiChatWaiting = false;
        const data = await response.json();
        if (response.ok && data.success) {
            renderMessage('ai', data.response, data.toolUsed, data.timestamp);
        }
    } catch(e) {
        hideTypingIndicator();
        isAiChatWaiting = false;
    }
}

// API Calls
async function fetchAiHistory() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/ai/history?sessionId=${aiSessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.history && data.history.length > 0) {
            aiChatMessages.innerHTML = '';
            data.history.forEach(turn => {
                // Hide the silent trigger from history UI
                if (turn.role === 'user' && turn.message === 'open chat') return;
                renderMessage(turn.role, turn.message, turn.tool_used, turn.created_at);
            });
        } else {
            // Trigger welcome summary if this is a fresh session
            if (aiChatMessages.children.length === 0) {
                fetchWelcomeSummary();
            }
        }
        updateChatVisibility();
    } catch (error) {
        console.error('[AI Chat] Failed to load history:', error);
    }
}

async function sendAiMessage(message) {
    const token = localStorage.getItem('authToken');
    
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, sessionId: aiSessionId })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            renderMessage('ai', data.response, data.toolUsed, data.timestamp);
            
            // Auto-refresh affected dashboard section after successful admin actions
            if (currentUser && currentUser.role === 'admin' && data.toolUsed) {
                const adminWriteTools = [
                    'approveDoctor', 'rejectDoctor',
                    'approvePharmacist', 'rejectPharmacist',
                    'approveFirstPendingUser', 'rejectFirstPendingUser'
                ];
                if (adminWriteTools.includes(data.toolUsed)) {
                    console.log(`[AI Chat] Successful admin write action detected: ${data.toolUsed}. Refreshing active view...`);
                    const activeNav = document.querySelector('.sidebar .nav-item.active');
                    if (activeNav) {
                        const view = activeNav.dataset.view;
                        if (view === 'approvals') {
                            if (typeof window.loadAdminApprovals === 'function') window.loadAdminApprovals();
                            else if (typeof loadAdminApprovals === 'function') loadAdminApprovals();
                        } else if (view === 'users') {
                            if (typeof window.loadAdminUsersList === 'function') window.loadAdminUsersList();
                            else if (typeof loadAdminUsersList === 'function') loadAdminUsersList();
                        } else if (view === 'analytics') {
                            if (typeof window.loadAdminAnalytics === 'function') window.loadAdminAnalytics();
                            else if (typeof loadAdminAnalytics === 'function') loadAdminAnalytics();
                        } else if (view === 'inventory') {
                            if (typeof window.loadAdminInventory === 'function') window.loadAdminInventory();
                            else if (typeof loadAdminInventory === 'function') loadAdminInventory();
                        }
                    }
                }
            }
        } else {
            if (data.error === 'QUOTA_EXCEEDED') {
                renderErrorCard('Groq API rate limit reached. Please wait a moment and try again.', 'Rate Limit Reached');
            } else {
                renderErrorCard(data.error || 'Something went wrong.');
            }
        }
    } catch (error) {
        renderErrorCard('Could not reach the MediAssist AI service.');
    }
}

async function clearAiHistory() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`/api/ai/history?sessionId=${aiSessionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            aiChatMessages.innerHTML = '';
            updateChatVisibility();
        }
    } catch (error) {
        console.error('[AI Chat] Failed to clear history:', error);
    }
}

// Input Handling
function setInputState(disabled) {
    isAiChatWaiting = disabled;
    aiChatInput.disabled = disabled;
    aiChatSendBtn.disabled = disabled;
    
    if (disabled) {
        showTypingIndicator();
    } else {
        hideTypingIndicator();
        aiChatInput.focus();
    }
}

async function handleSend() {
    const text = aiChatInput.value.trim();
    if (!text || isAiChatWaiting) return;

    // Reset input
    aiChatInput.value = '';
    aiChatInput.style.height = 'auto'; // reset textarea auto-height
    
    // Render user message immediately
    renderMessage('user', text);
    
    // Send to API
    setInputState(true);
    await sendAiMessage(text);
    setInputState(false);
}

// Auto-resize textarea
aiChatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value === '') {
        this.style.height = 'auto';
    }
});

// Handle Enter and Shift+Enter
aiChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Click events
aiChatSendBtn.addEventListener('click', handleSend);

aiChatFab.addEventListener('click', () => {
    isAiChatOpen = true;
    aiChatPanel.classList.add('ai-chat-active');
    aiChatFab.classList.add('ai-chat-hidden'); // hide FAB when panel is open
    aiChatInput.focus();
});

aiChatCloseBtn.addEventListener('click', () => {
    isAiChatOpen = false;
    aiChatPanel.classList.remove('ai-chat-active');
    aiChatFab.classList.remove('ai-chat-hidden'); // show FAB again
});

if (aiChatMinimizeBtn) {
    aiChatMinimizeBtn.addEventListener('click', () => {
        isAiChatOpen = false;
        aiChatPanel.classList.remove('ai-chat-active');
        aiChatFab.classList.remove('ai-chat-hidden');
    });
}

if (aiChatExpandBtn) {
    aiChatExpandBtn.addEventListener('click', () => {
        aiChatPanel.classList.toggle('ai-chat-expanded');
        const icon = aiChatExpandBtn.querySelector('i');
        if (aiChatPanel.classList.contains('ai-chat-expanded')) {
            icon.className = 'fas fa-compress';
        } else {
            icon.className = 'fas fa-expand';
        }
    });
}

if (aiChatClearBtn) {
    aiChatClearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the conversation?')) {
            clearAiHistory();
        }
    });
}

function renderQuickActions(role) {
    aiChatQuickActions.innerHTML = '';
    const actions = AI_QUICK_ACTIONS[role] || AI_QUICK_ACTIONS['patient'];
    
    actions.forEach(action => {
        const chip = document.createElement('div');
        chip.className = 'ai-chat-chip';
        chip.innerHTML = action; 
        chip.addEventListener('click', () => {
            aiChatInput.value = chip.textContent.trim();
            aiChatInput.style.height = 'auto'; // Reset height
            handleSend();
        });
        aiChatQuickActions.appendChild(chip);
    });
}

/**
 * Initializes the AI Chat widget.
 * Called from app.js after successful login/session restore.
 */
window.initAIChat = function() {
    // Generate a session ID for this browser session if not exists
    if (!aiSessionId) {
        aiSessionId = generateUUID();
    }
    
    // Show the FAB
    aiChatFab.classList.remove('ai-chat-hidden');
    
    // Clear messages
    aiChatMessages.innerHTML = '';
    
    // Setup Welcome Text using the global currentUser (from app.js)
    const name = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.fullName : 'User';
    aiChatWelcomeText.textContent = `Hello ${name}`;
    
    // Render Quick Actions based on role
    const role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : 'patient';
    renderQuickActions(role);

    updateChatVisibility();
    
    // Fetch previous history for this session
    fetchAiHistory();
};

/**
 * Cleans up the AI Chat widget state.
 * Called from app.js on logout.
 */
window.cleanupAIChat = function() {
    // Hide UI
    aiChatFab.classList.add('ai-chat-hidden');
    aiChatPanel.classList.remove('ai-chat-active');
    isAiChatOpen = false;
    
    // Reset state
    aiSessionId = null;
    aiChatMessages.innerHTML = '';
    aiChatInput.value = '';
    aiChatInput.style.height = 'auto';
    hideTypingIndicator();
    
    // Ensure inputs are active for next login
    aiChatInput.disabled = false;
    aiChatSendBtn.disabled = false;
    isAiChatWaiting = false;
};
