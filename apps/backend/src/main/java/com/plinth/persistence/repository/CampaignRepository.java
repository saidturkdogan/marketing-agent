package com.plinth.persistence.repository;

import com.plinth.persistence.entity.CampaignEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CampaignRepository extends JpaRepository<CampaignEntity, Long> {
    Optional<CampaignEntity> findByCampaignId(String campaignId);
    List<CampaignEntity> findAllByOrderByCreatedAtDesc();
}
