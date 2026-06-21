package com.plinth.publisher;

import org.springframework.stereotype.Service;

@Service
public class PublishService {

    private final LinkedInPublisherService linkedInPublisherService;
    private final InstagramGraphPublisherService instagramGraphPublisherService;
    private final TwitterPublisherService twitterPublisherService;

    public PublishService(LinkedInPublisherService linkedInPublisherService,
                          InstagramGraphPublisherService instagramGraphPublisherService,
                          TwitterPublisherService twitterPublisherService) {
        this.linkedInPublisherService = linkedInPublisherService;
        this.instagramGraphPublisherService = instagramGraphPublisherService;
        this.twitterPublisherService = twitterPublisherService;
    }

    public PublishResult publishLinkedIn(String content) {
        return linkedInPublisherService.publishText(content);
    }

    public PublishResult publishInstagramImage(String imageUrl, String caption) {
        return instagramGraphPublisherService.publishImage(imageUrl, caption);
    }

    public PublishResult publishTwitter(String content) {
        throw new UnsupportedOperationException("Use publishTwitter(content, companyId) instead");
    }

    public PublishResult publishTwitter(String content, String companyId) {
        return twitterPublisherService.publishTweet(content, companyId);
    }
}
