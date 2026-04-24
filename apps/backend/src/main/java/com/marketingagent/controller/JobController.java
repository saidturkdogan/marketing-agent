package com.marketingagent.controller;

import com.marketingagent.dto.response.JobResponse;
import com.marketingagent.service.CampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final CampaignService campaignService;

    public JobController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @GetMapping("/{jobId}")
    public JobResponse getJob(@PathVariable String jobId) {
        return campaignService.getJob(jobId);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleNotFound(IllegalArgumentException ex) {
        return Map.of("error", ex.getMessage());
    }
}
