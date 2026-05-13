package com.marketingagent.service;

import com.marketingagent.domain.CompanyProfile;
import com.marketingagent.dto.request.CompanyRequest;
import com.marketingagent.dto.response.CompanyResponse;
import com.marketingagent.persistence.entity.CompanyEntity;
import com.marketingagent.persistence.repository.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CompanyService {

    private final CompanyRepository companyRepository;

    public CompanyService(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    public List<CompanyResponse> listCompanies() {
        return companyRepository.findAll().stream()
                .sorted(Comparator.comparing(CompanyEntity::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    public CompanyResponse getCompany(String companyId) {
        return toResponse(findByCompanyId(companyId));
    }

    public CompanyProfile getProfile(String companyId) {
        return toProfile(findByCompanyId(companyId));
    }

    @Transactional
    public CompanyResponse createCompany(CompanyRequest request) {
        CompanyEntity company = new CompanyEntity();
        company.setCompanyId(UUID.randomUUID().toString());
        applyRequest(company, request);
        return toResponse(companyRepository.save(company));
    }

    @Transactional
    public CompanyResponse updateCompany(String companyId, CompanyRequest request) {
        CompanyEntity company = findByCompanyId(companyId);
        applyRequest(company, request);
        return toResponse(companyRepository.save(company));
    }

    private CompanyEntity findByCompanyId(String companyId) {
        return companyRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found: " + companyId));
    }

    private void applyRequest(CompanyEntity company, CompanyRequest request) {
        company.setName(request.name());
        company.setWebsiteUrl(request.websiteUrl());
        company.setLogoUrl(request.logoUrl());
        company.setIndustry(request.industry());
        company.setDescription(request.description());
        company.setTargetAudience(request.targetAudience());
        company.setBrandVoice(request.brandVoice());
        company.setValueProposition(request.valueProposition());
        company.setProductsOrServices(request.productsOrServices() == null ? List.of() : request.productsOrServices());
        company.setCompetitors(request.competitors() == null ? List.of() : request.competitors());
        company.setSocialLinks(request.socialLinks() == null ? Map.of() : request.socialLinks());
    }

    public CompanyProfile toProfile(CompanyEntity company) {
        return new CompanyProfile(
                company.getCompanyId(),
                company.getName(),
                company.getWebsiteUrl(),
                company.getLogoUrl(),
                company.getIndustry(),
                company.getDescription(),
                company.getTargetAudience(),
                company.getBrandVoice(),
                company.getValueProposition(),
                company.getProductsOrServices(),
                company.getCompetitors(),
                company.getSocialLinks()
        );
    }

    private CompanyResponse toResponse(CompanyEntity company) {
        return new CompanyResponse(
                company.getCompanyId(),
                company.getName(),
                company.getWebsiteUrl(),
                company.getLogoUrl(),
                company.getIndustry(),
                company.getDescription(),
                company.getTargetAudience(),
                company.getBrandVoice(),
                company.getValueProposition(),
                company.getProductsOrServices(),
                company.getCompetitors(),
                company.getSocialLinks(),
                company.getCreatedAt(),
                company.getUpdatedAt()
        );
    }
}
