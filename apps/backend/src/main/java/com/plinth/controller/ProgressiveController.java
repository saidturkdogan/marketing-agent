package com.plinth.controller;

import com.plinth.dto.request.ProgressiveRequest;
import com.plinth.dto.response.ProgressiveResponse;
import com.plinth.publisher.PublishResult;
import com.plinth.service.ProgressiveStrategyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pipeline")
public class ProgressiveController {

    private final ProgressiveStrategyService progressiveService;

    public ProgressiveController(ProgressiveStrategyService progressiveService) {
        this.progressiveService = progressiveService;
    }

    @PostMapping("/research")
    public ProgressiveResponse runResearch(@Valid @RequestBody ProgressiveRequest req) {
        if (req.companyId() == null || req.companyId().isBlank()) {
            throw new IllegalArgumentException("companyId is required");
        }
        return progressiveService.runResearch(
                req.companyId(),
                req.websiteUrl(),
                req.goal(),
                req.companyName() != null ? req.companyName() : "",
                req.industry() != null ? req.industry() : "",
                req.productDescription() != null ? req.productDescription() : "",
                req.targetAudience() != null ? req.targetAudience() : ""
        );
    }

    @PostMapping("/strategy/{strategyId}")
    public ProgressiveResponse runStrategy(@PathVariable String strategyId) {
        return progressiveService.runStrategy(strategyId);
    }

    @PostMapping("/plan/{strategyId}")
    public ProgressiveResponse runPlan(@PathVariable String strategyId) {
        return progressiveService.runPlan(strategyId);
    }

    @PostMapping("/assets/{strategyId}")
    public ProgressiveResponse runAssets(@PathVariable String strategyId) {
        return progressiveService.runAssets(strategyId);
    }

    @PostMapping("/asset-status/{strategyId}")
    public ProgressiveResponse updateAssetStatus(
            @PathVariable String strategyId,
            @RequestBody Map<String, Object> body) {
        String type = (String) body.get("type");
        Object index = body.get("index");
        String status = (String) body.get("status");
        return progressiveService.updateAssetStatus(strategyId, type, index, status);
    }

    @PostMapping("/publish/linkedin/{strategyId}")
    public PublishResult publishLinkedInPost(
            @PathVariable String strategyId,
            @RequestBody Map<String, Object> body) {
        Object index = body.get("index");
        return progressiveService.publishLinkedInPost(strategyId, index);
    }

    @PostMapping("/publish/schedule/{strategyId}")
    public PublishResult publishScheduleItem(
            @PathVariable String strategyId,
            @RequestBody Map<String, Object> body) {
        Object index = body.get("scheduleIndex");
        return progressiveService.publishScheduleItem(strategyId, index);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleBadRequest(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }
}
