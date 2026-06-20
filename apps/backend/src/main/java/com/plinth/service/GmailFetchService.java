package com.plinth.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.plinth.persistence.entity.GmailMessageEntity;
import com.plinth.persistence.entity.GmailTokenEntity;
import com.plinth.persistence.repository.GmailMessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GmailFetchService {

    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final Pattern FROM_PATTERN = Pattern.compile("From:\\s*([^\\r\\n]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern TO_PATTERN = Pattern.compile("To:\\s*([^\\r\\n]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUBJECT_PATTERN = Pattern.compile("Subject:\\s*([^\\r\\n]+)", Pattern.CASE_INSENSITIVE);

    private final GmailAuthService gmailAuthService;
    private final GmailMessageRepository gmailMessageRepository;

    public GmailFetchService(GmailAuthService gmailAuthService, GmailMessageRepository gmailMessageRepository) {
        this.gmailAuthService = gmailAuthService;
        this.gmailMessageRepository = gmailMessageRepository;
    }

    @Transactional
    public List<GmailMessageEntity> fetchRecentEmails(String companyId, int maxResults) {
        GmailTokenEntity token = gmailAuthService.getToken(companyId);
        var credential = gmailAuthService.loadCredential(token);

        try {
            Gmail service = new Gmail.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY, credential)
                    .setApplicationName("Plinth")
                    .build();

            ListMessagesResponse listResponse = service.users().messages().list("me")
                    .setMaxResults((long) maxResults)
                    .setQ("in:inbox")
                    .execute();

            List<GmailMessageEntity> saved = new ArrayList<>();
            if (listResponse.getMessages() != null) {
                for (Message msg : listResponse.getMessages()) {
                    if (gmailMessageRepository.existsByMessageId(msg.getId())) continue;

                    Message full = service.users().messages().get("me", msg.getId())
                            .setFormat("raw")
                            .execute();

                    String raw = new String(Base64.getUrlDecoder().decode(full.getRaw()));
                    GmailMessageEntity entity = new GmailMessageEntity();
                    entity.setCompanyId(companyId);
                    entity.setMessageId(msg.getId());
                    entity.setFrom(extractHeader(raw, FROM_PATTERN));
                    entity.setTo(extractHeader(raw, TO_PATTERN));
                    entity.setSubject(extractHeader(raw, SUBJECT_PATTERN));
                    entity.setSnippet(full.getSnippet());
                    if (full.getInternalDate() != null) {
                        entity.setReceivedAt(OffsetDateTime.ofInstant(
                                Instant.ofEpochMilli(full.getInternalDate()), ZoneOffset.UTC));
                    }
                    saved.add(gmailMessageRepository.save(entity));
                }
            }
            return saved;

        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch Gmail messages", e);
        }
    }

    public List<GmailMessageEntity> getMessages(String companyId) {
        return gmailMessageRepository.findByCompanyIdOrderByReceivedAtDesc(companyId);
    }

    private String extractHeader(String raw, Pattern pattern) {
        Matcher matcher = pattern.matcher(raw);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "";
    }
}
