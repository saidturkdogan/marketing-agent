package com.plinth.controller;

import com.plinth.security.AuthUtils;
import com.plinth.service.ApprovalService;
import com.plinth.service.ContentService;
import com.plinth.service.GmailFetchService;
import com.plinth.service.OutreachAgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;
    private final ContentService contentService;
    private final GmailFetchService gmailFetchService;
    private final OutreachAgentService outreachAgentService;
    private final AuthUtils authUtils;

    public ApprovalController(ApprovalService approvalService,
                              ContentService contentService,
                              GmailFetchService gmailFetchService,
                              OutreachAgentService outreachAgentService,
                              AuthUtils authUtils) {
        this.approvalService = approvalService;
        this.contentService = contentService;
        this.gmailFetchService = gmailFetchService;
        this.outreachAgentService = outreachAgentService;
        this.authUtils = authUtils;
    }

    @GetMapping("/{companyId}")
    public ResponseEntity<List<Map<String, Object>>> listPending(@PathVariable String companyId) {
        authUtils.getCurrentUserId();
        List<Map<String, Object>> items = approvalService.getPendingForCompany(companyId).stream()
                .map(approvalService::toMap)
                .toList();
        return ResponseEntity.ok(items);
    }

    @PostMapping("/{approvalId}/approve")
    public ResponseEntity<Map<String, Object>> approve(
            @PathVariable String approvalId,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("reviewerNotes", "") : "";
        String reviewer = authUtils.getCurrentUserEmail();
        var approval = approvalService.approve(approvalId, notes, reviewer);

        Map<String, Object> result = approvalService.toMap(approval);
        if ("email_reply".equals(approval.getStepName()) && approval.getGmailMessageId() != null) {
            try {
                String companyId = approval.getCompanyId();
                String draftBody = approval.getDraftBody();
                if (draftBody == null || draftBody.isBlank()) {
                    throw new IllegalStateException("Email draft body is empty");
                }
                gmailFetchService.sendAgentReply(companyId, approval.getGmailMessageId(), draftBody);
                result.put("emailSent", true);
            } catch (Exception ex) {
                result.put("emailSent", false);
                result.put("sendError", ex.getMessage());
            }
        } else if ("outreach_send".equals(approval.getStepName()) && approval.getOutreachProspectId() != null) {
            try {
                String companyId = approval.getCompanyId();
                String to = approval.getOutreachToEmail();
                String subject = approval.getOutreachSubject();
                String draftBody = approval.getDraftBody();
                if (to == null || to.isBlank() || draftBody == null || draftBody.isBlank()) {
                    throw new IllegalStateException("Outreach email details are incomplete");
                }
                gmailFetchService.sendEmail(companyId, to, subject, draftBody, null);
                outreachAgentService.markSent(companyId, approval.getOutreachProspectId());
                result.put("emailSent", true);
                result.put("outreachSent", true);
            } catch (Exception ex) {
                result.put("emailSent", false);
                result.put("outreachSent", false);
                result.put("sendError", ex.getMessage());
            }
        } else if (approval.getContentId() != null) {
            try {
                Map<String, Object> scheduled = contentService.approveAndSchedule(approval.getContentId());
                result.put("scheduled", scheduled);
            } catch (Exception ex) {
                result.put("scheduleError", ex.getMessage());
            }
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{approvalId}/reject")
    public ResponseEntity<Map<String, Object>> reject(
            @PathVariable String approvalId,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("reviewerNotes", "Rejected") : "Rejected";
        String reviewer = authUtils.getCurrentUserEmail();
        var approval = approvalService.reject(approvalId, notes, reviewer);
        if ("email_reply".equals(approval.getStepName()) && approval.getGmailMessageId() != null
                && approval.getCompanyId() != null) {
            gmailFetchService.markAgentReplyRejected(approval.getCompanyId(), approval.getGmailMessageId());
        }
        if ("outreach_send".equals(approval.getStepName()) && approval.getOutreachProspectId() != null
                && approval.getCompanyId() != null) {
            outreachAgentService.markRejected(approval.getCompanyId(), approval.getOutreachProspectId());
        }
        return ResponseEntity.ok(approvalService.toMap(approval));
    }
}
