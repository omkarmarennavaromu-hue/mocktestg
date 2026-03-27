// script.js - Niyantra AI Chat Interface
// Premium chat functionality with mode selection, API integration, and smooth UI updates

// ===== DOM Elements =====
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const aiReplyArea = document.getElementById('aiReplyArea');
const replyContent = document.getElementById('replyContent');
const modesGrid = document.getElementById('modesGrid');
const modesSection = document.getElementById('modesSection');

// ===== State Management =====
let activeMode = null;           // 'mocktest', 'cheatcode', 'youtube', or null
let conversationHistory = [];    // Store chat history for context
let isLoading = false;           // Prevent multiple requests
let currentChatContainer = null; // Reference to chat messages container

// ===== Mode Configuration =====
const MODES = {
    mocktest: {
        name: 'Mock Test Generator',
        icon: 'fa-file-alt',
        color: '#FF4D2E',
        welcomeMessage: '🎯 **Mock Test Generator Activated**\n\nReady to challenge yourself. Tell me the subject (e.g., Physics, Mathematics, Chemistry) and topics, and I\'ll generate a custom mock test with answers.\n\n*Example: "Generate a mock test on Calculus derivatives" or "Create physics test on kinematics"*',
        placeholder: 'e.g., Generate a mock test on Organic Chemistry or Physics Thermodynamics...',
        apiEndpoint: '/api/mocktest'
    },
    cheatcode: {
        name: 'CheatCode',
        icon: 'fa-bolt',
        color: '#FF8C42',
        welcomeMessage: '⚡ **CheatCode Mode — Instant Revision**\n\nProvide a topic, chapter, or concept. I\'ll compress key facts, formulas, and mnemonics in seconds.\n\n*Example: "Summarize Newton\'s Laws" or "Give me cheat sheet for Calculus limits"*',
        placeholder: 'e.g., Summarize Organic Chemistry reactions, Physics formulas for optics...',
        apiEndpoint: '/api/cheatcode'
    },
    youtube: {
        name: 'YouTube Video Summarizer',
        icon: 'fa-youtube',
        color: '#2C5F2D',
        welcomeMessage: '📺 **YouTube Video Summarizer Active**\n\nPaste a YouTube video URL or describe the lecture topic, and I\'ll generate concise, structured summaries with key takeaways.\n\n*Example: "https://youtu.be/example" or "Summarize 3Blue1Brown calculus video"*',
        placeholder: 'Paste YouTube URL or describe the video topic...',
        apiEndpoint: '/api/youtube'
    }
};

// ===== Helper Functions =====

/**
 * Get display name for a mode
 */
function getModeDisplayName(mode) {
    return MODES[mode]?.name || mode;
}

/**
 * Format timestamp for messages
 */
function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format message text with markdown-like styling
 */
function formatMessageText(text) {
    if (!text) return '';
    
    let formatted = text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>')
        // Bullet points
        .replace(/•/g, '•')
        // Code blocks (simple)
        .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace;">$1</code>');
    
    return formatted;
}

/**
 * Add a message to the chat area
 */
function addMessage(content, isUser = false, mode = null) {
    if (!replyContent) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.style.animation = 'fadeSlideUp 0.3s ease-out';
    
    const timestamp = getTimestamp();
    const avatarIcon = isUser ? 'fa-user' : (mode ? MODES[mode]?.icon || 'fa-robot' : 'fa-robot');
    const avatarColor = isUser ? '#FF8C42' : (mode ? MODES[mode]?.color : '#FF4D2E');
    
    messageDiv.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas ${avatarIcon}" style="color: white; font-size: 1rem;"></i>
            </div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                    <span style="font-weight: 600; font-size: 0.9rem; color: ${avatarColor};">${isUser ? 'You' : 'Niyantra AI'}</span>
                    <span style="font-size: 0.7rem; opacity: 0.5;">${timestamp}</span>
                </div>
                <div style="line-height: 1.6; color: #eef5ff;">${formatMessageText(content)}</div>
            </div>
        </div>
    `;
    
    // Add separator line
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = 'linear-gradient(90deg, transparent, rgba(255, 77, 46, 0.3), transparent)';
    separator.style.margin = '1rem 0';
    
    replyContent.appendChild(messageDiv);
    replyContent.appendChild(separator);
    
    // Auto-scroll to bottom
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    return messageDiv;
}

/**
 * Show loading indicator
 */
function showLoading() {
    if (!replyContent) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.className = 'chat-message ai-message';
    loadingDiv.style.animation = 'fadeSlideUp 0.3s ease-out';
    loadingDiv.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #FF4D2E, #FF8C42); display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-robot" style="color: white;"></i>
            </div>
            <div style="flex: 1;">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <span style="font-weight: 600;">Niyantra AI</span>
                    <span style="font-size: 0.7rem; opacity: 0.5;">${getTimestamp()}</span>
                </div>
                <div style="margin-top: 8px;">
                    <span style="display: inline-flex; gap: 4px;">
                        <span class="loading-dot" style="animation: loadingPulse 1.4s infinite ease-in-out both; animation-delay: -0.32s;">●</span>
                        <span class="loading-dot" style="animation: loadingPulse 1.4s infinite ease-in-out both; animation-delay: -0.16s;">●</span>
                        <span class="loading-dot" style="animation: loadingPulse 1.4s infinite ease-in-out both;">●</span>
                    </span>
                </div>
            </div>
        </div>
    `;
    
    replyContent.appendChild(loadingDiv);
    loadingDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

/**
 * Clear chat area (reset conversation)
 */
function clearChat() {
    if (replyContent) {
        replyContent.innerHTML = '';
    }
    conversationHistory = [];
}

/**
 * Set welcome message based on active mode
 */
function setWelcomeMessage() {
    clearChat();
    
    if (activeMode && MODES[activeMode]) {
        const mode = MODES[activeMode];
        addMessage(mode.welcomeMessage, false, activeMode);
        
        // Update input placeholder
        if (userInput) {
            userInput.placeholder = mode.placeholder;
        }
    } else {
        // Default welcome
        addMessage('✨ **Welcome to Niyantra AI**\n\nSelect a mode below to get started with specialized assistance, or type your question directly. I\'m here to help you command your preparation!', false, null);
        
        if (userInput) {
            userInput.placeholder = 'Ask anything about your preparation...';
        }
    }
}

/**
 * Update UI based on active mode (show/hide mode cards, show exit button)
 */
function updateModeUI() {
    const modeCards = document.querySelectorAll('.mode-card');
    let exitBar = document.querySelector('.exit-mode-bar');
    
    if (activeMode) {
        // Hide all mode cards
        modeCards.forEach(card => {
            card.style.display = 'none';
        });
        
        // Create or update exit button
        if (!exitBar) {
            exitBar = document.createElement('div');
            exitBar.className = 'exit-mode-bar';
            exitBar.style.marginBottom = '1rem';
            exitBar.style.display = 'flex';
            exitBar.style.justifyContent = 'flex-end';
            modesSection.insertBefore(exitBar, modesGrid);
        }
        
        exitBar.innerHTML = `
            <button class="exit-btn" id="exitModeBtn">
                <i class="fas fa-times-circle"></i> 
                Exit ${getModeDisplayName(activeMode)} Mode
            </button>
        `;
        
        const exitBtn = document.getElementById('exitModeBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', exitMode);
        }
    } else {
        // Show all mode cards
        modeCards.forEach(card => {
            card.style.display = 'block';
        });
        
        // Remove exit bar
        if (exitBar) {
            exitBar.remove();
        }
        
        // Reset input placeholder
        if (userInput) {
            userInput.placeholder = 'Ask anything about your preparation...';
        }
    }
}

/**
 * Exit current mode
 */
function exitMode() {
    const previousMode = activeMode;
    activeMode = null;
    updateModeUI();
    setWelcomeMessage();
    
    // Add smooth exit feedback
    if (previousMode) {
        addMessage(`✅ Exited ${getModeDisplayName(previousMode)} mode. You can now select another mode or continue with general assistance.`, false, null);
    }
}

/**
 * Activate a specific mode
 */
function activateMode(mode) {
    if (!MODES[mode]) return;
    
    // If same mode is already active, do nothing
    if (activeMode === mode) return;
    
    // Set new mode
    activeMode = mode;
    
    // Update UI
    updateModeUI();
    
    // Reset chat with welcome message
    setWelcomeMessage();
    
    // Add visual feedback
    addMessage(`🎯 **${MODES[mode].name} Mode Activated**\n\n${MODES[mode].welcomeMessage.split('\n\n')[1] || 'How can I help you today?'}`, false, mode);
    
    // Smooth scroll to top of chat
    if (replyContent) {
        replyContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Send message to backend API
 */
async function sendToBackend(message, mode) {
    const apiUrl = mode && MODES[mode] ? MODES[mode].apiEndpoint : '/api/chat';
    
    const requestBody = {
        message: message,
        mode: mode || 'general',
        conversationHistory: conversationHistory.slice(-10) // Send last 10 messages for context
    };
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response || data.message || 'I received your message but couldn\'t generate a proper response.';
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Fallback responses when API is not available (for demo/development)
        return getFallbackResponse(message, mode);
    }
}

/**
 * Fallback response generator (for development/demo when API is unavailable)
 */
function getFallbackResponse(message, mode) {
    const lowerMsg = message.toLowerCase();
    
    if (mode === 'mocktest') {
        if (lowerMsg.includes('physics') || lowerMsg.includes('mechanics')) {
            return `📝 **Mock Test: Physics (Mechanics)**\n\n**Section A (MCQs)**\n1. A particle moves with velocity v = 3t² + 2t. Find acceleration at t=2s.\n   a) 14 m/s²  b) 12 m/s²  c) 10 m/s²  d) 8 m/s²\n\n**Section B (Numerical)**\n2. A car accelerates from rest at 4 m/s² for 5s. Find distance covered.\n\n*Type "answers" for solutions or "more" for additional questions.*`;
        } else if (lowerMsg.includes('math') || lowerMsg.includes('calculus')) {
            return `📐 **Mock Test: Mathematics (Calculus)**\n\n1. Differentiate: f(x) = e^{2x} · sin(3x)\n2. Evaluate ∫ (3x² + 2x + 1) dx\n3. Find the slope of tangent to y = ln(x) at x = e.\n\n*Need step-by-step solutions? Reply with "solve".*`;
        } else {
            return `📋 **Mock Test Generator**\n\nI'll create a custom test for "${message.substring(0, 50)}".\n\n**Sample Format:**\n- 5 Multiple Choice Questions\n- 3 Short Answer Problems\n- 1 Long Answer Question\n\n*Please specify subject (Physics, Chemistry, Math, CS) for a targeted test.*`;
        }
    } 
    else if (mode === 'cheatcode') {
        if (lowerMsg.includes('newton') || lowerMsg.includes('laws')) {
            return `⚡ **CheatCode: Newton's Laws of Motion**\n\n🔹 **First Law (Inertia):** Body remains at rest/uniform motion unless net force acts.\n🔹 **Second Law:** F = ma (Force = mass × acceleration)\n🔹 **Third Law:** Action = - Reaction\n\n✨ **Mnemonic:** "Every Force Has Equal Opposite Reaction"\n📌 **Key Formula:** Impulse = F·Δt = Δp\n\n*Want more details or practice problems?*`;
        } else if (lowerMsg.includes('organic') || lowerMsg.includes('chemistry')) {
            return `🧪 **CheatCode: Organic Chemistry Essentials**\n\n• **IUPAC Naming:** Identify longest chain, priority order: -COOH > -CHO > -OH > -NH₂\n• **Inductive Effect:** -I (electron withdrawing) vs +I (donating)\n• **Reaction Types:** SN1, SN2, Elimination, Addition\n\n✨ **Memory Hook:** "SN1 is stepwise, SN2 is concerted one-step"\n\n*Need specific reaction mechanisms?*`;
        } else {
            return `⚡ **CheatCode: Smart Revision**\n\n✨ **Rapid Summary for "${message.substring(0, 40)}"**\n\n✔️ **Key Concept:** Core principle explained in 3 sentences\n✔️ **Formula:** Essential equations and derivations\n✔️ **Memory Trick:** Easy way to remember the concept\n\n*Ask for more details or specify a subtopic.*`;
        }
    }
    else if (mode === 'youtube') {
        if (lowerMsg.includes('youtube.com') || lowerMsg.includes('youtu.be')) {
            return `📺 **YouTube Video Summarizer**\n\n🎬 **Video Analysis Complete**\n\n**Summary:**\n• Main Topic: Educational content analysis\n• Key Takeaways: 3 core concepts explained\n• Important Timestamps: 0:00-2:30 Introduction, 2:30-5:45 Main Content, 5:45-8:00 Conclusion\n• Difficulty Level: Intermediate\n\n*Want detailed transcript notes or specific timestamp breakdown?*`;
        } else {
            return `🎥 **YouTube Summarizer Ready**\n\nPlease provide a YouTube URL or describe the lecture you want summarized.\n\n**Example:** "https://youtu.be/example" or "Summarize a video on Quantum Mechanics basics"\n\nI'll generate:\n- Concise summary\n- Key points with timestamps\n- Important formulas/concepts\n- Recommended follow-up topics`;
        }
    }
    else {
        return `✨ **Niyantra AI Assistant**\n\nI'm here to help with your exam preparation!\n\n**Available Modes:**\n• 📝 **Mock Test Generator** - Custom practice tests\n• ⚡ **CheatCode** - Instant revision summaries\n• 📺 **YouTube Summarizer** - Video lecture notes\n\nSelect a mode above or tell me what you need help with. For example:\n- "Create a mock test on Calculus"\n- "Summarize Newton's Laws"\n- "Help me understand Organic Chemistry"`;
    }
}

/**
 * Handle sending user message
 */
async function handleSendMessage() {
    if (isLoading) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    // Disable input while processing
    isLoading = true;
    sendBtn.disabled = true;
    userInput.disabled = true;
    
    try {
        // Add user message to chat
        addMessage(message, true);
        
        // Show loading indicator
        showLoading();
        
        // Clear input
        userInput.value = '';
        
        // Add to conversation history
        conversationHistory.push({ role: 'user', content: message });
        
        // Send to backend with current mode
        const aiResponse = await sendToBackend(message, activeMode);
        
        // Hide loading
        hideLoading();
        
        // Add AI response
        addMessage(aiResponse, false, activeMode);
        
        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        
        // Limit history length
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideLoading();
        addMessage('⚠️ Sorry, I encountered an error. Please try again or refresh the page.', false, null);
    } finally {
        // Re-enable input
        isLoading = false;
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

/**
 * Initialize mode card click listeners
 */
function initModeCards() {
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const mode = card.getAttribute('data-mode');
            if (mode && MODES[mode]) {
                activateMode(mode);
            }
        });
    });
}

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts() {
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && userInput.value.trim()) {
                    handleSendMessage();
                }
            }
        });
    }
}

/**
 * Initialize chat with default state
 */
function initChat() {
    // Clear and set welcome message
    clearChat();
    setWelcomeMessage();
    
    // Initialize mode UI (no active mode)
    updateModeUI();
    
    // Initialize event listeners
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }
    
    initModeCards();
    initKeyboardShortcuts();
    
    // Add loading animation styles if not present
    if (!document.querySelector('#chatAnimations')) {
        const style = document.createElement('style');
        style.id = 'chatAnimations';
        style.textContent = `
            @keyframes fadeSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(15px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes loadingPulse {
                0%, 80%, 100% {
                    opacity: 0.3;
                    transform: scale(0.8);
                }
                40% {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .loading-dot {
                font-size: 1.2rem;
                color: #FF8C42;
            }
            
            .chat-message {
                animation: fadeSlideUp 0.3s ease-out;
            }
            
            .exit-btn {
                background: rgba(30, 20, 18, 0.9);
                backdrop-filter: blur(8px);
                border: 1px solid #FF4D2E;
                padding: 0.6rem 1.2rem;
                border-radius: 40px;
                color: #FFAA7A;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-family: inherit;
            }
            
            .exit-btn:hover {
                background: rgba(255, 77, 46, 0.2);
                border-color: #FF8C42;
                color: white;
                transform: scale(1.02);
            }
            
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            input:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== Initialize on DOM Ready =====
document.addEventListener('DOMContentLoaded', initChat);

// ===== Export for module usage (optional) =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        activateMode,
        exitMode,
        handleSendMessage,
        clearChat,
        activeMode
    };
}
