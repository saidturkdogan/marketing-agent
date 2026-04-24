# Full Java Migration Plan

Bu plan, mevcut Python tabanli AI workflow'un tamamen Java'ya alinmasi icin uygulanabilir yol haritasidir.

## Hedef Durum

- Tek runtime: Java 21 + Spring Boot
- Tek backend: `apps/backend`
- AI orchestration, RAG, publish, persistence hepsi Java tarafinda
- Python katmani kaldirilir

## Fazlar

1. **Core Orchestration (tamamlandi-baslangic)**
   - `JavaAiOrchestratorService` eklendi
   - `CampaignService` Python bridge yerine Java orchestrator kullaniyor
   - `/api/health` Java-local status veriyor

2. **Agent Contract ve Pipeline**
   - `Planner`, `Researcher`, `Strategist`, `Writers`, `Reviewer`, `Analytics` agent interface'leri
   - Deterministic queue ve parallel step modeli
   - State modeli (`CampaignState`) + merge stratejisi
   - Durum: tamamlandi (`AgentStep`, `CampaignWorkflowRunner`, platform bazli parallel social writer)

3. **LLM ve Prompt Katmani**
   - LangChain4j veya Spring AI entegrasyonu
   - Prompt template repository
   - Structured output parser
   - Durum: kismen tamamlandi (`PromptCatalog`, Gemini REST client + fallback). Structured JSON parser sonraki iyilestirme.

4. **Tooling Portu**
   - Search/trend/platform utility'leri Java client katmanina tasima
   - Publisher adaptorleri Java'da standard hale getirme
   - Durum: kismen tamamlandi (`SeoToolService`, `TrendToolService`, `PlatformToolService`, `PolicyToolService`, LinkedIn publisher).

5. **Persistence ve Queue**
   - JPA entity/repository (`campaigns`, `assets`, `jobs`, `publish_logs`)
   - Redis queue + worker
   - idempotent retry mekanizmasi
   - Durum: JPA/Flyway tablolar tamamlandi. Redis async worker sonraki adim.

6. **RAG / Vector**
   - pgvector (onerilen) veya Qdrant
   - embedding write + top-k retrieval
   - analytics context enrichment
   - Durum: Java-native RAG storage + deterministic embedding + top-k cosine retrieval eklendi. pgvector'a gecis sonraki optimizasyon.

7. **Temizlik**
   - Python runtime dependency'lerini kaldirma
   - Terk edilen hybrid/FastAPI bridge dosyalarini silme
   - CI'yi Java + frontend odakli sadeleştirme
   - Durum: hybrid bridge dosyalari ve eski root Python uygulamasi temizlendi.

## Kisa Karar

- Script calistirma ve FastAPI bridge yaklasimlari kaldirildi.
- Yolumuz: dogrudan Java-native AI platform.
