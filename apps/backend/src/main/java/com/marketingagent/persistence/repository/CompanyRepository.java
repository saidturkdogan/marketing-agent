package com.marketingagent.persistence.repository;

import com.marketingagent.persistence.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<CompanyEntity, Long> {
    Optional<CompanyEntity> findByCompanyId(String companyId);
    List<CompanyEntity> findByUserId(Long userId);
    Optional<CompanyEntity> findByCompanyIdAndUserId(String companyId, Long userId);
}
