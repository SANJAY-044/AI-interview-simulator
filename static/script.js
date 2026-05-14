// Set this to your Render URL when deploying (e.g., 'https://my-app.onrender.com')
// Leave it as an empty string '' when running locally.
const BACKEND_URL = '';

let currentQuestion = null;
let questionsAsked = [];
let scores = [];
let fullHistory = [];

const elements = {
    chatHistory: document.getElementById('chatHistory'),
    answerInput: document.getElementById('answerInput'),
    sendBtn: document.getElementById('sendBtn'),
    startBtn: document.getElementById('startBtn'),
    roleInput: document.getElementById('role'),
    experienceInput: document.getElementById('experience'),
    statQuestions: document.getElementById('stat-questions'),
    statScore: document.getElementById('stat-score'),
    statStatus: document.getElementById('stat-status'),
    latestScore: document.getElementById('latest-score'),
    historyList: document.getElementById('historyList'),
    
    // Settings
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    settingsMsg: document.getElementById('settingsMsg')
};

// Navigation logic (SPA)
const navLinks = document.querySelectorAll('.nav-links li');
const views = document.querySelectorAll('.view-section');
const topbarTitle = document.getElementById('topbar-title');
const topbarSubtitle = document.getElementById('topbar-subtitle');
const topbarActions = document.getElementById('topbar-actions');

const pageInfo = {
    'view-dashboard': { title: 'Interview Dashboard', sub: 'Master your next technical interview.', showActions: true },
    'view-history': { title: 'Interview History', sub: 'Review your past answers and feedback.', showActions: false },
    'view-analytics': { title: 'Analytics Overview', sub: 'Deep dive into your performance metrics.', showActions: false },
    'view-settings': { title: 'Settings', sub: 'Configure your application preferences and API keys.', showActions: false }
};

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const targetId = link.getAttribute('data-target');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
        
        const info = pageInfo[targetId];
        topbarTitle.innerText = info.title;
        topbarSubtitle.innerText = info.sub;
        topbarActions.style.display = info.showActions ? 'flex' : 'none';
        
        if(targetId === 'view-history') renderHistory();
    });
});

// Chart.js Setup
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Outfit', sans-serif";

const ctx = document.getElementById('scoreChart').getContext('2d');
const scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Score History',
            data: [],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#8b5cf6',
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: { min: 0, max: 10, grid: { color: 'rgba(42, 49, 67, 0.5)' } },
            x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 1000, easing: 'easeOutQuart' }
    }
});

const ctxLarge = document.getElementById('largeScoreChart').getContext('2d');
const largeScoreChart = new Chart(ctxLarge, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Score History',
            data: [],
            backgroundColor: '#6366f1',
            borderRadius: 6
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: { min: 0, max: 10, grid: { color: 'rgba(42, 49, 67, 0.5)' } },
            x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
    }
});


function updateDashboard(score) {
    if (score !== undefined) {
        scores.push(score);
        const label = `Q${scores.length}`;
        
        scoreChart.data.labels.push(label);
        scoreChart.data.datasets[0].data.push(score);
        scoreChart.update();
        
        largeScoreChart.data.labels.push(label);
        largeScoreChart.data.datasets[0].data.push(score);
        largeScoreChart.update();
        
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        elements.statScore.innerHTML = `${avg.toFixed(1)}<span class="max-score">/10</span>`;
        
        elements.latestScore.innerText = score;
        const displayDiv = document.querySelector('.score-display');
        const percentage = (score / 10) * 100;
        
        let color = 'var(--accent-1)'; // Green
        if (score < 5) color = '#ef4444'; // Red
        else if (score < 8) color = 'var(--accent-2)'; // Orange
        
        displayDiv.style.background = `conic-gradient(${color} ${percentage}%, var(--bg-main) 0%)`;
    }
    elements.statQuestions.innerText = questionsAsked.length;
}

// History Renderer
function renderHistory() {
    if (fullHistory.length === 0) return;
    elements.historyList.innerHTML = '';
    
    fullHistory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        let colorClass = 'good';
        if(item.s < 5) colorClass = 'bad';
        else if(item.s < 8) colorClass = 'avg';
        
        div.innerHTML = `
            <div class="history-s ${colorClass}">${item.s}/10</div>
            <div class="history-q">Q${index+1}: ${item.q}</div>
            <div class="history-a"><strong>Your Answer:</strong><br>${item.a}</div>
            <div class="history-f"><strong>Feedback:</strong><br>${marked.parse(item.f)}</div>
        `;
        elements.historyList.appendChild(div);
    });
}

elements.answerInput.addEventListener('input', function() {
    this.style.height = '50px';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
});

function addMessage(content, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerHTML = `<div class="msg-content">${marked.parse(content)}</div>`;
    
    const emptyState = elements.chatHistory.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    
    elements.chatHistory.appendChild(msgDiv);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing-indicator-msg';
    typingDiv.innerHTML = `<div class="msg-content typing"><span></span><span></span><span></span></div>`;
    elements.chatHistory.appendChild(typingDiv);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

function hideTyping() {
    const typingDiv = elements.chatHistory.querySelector('.typing-indicator-msg');
    if (typingDiv) typingDiv.remove();
}

// Settings logic
elements.saveSettingsBtn.addEventListener('click', async () => {
    const api_key = elements.apiKeyInput.value.trim();
    if (!api_key) return;
    
    elements.saveSettingsBtn.disabled = true;
    elements.saveSettingsBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
    
    try {
        const res = await fetch(BACKEND_URL + '/api/settings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ api_key })
        });
        if (res.ok) {
            elements.settingsMsg.style.display = 'flex';
            setTimeout(() => { elements.settingsMsg.style.display = 'none'; }, 4000);
            
            // Helpful message if they were stuck on dashboard
            addMessage("*System:* Settings updated successfully. You can now start the interview.", 'ai');
        }
    } catch (e) {
        alert("Error saving settings");
    }
    
    elements.saveSettingsBtn.disabled = false;
    elements.saveSettingsBtn.innerHTML = '<i class="ri-save-line"></i> Save Settings';
});

// Main chat logic
elements.startBtn.addEventListener('click', async () => {
    elements.chatHistory.innerHTML = '';
    questionsAsked = [];
    scores = [];
    fullHistory = [];
    currentQuestion = null;
    
    scoreChart.data.labels = [];
    scoreChart.data.datasets[0].data = [];
    scoreChart.update();
    largeScoreChart.data.labels = [];
    largeScoreChart.data.datasets[0].data = [];
    largeScoreChart.update();
    
    elements.statScore.innerHTML = `0.0<span class="max-score">/10</span>`;
    elements.latestScore.innerText = '-';
    elements.statQuestions.innerText = '0';
    document.querySelector('.score-display').style.background = `conic-gradient(var(--primary) 0%, var(--bg-main) 0%)`;
    
    elements.historyList.innerHTML = `<div class="empty-state"><i class="ri-history-line"></i><h4>No history yet</h4><p>Complete some interview questions to see your history here.</p></div>`;
    
    elements.startBtn.disabled = true;
    elements.statStatus.innerText = 'In Progress';
    elements.statStatus.style.color = 'var(--accent-1)';
    
    showTyping();
    
    try {
        const response = await fetch(BACKEND_URL + '/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: elements.roleInput.value, experience_level: elements.experienceInput.value })
        });
        const data = await response.json();
        hideTyping();
        
        if (response.ok) {
            currentQuestion = data.question;
            questionsAsked.push(currentQuestion);
            updateDashboard();
            addMessage(`### Question 1\n${currentQuestion}`, 'ai');
            
            elements.answerInput.disabled = false;
            elements.sendBtn.disabled = false;
            elements.answerInput.focus();
        } else {
            addMessage(`*Error:* ${data.detail}`, 'ai');
            // Check if error is API key related
            if(data.detail && data.detail.includes("Settings")) {
                setTimeout(() => { document.querySelector('[data-target="view-settings"]').click(); }, 2000);
            }
        }
    } catch (err) {
        hideTyping();
        addMessage(`*Error connecting to server.*`, 'ai');
    }
    elements.startBtn.disabled = false;
    elements.startBtn.innerHTML = '<i class="ri-refresh-line"></i> Restart';
});

elements.sendBtn.addEventListener('click', handleSend);
elements.answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});

async function handleSend() {
    const answer = elements.answerInput.value.trim();
    if (!answer) {
        elements.answerInput.classList.add('error-shake');
        elements.answerInput.placeholder = "Please type an answer first...";
        setTimeout(() => {
            elements.answerInput.classList.remove('error-shake');
            elements.answerInput.placeholder = "Type your answer here...";
        }, 1500);
        elements.answerInput.focus();
        return;
    }
    
    if (!currentQuestion) {
        addMessage("*System:* Please click the **Start Session** button at the top right to begin the interview first!", 'ai');
        return;
    }
    
    addMessage(answer, 'user');
    elements.answerInput.value = '';
    elements.answerInput.style.height = '50px';
    elements.answerInput.disabled = true;
    elements.sendBtn.disabled = true;
    
    showTyping();
    
    try {
        const response = await fetch(BACKEND_URL + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: elements.roleInput.value,
                experience_level: elements.experienceInput.value,
                current_question: currentQuestion,
                answer,
                questions_asked: questionsAsked
            })
        });
        
        const data = await response.json();
        hideTyping();
        
        if (response.ok) {
            updateDashboard(data.score);
            
            // Save to history
            fullHistory.push({
                q: currentQuestion,
                a: answer,
                f: data.feedback,
                s: data.score
            });
            
            addMessage(`### Feedback\n${data.feedback}`, 'ai');
            
            showTyping();
            setTimeout(() => {
                hideTyping();
                currentQuestion = data.next_question;
                questionsAsked.push(currentQuestion);
                updateDashboard();
                addMessage(`### Question ${questionsAsked.length}\n${currentQuestion}`, 'ai');
                
                elements.answerInput.disabled = false;
                elements.sendBtn.disabled = false;
                elements.answerInput.focus();
            }, 1000);
        } else {
            addMessage(`*Error:* ${data.detail}`, 'ai');
            elements.answerInput.disabled = false;
            elements.sendBtn.disabled = false;
        }
    } catch (err) {
        hideTyping();
        addMessage(`*Error connecting to server.*`, 'ai');
        elements.answerInput.disabled = false;
        elements.sendBtn.disabled = false;
    }
}
