package com.plinth.controller;

import com.plinth.dto.request.CampaignRequest;
import com.plinth.dto.request.InstagramPublishRequest;
import com.plinth.dto.response.CampaignResponse;
import com.plinth.publisher.PublishResult;
import com.plinth.service.CampaignService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/campaigns")
public class CampaignController {

    private final CampaignService campaignService;

    public CampaignController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @GetMapping
    public List<CampaignResponse> listCampaigns() {
        return campaignService.listCampaigns();
    }

    @PostMapping
    public CampaignResponse createCampaign(@Valid @RequestBody CampaignRequest request) {
        return campaignService.runCampaign(request);
    }

    @GetMapping("/{campaignId}")
    public CampaignResponse getCampaign(@PathVariable String campaignId) {
        return campaignService.getCampaign(campaignId);
    }

    @PostMapping("/{campaignId}/publish/linkedin")
    public PublishResult publishLinkedIn(@PathVariable String campaignId) {
        return campaignService.publishLinkedIn(campaignId);
    }

    @PostMapping("/{campaignId}/publish/meta/instagram")
    public PublishResult publishInstagram(@PathVariable String campaignId,
                                          @RequestBody(required = false) InstagramPublishRequest request) {
        return campaignService.publishInstagram(campaignId, request);
    }

    @PostMapping("/{campaignId}/publish/twitter")
    public PublishResult publishTwitter(@PathVariable String campaignId) {
        return campaignService.publishTwitter(campaignId);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleNotFound(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> handleConflict(IllegalStateException ex) {
        return Map.of("error", ex.getMessage());
    }
}
