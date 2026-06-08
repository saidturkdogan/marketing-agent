package com.plinth.publisher;

import org.springframework.stereotype.Service;

@Service
public class PublishService {

    private final LinkedInPublisherService linkedInPublisherService;
    private final InstagramGraphPublisherService instagramGraphPublisherService;

    public PublishService(LinkedInPublisherService linkedInPublisherService,
                          InstagramGraphPublisherService instagramGraphPublisherService) {
        this.linkedInPublisherService = linkedInPublisherService;
        this.instagramGraphPublisherService = instagramGraphPublisherService;
    }

    public PublishResult publishLinkedIn(String content) {
        return linkedInPublisherService.publishText(content);
    }

    public PublishResult publishInstagramImage(String imageUrl, String caption) {
        return instagramGraphPublisherService.publishImage(imageUrl, caption);
    }
}
