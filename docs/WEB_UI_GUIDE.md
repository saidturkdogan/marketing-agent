# Web UI - Marketing Agent

## 🚀 Quick Start

### Start the Web Server

```bash
python api.py
```

Or with uvicorn (recommended for production):

```bash
uvicorn api:app --host 0.0.0.0 --port 8080 --reload
```

**Access the UI:** http://localhost:8080

---

## ✨ Features

### Dashboard
- 📊 Overview statistics (total campaigns, published count, avg score)
- 📋 Recent campaigns list with status tracking
- 🎯 Quick access to create new campaigns

### Campaign Creation
- 📝 Rich form with topic, goal, and platform selection
- 🎨 Visual platform cards showing availability
- 📦 Content type selection (social, blog, video, images)
- ✈️ Auto-publish toggle with LinkedIn integration
- ⚡ Real-time progress tracking

### Campaign Progress
- 🔄 Live status updates for each pipeline stage
- 📋 Detailed activity log
- ✅ Visual step indicators (Planning → Research → Strategy → Content → Review → Publish)

### Campaign Results
- 📊 Performance score display
- 🔗 Direct links to published posts (LinkedIn)
- 📑 Tabbed content viewer:
  - Social Media Posts (by platform)
  - Blog Post (markdown)
  - Video Script
  - Analytics Data
- 📥 Export options

### Settings
- 🔐 LinkedIn token status checker
- ⚙️ Integration configuration panels
- 🚦 Platform availability indicators

---

## 🎨 UI Screenshots

### Dashboard
Modern dark-themed dashboard with:
- Gradient stat cards
- Animated status indicators
- Quick action buttons
- Recent campaigns list

### Campaign Form
Beautiful form layout with:
- Platform selection cards (LinkedIn, Twitter, Instagram, TikTok)
- Content type toggles with icons
- Auto-publish toggle with warnings
- Real-time validation

### Progress View
Real-time campaign tracking:
- Step-by-step progress indicators
- Live activity log
- Status animations

### Results View
Comprehensive results display:
- Summary cards with publish status
- Tabbed content viewer
- Direct links to published posts
- Performance analytics

---

## 🔧 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Web Browser                     │
│           (http://localhost:8080)                │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP Requests
                   ▼
┌─────────────────────────────────────────────────┐
│              FastAPI Server (api.py)             │
│                                                  │
│  GET  /              → index.html               │
│  GET  /static/*      → CSS, JS files            │
│  POST /run-campaign  → Run campaign pipeline    │
│  GET  /job/{id}      → Check job status         │
│  GET  /health        → Health + LinkedIn status │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Calls
                   ▼
┌─────────────────────────────────────────────────┐
│         Marketing Agent Pipeline                 │
│   (core/pipeline.py + agents/*)                 │
└─────────────────────────────────────────────────┘
```

---

## 📱 Pages

### 1. Dashboard (`/`)
**Purpose:** Overview and quick access

**Components:**
- Stats grid with gradient icons
- Recent campaigns list (last 5)
- Empty state with CTA for new users

**Data Flow:**
```javascript
loadDashboard()
  → localStorage.getItem('campaigns')
  → Update stat counters
  → Render recent campaigns list
```

---

### 2. New Campaign (`/` → Create Campaign button)
**Purpose:** Configure and launch campaign

**Form Fields:**
- **Topic** (required): Textarea for campaign brief
- **Goal**: Dropdown (brand awareness, lead gen, etc.)
- **Platforms**: Checkbox grid (LinkedIn active, others coming soon)
- **Content Types**: Checkbox grid (social, blog, video, images)
- **Auto-publish**: Toggle switch for immediate publishing

**LinkedIn Check:**
```javascript
checkLinkedInToken()
  → GET /api/linkedin-status
  → Update platform card status badge
  → Show warning if auto-publish enabled but token missing
```

---

### 3. Campaign Progress (`/` → During campaign)
**Purpose:** Real-time pipeline visualization

**Steps Tracked:**
1. Planning (Planner agent)
2. Research (Researcher + TrendDetector)
3. Strategy (Strategist)
4. Content Creation (Parallel writers)
5. Review (Reviewer)
6. Publishing (Publisher)

**Log Entries:**
- Info: Blue
- Success: Green
- Error: Red

---

### 4. Campaign Results (`/` → After completion)
**Purpose:** View and access all generated content

**Summary Cards:**
- ✅ Campaign complete
- 🚀 Published to LinkedIn (with link)
- ⭐ Performance score

**Tabbed Content:**
- **Social**: Platform-by-platform content display
- **Blog**: Full markdown viewer
- **Video**: Script content
- **Analytics**: JSON analytics data

**Actions:**
- View all campaigns
- Create another campaign

---

### 5. My Campaigns (`/` → My Campaigns nav)
**Purpose:** Full campaign history

**Features:**
- Complete list of all campaigns
- Status badges (completed, running, failed)
- Performance scores
- Click to view details

---

### 6. Settings (`/` → Settings nav)
**Purpose:** Integration management

**Cards:**
- **LinkedIn**: Token status, check button
- **Twitter/X**: Coming soon badge
- **WordPress**: Coming soon badge

---

## 🎯 User Flow

### First-Time User
```
1. Visit http://localhost:8080
2. See empty dashboard
3. Click "Create Campaign"
4. Fill in topic: "AI marketing automation"
5. Select LinkedIn platform
6. Enable auto-publish (if LinkedIn configured)
7. Click "Create Campaign"
8. Watch real-time progress
9. View results with published post link
10. Return to dashboard (now shows 1 campaign)
```

### Returning User
```
1. Visit http://localhost:8080
2. See dashboard with stats
3. Review recent campaigns
4. Click any campaign to view results
5. Or create new campaign
```

---

## 🔐 LinkedIn Integration

### Setup Required (One-Time)

Before auto-publish works:

1. **Configure LinkedIn App** (see `docs/LINKEDIN_QUICKSTART.md`)
2. **Add to .env:**
   ```env
   LINKEDIN_CLIENT_ID=xxx
   LINKEDIN_CLIENT_SECRET=xxx
   LINKEDIN_REDIRECT_URL=http://localhost:8080/linkedin/callback
   ```
3. **Generate Token:**
   ```bash
   python scripts/linkedin_oauth_setup.py
   ```
4. **Restart API:**
   ```bash
   python api.py
   ```

### UI Indicators

**Token Valid:**
- Platform card shows "✓ Ready" (green)
- Settings shows "Configured" badge
- Auto-publish toggle works

**Token Missing/Expired:**
- Platform card shows "⚠ Not Configured" (gray)
- Warning appears when auto-publish enabled
- Settings shows "Not Configured" badge

---

## 🎨 Design System

### Colors
```css
--primary: #667eea       /* Purple-blue gradient */
--secondary: #764ba2     /* Purple */
--success: #48bb78       /* Green */
--warning: #ed8936       /* Orange */
--error: #f56565         /* Red */
--info: #4299e1          /* Blue */

--bg-dark: #0f172a       /* Dark background */
--bg-card: #1e293b       /* Card background */
--bg-input: #334155      /* Input background */
```

### Typography
- Font: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700

### Icons
- Font Awesome 6.4.0
- Platform-specific brand icons

---

## 📊 Data Storage

### Current: LocalStorage
Campaigns stored in browser localStorage:
```javascript
{
  id: 'camp_1234567890',
  topic: 'AI marketing automation',
  platforms: ['LinkedIn'],
  outputs: ['social'],
  auto_publish: true,
  status: 'completed',
  createdAt: '2026-04-13T...',
  published: true,
  score: 0.85,
  assets: { ... }
}
```

### Future: API + PostgreSQL
Switch to backend storage:
```javascript
// Replace localStorage calls with:
const response = await fetch('/api/campaigns');
const campaigns = await response.json();
```

---

## 🚀 Deployment

### Development
```bash
python api.py
# http://localhost:8080
```

### Production with Docker
```bash
docker-compose up
# http://localhost:8080
```

The docker-compose already exposes port 8080.

### Custom Port
```bash
uvicorn api:app --host 0.0.0.0 --port 3000
# http://localhost:3000
```

---

## 🐛 Troubleshooting

### "Web UI not loading"
**Check:**
1. Static files exist: `static/index.html`
2. No console errors in browser
3. API server running: `python api.py`

### "Campaigns not appearing"
**Check:**
1. Browser localStorage enabled
2. No JS errors in console (F12)
3. Try clearing localStorage: `localStorage.clear()`

### "LinkedIn auto-publish not working"
**Check:**
1. Token configured: Visit Settings → LinkedIn → Check Status
2. Token not expired: Run `python core/linkedin_token_manager.py`
3. API logs for error details

### "Campaign fails immediately"
**Check:**
1. Google API key configured in .env
2. LLM service accessible
3. API server logs for error details

---

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] Campaign scheduling (pick publish date/time)
- [ ] Bulk campaign creation
- [ ] Campaign templates
- [ ] A/B testing dashboard
- [ ] Content preview before publish
- [ ] Manual approval workflow
- [ ] Campaign cloning
- [ ] Export to PDF/CSV

### Phase 3 Features
- [ ] Real-time analytics integration
- [ ] Engagement metrics dashboard
- [ ] Multi-user support
- [ ] Campaign collaboration
- [ ] Content calendar view
- [ ] Performance comparisons
- [ ] ROI tracking

### Phase 4 Features
- [ ] AI-powered topic suggestions
- [ ] Trending topics integration
- [ ] Competitor analysis
- [ ] Sentiment analysis
- [ ] Image generation (DALL-E)
- [ ] Video generation

---

## 📚 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Serve web UI |
| GET | `/health` | Health check + LinkedIn status |
| POST | `/run-campaign` | Create and run campaign |
| GET | `/job/{job_id}` | Check async job status |
| GET | `/api/linkedin-status` | Check LinkedIn token |

---

## 💡 Tips

1. **Keep tab open during campaign**: Progress tracking requires active connection
2. **Check LinkedIn status first**: Settings page shows token validity
3. **Use descriptive topics**: Better content generation
4. **Start with social only**: Faster campaigns, add blog/video later
5. **Review before auto-publish**: Toggle off to generate content without publishing

---

## 🎓 Resources

- **LinkedIn Setup**: `docs/LINKEDIN_QUICKSTART.md`
- **Full Architecture**: `ARCHITECTURE.md`
- **Agent Reference**: `AGENTS.md`
- **API Docs**: http://localhost:8080/docs (Swagger UI)

---

**Enjoy your new Marketing Agent Web UI!** 🎉

For questions or issues, check the troubleshooting section above.
