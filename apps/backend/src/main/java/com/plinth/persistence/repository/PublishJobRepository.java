package com.plinth.persistence.repository;

import com.plinth.persistence.entity.PublishJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface PublishJobRepository extends JpaRepository<PublishJobEntity, Long> {
    List<PublishJobEntity> findByStatusOrderByCreatedAtAsc(String status);
    List<PublishJobEntity> findByCampaignId(String campaignId);
    long countByPlatformAndStatusAndCreatedAtAfter(String platform, String status, OffsetDateTime after);
}
