package com.plinth.persistence.repository;

import com.plinth.persistence.entity.CustomerProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfileEntity, Long> {
    List<CustomerProfileEntity> findByCompanyId(String companyId);
}
