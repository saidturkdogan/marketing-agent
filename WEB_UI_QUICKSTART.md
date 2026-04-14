# 🚀 Marketing Agent Web UI - Quick Start

## Başlatma (3 Adım)

### 1. Server'ı Başlat

```bash
python api.py
```

**Veya** (production için):
```bash
uvicorn api:app --host 0.0.0.0 --port 8080 --reload
```

### 2. Tarayıcıyı Aç

**http://localhost:8080**

### 3. Kampanya Oluştur

1. Dashboard'dan **"New Campaign"** tıklayın
2. Kampanya konusunu yazın (örn: "AI marketing automation")
3. Platform seçin (LinkedIn aktif)
4. **"Create Campaign"** basın
5. İçerik oluşturulurken ilerlemeyi izleyin
6. Sonuçları görüntüleyin!

---

## ✨ Özellikler

✅ **Modern Dark Theme UI** - Göz yormayan tasarım  
✅ **Gerçek Zamanlı İlerleme** - Kampanya adımlarını canlı izleyin  
✅ **LinkedIn Auto-Publish** - Token varsa otomatik paylaşım  
✅ **Dashboard** - Tüm kampanyalarınızı görün  
✅ **Sonuç Görüntüleme** - Sekmeli içerik viewer  
✅ **Responsive** - Mobil uyumlu  

---

## 📱 Ekranlar

### Dashboard
- Toplam kampanya sayısı
- Yayınlanan post sayısı
- Ortalama performans skoru
- Son kampanyalar listesi

### Kampanya Oluştur
- Konu ve hedef formu
- Platform seçimi (LinkedIn, Twitter, Instagram, TikTok)
- İçerik tipi seçimi (social, blog, video, images)
- Auto-publish toggle

### İlerleme
- 6 adımlı pipeline gösterimi
- Canlı aktivite logu
- Durum animasyonları

### Sonuçlar
- Performans skoru
- LinkedIn post linki (yayınlandıysa)
- Sekmeli içerik:
  - Social Media Posts
  - Blog Post (markdown)
  - Video Script
  - Analytics

### Ayarlar
- LinkedIn token durumu
- Platform entegrasyonları
- Gelecek özellikler

---

## 🔐 LinkedIn Kurulumu (Opsiyonel)

Auto-publish için gerekli, ama olmadan da çalışır (sadece içerik üretir).

### Hızlı Kurulum (15 dk):

```bash
# 1. .env dosyasına ekle
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx

# 2. Token oluştur
python scripts/linkedin_oauth_setup.py

# 3. Server'ı yeniden başlat
python api.py
```

**Detaylı rehber:** `docs/LINKEDIN_QUICKSTART.md`

---

## 🎯 İlk Kampanya Örneği

1. **http://localhost:8080** açın
2. **"New Campaign"** tıklayın
3. Formu doldurun:
   - Topic: `AI-powered email automation for SaaS`
   - Platform: `LinkedIn` ✓
   - Content Types: `Social Media Posts` ✓
   - Auto-publish: `Off` (LinkedIn kurulu değilse)
4. **"Create Campaign"**
5. ~30-60 saniye bekleyin
6. Sonuçları görün!

---

## 🔧 API Endpoints

Web UI bu endpointleri kullanır:

| Endpoint | Açıklama |
|----------|----------|
| `GET /` | Web UI |
| `POST /run-campaign` | Kampanya oluştur |
| `GET /health` | Sistem durumu |
| `GET /api/linkedin-status` | LinkedIn token kontrolü |

**Swagger UI:** http://localhost:8080/docs

---

## 💾 Veri Saklama

Kampanyalar **localStorage**'da saklanır (tarayıcıda).

**Avantaj:** Kurulum gerektirmez, hemen çalışır  
**Dezavantaj:** Sadece aynı tarayıcıdan erişilebilir  

**Gelecekte:** PostgreSQL entegrasyonu ile merkezi storage

---

## 🐛 Sorun Giderme

### "Web UI açılmıyor"
- `python api.py` çalıştığından emin olun
- Konsol loglarını kontrol edin
- Port 8080 boş olsun

### "Kampanya başarısız"
- `.env` dosyasında `GOOGLE_API_KEY` ayarlanmış olmalı
- İnternet bağlantısı olmalı
- API loglarını kontrol edin

### "LinkedIn publish başarısız"
- Token süresi dolmuş olabilir
```bash
python scripts/linkedin_oauth_setup.py
```
- Yeni token oluşturup server'ı yeniden başlatın

---

## 📚 Dokümantasyon

- **Web UI Rehberi:** `docs/WEB_UI_GUIDE.md`
- **LinkedIn Kurulum:** `docs/LINKEDIN_QUICKSTART.md`
- **Genel Mimar:** `ARCHITECTURE.md`
- **Agent Referans:** `AGENTS.md`

---

## 🎉 Keyifli Kullanımlar!

Sorularınız için Swagger UI'ı ziyaret edin: http://localhost:8080/docs
