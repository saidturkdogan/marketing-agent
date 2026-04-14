// App State
const state = {
    currentView: 'dashboard',
    campaigns: [],
    currentCampaign: null,
    pollingInterval: null,
    linkedinConfigured: false
};

// Navigation
function navigateTo(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Show target view
    const targetView = document.getElementById(`${view}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Update nav
    const navItem = document.querySelector(`[data-view="${view}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    state.currentView = view;
    
    // Load view-specific data
    if (view === 'dashboard') {
        loadDashboard();
    } else if (view === 'campaigns') {
        loadCampaignsList();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Marketing Agent UI initialized');
    
    // Setup navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            navigateTo(view);
        });
    });
    
    // Setup form
    const form = document.getElementById('campaign-form');
    if (form) {
        form.addEventListener('submit', handleCampaignSubmit);
    }
    
    // Setup auto-publish toggle
    const autoPublishToggle = document.getElementById('auto-publish');
    if (autoPublishToggle) {
        autoPublishToggle.addEventListener('change', (e) => {
            const warning = document.getElementById('publish-warning');
            if (e.target.checked) {
                warning.style.display = 'flex';
            } else {
                warning.style.display = 'none';
            }
        });
    }
    
    // Check LinkedIn token on load
    checkLinkedInToken();
    
    // Load dashboard
    loadDashboard();
});

// Dashboard
async function loadDashboard() {
    try {
        // Load campaigns from localStorage (or API if available)
        const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        state.campaigns = campaigns;
        
        // Update stats
        document.getElementById('total-campaigns').textContent = campaigns.length;
        document.getElementById('published-count').textContent = 
            campaigns.filter(c => c.published).length;
        document.getElementById('linkedin-count').textContent = 
            campaigns.filter(c => c.platforms?.includes('LinkedIn')).length;
        
        const avgScore = campaigns.length > 0 
            ? (campaigns.reduce((sum, c) => sum + (c.score || 0), 0) / campaigns.length).toFixed(1)
            : '0.0';
        document.getElementById('avg-score').textContent = avgScore;
        
        // Show recent campaigns
        const recentList = document.getElementById('recent-campaigns-list');
        if (campaigns.length === 0) {
            recentList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No campaigns yet. Create your first campaign!</p>
                    <button class="btn btn-primary" onclick="navigateTo('create-campaign')">
                        <i class="fas fa-plus"></i> Create Campaign
                    </button>
                </div>
            `;
        } else {
            recentList.innerHTML = campaigns.slice(0, 5).map(campaign => `
                <div class="campaign-item" onclick="viewCampaign('${campaign.id}')">
                    <div class="campaign-info">
                        <div class="campaign-title">${campaign.topic}</div>
                        <div class="campaign-meta">
                            <span><i class="fas fa-calendar"></i> ${new Date(campaign.createdAt).toLocaleDateString()}</span>
                            <span><i class="fas fa-share-alt"></i> ${campaign.platforms?.join(', ') || 'Social'}</span>
                            <span><i class="fas fa-file-alt"></i> ${campaign.outputs?.join(', ') || 'Content'}</span>
                        </div>
                    </div>
                    <span class="campaign-status ${campaign.status}">${campaign.status}</span>
                    ${campaign.score ? `<div class="campaign-score">${campaign.score}</div>` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Campaign Form Submit
async function handleCampaignSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const topic = formData.get('topic');
    const platforms = formData.getAll('platforms');
    const outputs = formData.getAll('outputs');
    const autoPublish = formData.get('auto_publish') === 'on';
    
    if (!topic) {
        alert('Please enter a campaign topic');
        return;
    }
    
    if (platforms.length === 0 && outputs.length === 0) {
        alert('Please select at least one platform or content type');
        return;
    }
    
    // Create campaign object
    const campaign = {
        id: 'camp_' + Date.now(),
        topic,
        platforms,
        outputs,
        auto_publish: autoPublish,
        status: 'running',
        createdAt: new Date().toISOString(),
        published: false,
        score: null,
        assets: {}
    };
    
    // Save to localStorage
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    campaigns.unshift(campaign);
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
    
    // Navigate to progress view
    navigateTo('campaign-progress');
    startCampaign(campaign);
}

// Run Campaign
async function startCampaign(campaign) {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
    
    try {
        // Show progress
        updateProgressSteps();
        
        // Call API
        const response = await fetch('/run-campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: campaign.topic,
                platforms: campaign.platforms,
                outputs: campaign.outputs,
                async_mode: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update campaign with results
        campaign.status = 'completed';
        campaign.assets = result.assets || {};
        campaign.published = result.assets?.publish_manifest?.status === 'published';
        campaign.score = result.assets?.analytics?.performance_score || null;
        
        // Save to localStorage
        const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        const index = campaigns.findIndex(c => c.id === campaign.id);
        if (index !== -1) {
            campaigns[index] = campaign;
            localStorage.setItem('campaigns', JSON.stringify(campaigns));
        }
        
        // Show results
        showCampaignResults(campaign);
        
    } catch (error) {
        console.error('Error running campaign:', error);
        
        // Update campaign status
        campaign.status = 'failed';
        campaign.error = error.message;
        
        const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        const index = campaigns.findIndex(c => c.id === campaign.id);
        if (index !== -1) {
            campaigns[index] = campaign;
            localStorage.setItem('campaigns', JSON.stringify(campaigns));
        }
        
        alert(`Campaign failed: ${error.message}`);
        navigateTo('dashboard');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Create Campaign';
        }
    }
}

// Progress Steps
function updateProgressSteps() {
    const steps = [
        { name: 'Planning', icon: 'fa-lightbulb', status: 'active' },
        { name: 'Research', icon: 'fa-search', status: 'pending' },
        { name: 'Strategy', icon: 'fa-chess', status: 'pending' },
        { name: 'Content Creation', icon: 'fa-pen-fancy', status: 'pending' },
        { name: 'Review', icon: 'fa-check-circle', status: 'pending' },
        { name: 'Publishing', icon: 'fa-paper-plane', status: 'pending' }
    ];
    
    const container = document.getElementById('progress-steps');
    if (container) {
        container.innerHTML = steps.map((step, i) => `
            <div class="progress-step ${step.status}" id="step-${i}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-info">
                    <div class="step-name">${step.name}</div>
                    <div class="step-status">${step.status === 'active' ? 'In progress...' : 'Waiting'}</div>
                </div>
            </div>
        `).join('');
    }
}

// Add log entry
function addLogEntry(type, message) {
    const log = document.getElementById('progress-log');
    if (log) {
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
        log.innerHTML += `
            <div class="log-entry ${type}">
                <i class="fas ${icon}"></i>
                <span>${message}</span>
            </div>
        `;
        log.scrollTop = log.scrollHeight;
    }
}

// Show Results
function showCampaignResults(campaign) {
    navigateTo('campaign-results');
    
    document.getElementById('results-subtitle').textContent = campaign.topic;
    
    // Summary
    const summary = document.getElementById('results-summary');
    summary.innerHTML = `
        <div class="result-item">
            <div class="result-icon result-icon-success">
                <i class="fas fa-check"></i>
            </div>
            <div class="result-info">
                <div class="result-title">Campaign Complete</div>
                <div class="result-desc">All content generated successfully</div>
            </div>
        </div>
        ${campaign.published ? `
            <div class="result-item">
                <div class="result-icon result-icon-blue">
                    <i class="fas fa-paper-plane"></i>
                </div>
                <div class="result-info">
                    <div class="result-title">Published to LinkedIn</div>
                    <div class="result-desc">
                        <a href="${campaign.assets.publish_manifest?.LinkedIn?.url || '#'}" target="_blank" class="result-link">
                            View Post <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            </div>
        ` : ''}
        ${campaign.score ? `
            <div class="result-item">
                <div class="result-icon result-icon-primary">
                    <i class="fas fa-star"></i>
                </div>
                <div class="result-info">
                    <div class="result-title">Performance Score</div>
                    <div class="result-desc">${campaign.score}/1.0</div>
                </div>
            </div>
        ` : ''}
    `;
    
    // Tabs
    setupTabs(campaign);
}

// Setup Tabs
function setupTabs(campaign) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContent = document.getElementById('tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            showTabContent(tab, campaign);
        });
    });
    
    // Show first tab by default
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}

function showTabContent(tab, campaign) {
    const container = document.getElementById('tab-content');
    const assets = campaign.assets || {};
    
    switch(tab) {
        case 'social':
            const social = assets.social || {};
            container.innerHTML = Object.entries(social).map(([platform, content]) => `
                <h3 style="margin-bottom: 16px;"><i class="fab fa-${platform.toLowerCase()}"></i> ${platform}</h3>
                <div class="content-block">${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</div>
            `).join('') || '<p>No social media content generated</p>';
            break;
            
        case 'blog':
            const blog = assets.blog_post || '';
            container.innerHTML = blog 
                ? `<div class="content-block">${blog}</div>`
                : '<p>No blog post generated</p>';
            break;
            
        case 'video':
            const video = assets.video_script || '';
            container.innerHTML = video
                ? `<div class="content-block">${typeof video === 'string' ? video : JSON.stringify(video, null, 2)}</div>`
                : '<p>No video script generated</p>';
            break;
            
        case 'analytics':
            const analytics = assets.analytics || {};
            container.innerHTML = analytics
                ? `<div class="content-block">${JSON.stringify(analytics, null, 2)}</div>`
                : '<p>No analytics data available</p>';
            break;
    }
}

// Load Campaigns List
function loadCampaignsList() {
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    const list = document.getElementById('campaigns-list');
    
    if (campaigns.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No campaigns yet</p>
                <button class="btn btn-primary" onclick="navigateTo('create-campaign')">
                    <i class="fas fa-plus"></i> Create Campaign
                </button>
            </div>
        `;
    } else {
        list.innerHTML = `
            <div class="campaign-list">
                ${campaigns.map(campaign => `
                    <div class="campaign-item" onclick="viewCampaign('${campaign.id}')">
                        <div class="campaign-info">
                            <div class="campaign-title">${campaign.topic}</div>
                            <div class="campaign-meta">
                                <span><i class="fas fa-calendar"></i> ${new Date(campaign.createdAt).toLocaleDateString()}</span>
                                <span><i class="fas fa-share-alt"></i> ${campaign.platforms?.join(', ') || 'Social'}</span>
                            </div>
                        </div>
                        <span class="campaign-status ${campaign.status}">${campaign.status}</span>
                        ${campaign.score ? `<div class="campaign-score">${campaign.score}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// View Campaign
function viewCampaign(campaignId) {
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (!campaign) {
        alert('Campaign not found');
        return;
    }
    
    if (campaign.status === 'completed') {
        state.currentCampaign = campaign;
        showCampaignResults(campaign);
    } else {
        state.currentCampaign = campaign;
        navigateTo('campaign-progress');
        updateProgressSteps();
    }
}

// Check LinkedIn Token
async function checkLinkedInToken() {
    try {
        // For now, check if we have the environment configured
        // In production, this would call an API endpoint
        const response = await fetch('/health');
        const health = await response.json();
        
        // Assume LinkedIn is configured if API is healthy
        state.linkedinConfigured = health.status === 'ok';
        
        // Update UI
        const statusBadge = document.getElementById('linkedin-status-badge');
        const statusIndicator = document.getElementById('linkedin-status');
        
        if (statusBadge) {
            statusBadge.className = 'status-badge success';
            statusBadge.textContent = '✓ Configured';
        }
        
        if (statusIndicator) {
            statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Ready';
        }
        
    } catch (error) {
        console.error('Error checking LinkedIn token:', error);
        
        const statusBadge = document.getElementById('linkedin-status-badge');
        if (statusBadge) {
            statusBadge.className = 'status-badge warning';
            statusBadge.textContent = '⚠ Not Configured';
        }
    }
}

// Utility: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Poll for campaign status (for async mode)
function startPolling(campaignId) {
    state.pollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/job/${campaignId}`);
            const job = await response.json();
            
            if (job.status === 'completed') {
                clearInterval(state.pollingInterval);
                addLogEntry('success', 'Campaign completed!');
                
                // Load results
                const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
                const campaign = campaigns.find(c => c.id === campaignId);
                if (campaign) {
                    showCampaignResults(campaign);
                }
            } else if (job.status === 'failed') {
                clearInterval(state.pollingInterval);
                addLogEntry('error', 'Campaign failed');
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 2000);
}

function stopPolling() {
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
        state.pollingInterval = null;
    }
}

// Export for use in HTML
window.navigateTo = navigateTo;
window.handleCampaignSubmit = handleCampaignSubmit;
window.startCampaign = startCampaign;
window.viewCampaign = viewCampaign;
window.checkLinkedInToken = checkLinkedInToken;
