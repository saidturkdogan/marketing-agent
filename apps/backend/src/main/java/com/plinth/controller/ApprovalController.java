package com.plinth.controller;

import com.plinth.security.AuthUtils;
import com.plinth.service.ApprovalService;
import com.plinth.service.ContentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;
    private final ContentService contentService;
    private final AuthUtils authUtils;

    public ApprovalController(ApprovalService approvalService,
                              ContentService contentService,
                              AuthUtils authUtils) {
        this.approvalService = approvalService;
        this.contentService = contentService;
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
        if (approval.getContentId() != null) {
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
        return ResponseEntity.ok(approvalService.toMap(approval));
    }
}
