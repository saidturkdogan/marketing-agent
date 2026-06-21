package com.plinth.persistence.repository;

import com.plinth.persistence.entity.AgentConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentConfigRepository extends JpaRepository<AgentConfigEntity, Long> {
    Optional<AgentConfigEntity> findByCompanyId(String companyId);
    List<AgentConfigEntity> findByAutopilotEnabledTrue();
}
