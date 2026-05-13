package com.marketingagent.persistence.entity;

import com.marketingagent.persistence.converter.MapJsonConverter;
import com.marketingagent.persistence.converter.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "companies")
public class CompanyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, unique = true)
    private String companyId;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(name = "website_url", length = 2000)
    private String websiteUrl;

    @Column(name = "logo_url", length = 2000)
    private String logoUrl;

    @Column(length = 500)
    private String industry;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "target_audience", columnDefinition = "text")
    private String targetAudience;

    @Column(name = "brand_voice", columnDefinition = "text")
    private String brandVoice;

    @Column(name = "value_proposition", columnDefinition = "text")
    private String valueProposition;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "products_or_services", columnDefinition = "text")
    private List<String> productsOrServices;

    @Convert(converter = StringListJsonConverter.class)
    @Column(columnDefinition = "text")
    private List<String> competitors;

    @Convert(converter = MapJsonConverter.class)
    @Column(name = "social_links", columnDefinition = "text")
    private Map<String, Object> socialLinks;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getTargetAudience() { return targetAudience; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }
    public String getBrandVoice() { return brandVoice; }
    public void setBrandVoice(String brandVoice) { this.brandVoice = brandVoice; }
    public String getValueProposition() { return valueProposition; }
    public void setValueProposition(String valueProposition) { this.valueProposition = valueProposition; }
    public List<String> getProductsOrServices() { return productsOrServices; }
    public void setProductsOrServices(List<String> productsOrServices) { this.productsOrServices = productsOrServices; }
    public List<String> getCompetitors() { return competitors; }
    public void setCompetitors(List<String> competitors) { this.competitors = competitors; }
    public Map<String, Object> getSocialLinks() { return socialLinks; }
    public void setSocialLinks(Map<String, Object> socialLinks) { this.socialLinks = socialLinks; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
