package com.plinth.controller;

import com.plinth.security.AuthUtils;
import com.plinth.service.OutreachAgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/outreach")
public class OutreachController {

    private final OutreachAgentService outreachAgentService;
    private final AuthUtils authUtils;

    public OutreachController(OutreachAgentService outreachAgentService, AuthUtils authUtils) {
        this.outreachAgentService = outreachAgentService;
        this.authUtils = authUtils;
    }

    @GetMapping("/prospects/{companyId}")
    public ResponseEntity<List<Map<String, Object>>> listProspects(@PathVariable String companyId) {
        authUtils.getCurrentUserId();
        return ResponseEntity.ok(outreachAgentService.listProspects(companyId));
    }
}
