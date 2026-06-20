package com.plinth.persistence.repository;

import com.plinth.persistence.entity.CustomerInteractionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerInteractionRepository extends JpaRepository<CustomerInteractionEntity, Long> {
    List<CustomerInteractionEntity> findByCompanyId(String companyId);
}
