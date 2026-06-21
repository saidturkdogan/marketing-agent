package com.plinth.service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.plinth.llm.LlmService;
import com.plinth.persistence.entity.CompanyEntity;
import com.plinth.persistence.entity.GmailMessageEntity;
import com.plinth.persistence.entity.GmailTokenEntity;
import com.plinth.persistence.repository.CompanyRepository;
import com.plinth.persistence.repository.GmailMessageRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Properties;

@Service
public class GmailFetchService {

    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    private final GmailAuthService gmailAuthService;
    private final GmailMessageRepository gmailMessageRepository;
    private final CompanyRepository companyRepository;
    private final LlmService llmService;

    public GmailFetchService(GmailAuthService gmailAuthService,
                             GmailMessageRepository gmailMessageRepository,
                             CompanyRepository companyRepository,
                             LlmService llmService) {
        this.gmailAuthService = gmailAuthService;
        this.gmailMessageRepository = gmailMessageRepository;
        this.companyRepository = companyRepository;
        this.llmService = llmService;
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

                    byte[] rawBytes = Base64.getUrlDecoder().decode(full.getRaw());
                    MimeMessage mimeMessage = new MimeMessage(
                            Session.getDefaultInstance(new Properties()),
                            new ByteArrayInputStream(rawBytes)
                    );

                    GmailMessageEntity entity = new GmailMessageEntity();
                    entity.setCompanyId(companyId);
                    entity.setMessageId(msg.getId());
                    entity.setFrom(mimeMessage.getHeader("From", null));
                    entity.setTo(mimeMessage.getHeader("To", null));
                    entity.setSubject(mimeMessage.getSubject());
                    entity.setSnippet(full.getSnippet());

                    String body = "";
                    try {
                        body = getTextFromMimeMessage(mimeMessage);
                    } catch (Exception e) {
                        body = full.getSnippet();
                    }
                    entity.setBody(body);

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

    @Transactional
    public void sendEmail(String companyId, String to, String subject, String bodyText, String threadId) {
        if (gmailAuthService.isConnected(companyId)) {
            GmailTokenEntity token = gmailAuthService.getToken(companyId);
            var credential = gmailAuthService.loadCredential(token);
            try {
                Gmail service = new Gmail.Builder(
                        GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY, credential)
                        .setApplicationName("Plinth")
                        .build();

                Session session = Session.getDefaultInstance(new Properties(), null);
                MimeMessage email = new MimeMessage(session);
                email.setFrom(new jakarta.mail.internet.InternetAddress("me"));
                email.addRecipient(jakarta.mail.Message.RecipientType.TO, new jakarta.mail.internet.InternetAddress(to));
                email.setSubject(subject);
                email.setText(bodyText, "utf-8");

                if (threadId != null && !threadId.isEmpty()) {
                    email.setHeader("In-Reply-To", threadId);
                    email.setHeader("References", threadId);
                }

                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                email.writeTo(buffer);
                byte[] rawMessageBytes = buffer.toByteArray();
                String encodedEmail = Base64.getUrlEncoder().encodeToString(rawMessageBytes);
                
                Message message = new Message();
                message.setRaw(encodedEmail);
                if (threadId != null && !threadId.isEmpty()) {
                    message.setThreadId(threadId);
                }

                service.users().messages().send("me", message).execute();

                // Store in DB as outgoing message
                GmailMessageEntity sentEntity = new GmailMessageEntity();
                sentEntity.setCompanyId(companyId);
                sentEntity.setMessageId("sent_" + System.currentTimeMillis());
                sentEntity.setFrom("me");
                sentEntity.setTo(to);
                sentEntity.setSubject(subject);
                sentEntity.setSnippet(bodyText.length() > 100 ? bodyText.substring(0, 100) + "..." : bodyText);
                sentEntity.setBody(bodyText);
                sentEntity.setReceivedAt(OffsetDateTime.now(ZoneOffset.UTC));
                gmailMessageRepository.save(sentEntity);

            } catch (Exception e) {
                throw new RuntimeException("Failed to send real Gmail message: " + e.getMessage(), e);
            }
        } else {
            // Simulation mode: Mock send
            GmailMessageEntity sentEntity = new GmailMessageEntity();
            sentEntity.setCompanyId(companyId);
            sentEntity.setMessageId("sent_mock_" + System.currentTimeMillis());
            sentEntity.setFrom("me");
            sentEntity.setTo(to);
            sentEntity.setSubject(subject);
            sentEntity.setSnippet(bodyText.length() > 100 ? bodyText.substring(0, 100) + "..." : bodyText);
            sentEntity.setBody(bodyText);
            sentEntity.setReceivedAt(OffsetDateTime.now(ZoneOffset.UTC));
            gmailMessageRepository.save(sentEntity);
        }
    }

    public String draftReply(String companyId, String emailSubject, String emailBody, String senderName) {
        CompanyEntity company = companyRepository.findByCompanyId(companyId).orElse(null);
        String brandContext = "";
        if (company != null) {
            brandContext = String.format("Company: %s. Industry: %s. Description: %s. Target Audience: %s.",
                    company.getName(),
                    company.getIndustry() != null ? company.getIndustry() : "Unknown",
                    company.getDescription() != null ? company.getDescription() : "",
                    company.getTargetAudience() != null ? company.getTargetAudience() : "");
        }

        String systemPrompt = "You are a professional marketing assistant. " +
                "Draft a polite, helpful and professional response to the customer's email. " +
                "Write ONLY the email body response. Do not include subject lines, placeholders, or headers. " +
                "Sign off cleanly. Keep it short (under 150 words). " +
                "Here is the brand context: " + brandContext;

        String userPrompt = String.format("Reply to this email from '%s':\nSubject: %s\nBody: %s",
                senderName, emailSubject, emailBody);

        return llmService.generate(systemPrompt, userPrompt);
    }

    public List<GmailMessageEntity> getMockMessages(String companyId) {
        List<GmailMessageEntity> dbMessages = gmailMessageRepository.findByCompanyIdOrderByReceivedAtDesc(companyId);
        if (dbMessages.isEmpty()) {
            return generateMockMessagesInDb(companyId);
        }
        return dbMessages;
    }

    @Transactional
    public List<GmailMessageEntity> generateMockMessagesInDb(String companyId) {
        List<GmailMessageEntity> mockList = new ArrayList<>();

        GmailMessageEntity msg1 = new GmailMessageEntity();
        msg1.setCompanyId(companyId);
        msg1.setMessageId("mock_1");
        msg1.setFrom("jessica.jones@growthflow.io");
        msg1.setTo("inquiries@brand.com");
        msg1.setSubject("Partnership Request with Plinth Team");
        msg1.setSnippet("Hi there! I came across your business profile and was really impressed. We offer B2B lead generation services...");
        msg1.setBody("Hi there!\n\nI came across your business profile and was really impressed with what you are building. We at GrowthFlow help businesses in your industry generate high-quality outbound leads.\n\nI would love to set up a quick 10-minute partnership call this Thursday to see if there is any room for collaboration.\n\nBest,\nJessica Jones\nPartnership Manager");
        msg1.setReceivedAt(OffsetDateTime.now(ZoneOffset.UTC).minusHours(2));
        mockList.add(gmailMessageRepository.save(msg1));

        GmailMessageEntity msg2 = new GmailMessageEntity();
        msg2.setCompanyId(companyId);
        msg2.setMessageId("mock_2");
        msg2.setFrom("mark.sykes@venturecap.com");
        msg2.setTo("founders@brand.com");
        msg2.setSubject("Investment / Introduction Inquiry");
        msg2.setSnippet("Hello Founder, I am an associate at VentureCap. We are currently scouting for startups in your sector...");
        msg2.setBody("Hello Founder,\n\nI am an associate at VentureCap. We have been tracking your sector closely and noticed your growth recently.\n\nWe are looking to invest in early-stage startups and would love to request a demo or intro deck. Do you have some time for a quick chat next week?\n\nWarm regards,\nMark Sykes\nVentureCap");
        msg2.setReceivedAt(OffsetDateTime.now(ZoneOffset.UTC).minusHours(6));
        mockList.add(gmailMessageRepository.save(msg2));

        GmailMessageEntity msg3 = new GmailMessageEntity();
        msg3.setCompanyId(companyId);
        msg3.setMessageId("mock_3");
        msg3.setFrom("support@plinth.ai");
        msg3.setTo("admin@brand.com");
        msg3.setSubject("Welcome to Plinth Email Automation");
        msg3.setSnippet("Welcome to your Plinth Email Inbox page! This is a demo mailbox where you can test reading and replying to emails...");
        msg3.setBody("Welcome to your Plinth Email Inbox page!\n\nThis is a simulated mailbox where you can safely test the inbox interface, draft responses using our built-in AI Draft assistant (powered by Google Gemini), and simulate sending emails.\n\nTo fetch real emails and reply directly to your customers, please go to the Settings or Onboarding page and connect your Google Gmail account!\n\nIf you have any questions, feel free to reply to this email, and our agent will help you out.\n\nBest regards,\nThe Plinth Team");
        msg3.setReceivedAt(OffsetDateTime.now(ZoneOffset.UTC).minusDays(1));
        mockList.add(gmailMessageRepository.save(msg3));

        return gmailMessageRepository.findByCompanyIdOrderByReceivedAtDesc(companyId);
    }

    private String getTextFromMimeMessage(jakarta.mail.Part p) throws Exception {
        if (p.isMimeType("text/*")) {
            return (String) p.getContent();
        }

        if (p.isMimeType("multipart/alternative")) {
            jakarta.mail.internet.MimeMultipart mp = (jakarta.mail.internet.MimeMultipart) p.getContent();
            String text = null;
            for (int i = 0; i < mp.getCount(); i++) {
                jakarta.mail.Part bp = mp.getBodyPart(i);
                if (bp.isMimeType("text/plain")) {
                    if (text == null) text = getTextFromMimeMessage(bp);
                } else if (bp.isMimeType("text/html")) {
                    String s = getTextFromMimeMessage(bp);
                    if (s != null) return s;
                } else {
                    String s = getTextFromMimeMessage(bp);
                    if (s != null) text = s;
                }
            }
            return text;
        } else if (p.isMimeType("multipart/*")) {
            jakarta.mail.internet.MimeMultipart mp = (jakarta.mail.internet.MimeMultipart) p.getContent();
            for (int i = 0; i < mp.getCount(); i++) {
                String s = getTextFromMimeMessage(mp.getBodyPart(i));
                if (s != null) return s;
            }
        }
        return "";
    }
}
