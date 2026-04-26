package com.marketingagent.rag;

import com.marketingagent.persistence.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.List;

@Entity
@Table(name = "rag_documents")
public class RagDocumentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false)
    private String campaignId;

    @Column(nullable = false, length = 4000)
    private String topic;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    /**
     * Legacy embedding column (kept for backward compatibility).
     * New code should use embeddingVec instead.
     */
    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "embedding", columnDefinition = "text")
    private List<String> embedding;

    /**
     * Native pgvector column — used for real semantic similarity search.
     * 4096 dimensions matches qwen3-embedding-8b output.
     */
    @Column(name = "embedding_vec", columnDefinition = "vector(4096)")
    private String embeddingVec;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }

    // --- getters & setters ---

    public Long getId() { return id; }
    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public List<String> getEmbedding() { return embedding; }
    public void setEmbedding(List<String> embedding) { this.embedding = embedding; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    /**
     * Returns the raw pgvector string representation, e.g. "[0.1,0.2,...]".
     */
    public String getEmbeddingVec() { return embeddingVec; }

    /**
     * Accepts a pgvector-format string, e.g. "[0.1,0.2,...]".
     */
    public void setEmbeddingVec(String embeddingVec) { this.embeddingVec = embeddingVec; }

    /**
     * Convenience setter: converts a float[] to the pgvector string format.
     */
    public void setEmbeddingVecFromArray(float[] vector) {
        if (vector == null) {
            this.embeddingVec = null;
            return;
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vector[i]);
        }
        sb.append("]");
        this.embeddingVec = sb.toString();
    }
}
