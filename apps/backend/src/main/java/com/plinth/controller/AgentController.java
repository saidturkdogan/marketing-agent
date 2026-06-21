package com.plinth.controller;

import com.plinth.service.AgentConfigService;
import com.plinth.service.MarketingAgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private final AgentConfigService agentConfigService;
    private final MarketingAgentService marketingAgentService;

    public AgentController(AgentConfigService agentConfigService,
                           MarketingAgentService marketingAgentService) {
        this.agentConfigService = agentConfigService;
        this.marketingAgentService = marketingAgentService;
    }

    @GetMapping("/status/{companyId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String companyId) {
        return ResponseEntity.ok(agentConfigService.getStatus(companyId));
    }

    @GetMapping("/config/{companyId}")
    public ResponseEntity<Map<String, Object>> getConfig(@PathVariable String companyId) {
        return ResponseEntity.ok(agentConfigService.toMap(agentConfigService.getOrCreate(companyId)));
    }

    @PutMapping("/config/{companyId}")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @PathVariable String companyId,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(agentConfigService.toMap(agentConfigService.update(companyId, body)));
    }

    @PostMapping("/run/{companyId}")
    public ResponseEntity<Map<String, Object>> runNow(@PathVariable String companyId) {
        return ResponseEntity.ok(marketingAgentService.runWeeklyCycle(companyId));
    }
}
