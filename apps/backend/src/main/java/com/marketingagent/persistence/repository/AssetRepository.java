package com.marketingagent.persistence.repository;

import com.marketingagent.persistence.entity.AssetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetRepository extends JpaRepository<AssetEntity, Long> {
    void deleteByCampaignId(String campaignId);
    List<AssetEntity> findByCampaignId(String campaignId);
}
