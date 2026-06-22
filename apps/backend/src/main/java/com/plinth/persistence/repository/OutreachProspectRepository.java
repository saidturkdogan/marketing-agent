package com.plinth.persistence.repository;

import com.plinth.persistence.entity.OutreachProspectEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OutreachProspectRepository extends JpaRepository<OutreachProspectEntity, Long> {
    List<OutreachProspectEntity> findByCompanyIdOrderByCreatedAtDesc(String companyId);
    Optional<OutreachProspectEntity> findByCompanyIdAndProspectId(String companyId, String prospectId);
    boolean existsByCompanyIdAndEmailIgnoreCase(String companyId, String email);
}
