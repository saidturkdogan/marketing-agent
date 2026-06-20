package com.plinth.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "gmail_messages")
public class GmailMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, length = 255)
    private String companyId;

    @Column(name = "message_id", nullable = false, length = 500)
    private String messageId;

    @Column(length = 500)
    private String from;

    @Column(length = 500)
    private String to;

    @Column(length = 1000)
    private String subject;

    @Column(columnDefinition = "text")
    private String snippet;

    @Column(name = "received_at")
    private OffsetDateTime receivedAt;

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    @PrePersist
    void onCreate() {
        this.fetchedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }
    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getSnippet() { return snippet; }
    public void setSnippet(String snippet) { this.snippet = snippet; }
    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(OffsetDateTime receivedAt) { this.receivedAt = receivedAt; }
    public OffsetDateTime getFetchedAt() { return fetchedAt; }
}
