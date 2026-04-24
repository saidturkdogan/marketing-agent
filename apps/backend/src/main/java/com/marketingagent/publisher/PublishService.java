package com.marketingagent.publisher;

import org.springframework.stereotype.Service;

@Service
public class PublishService {

    private final LinkedInPublisherService linkedInPublisherService;

    public PublishService(LinkedInPublisherService linkedInPublisherService) {
        this.linkedInPublisherService = linkedInPublisherService;
    }

    public PublishResult publishLinkedIn(String content) {
        return linkedInPublisherService.publishText(content);
    }
}
