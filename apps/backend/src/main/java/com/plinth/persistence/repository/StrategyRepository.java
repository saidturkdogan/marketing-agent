package com.plinth.persistence.repository;

import com.plinth.persistence.entity.StrategyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StrategyRepository extends JpaRepository<StrategyEntity, Long> {
    Optional<StrategyEntity> findByStrategyId(String strategyId);
    List<StrategyEntity> findByCompanyIdOrderByCreatedAtDesc(String companyId);
    Optional<StrategyEntity> findTopByCompanyIdOrderByCreatedAtDesc(String companyId);
}
