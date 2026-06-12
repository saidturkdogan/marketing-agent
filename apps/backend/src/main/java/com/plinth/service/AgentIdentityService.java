package com.plinth.service;

import com.plinth.domain.CompanyProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@Service
public class AgentIdentityService {

    private static final Logger log = LoggerFactory.getLogger(AgentIdentityService.class);

    public String buildIdentityContext(CompanyProfile profile) {
        StringBuilder sb = new StringBuilder();
        sb.append("<brand_identity>\n");

        sb.append("  <product>\n");
        sb.append("    <name>").append(safe(profile.productName() != null ? profile.productName() : profile.name())).append("</name>\n");
        if (profile.coreValueProp() != null && !profile.coreValueProp().isBlank()) {
            sb.append("    <core_value_prop>").append(profile.coreValueProp()).append("</core_value_prop>\n");
        }
        if (profile.valueProposition() != null && !profile.valueProposition().isBlank()) {
            sb.append("    <value_proposition>").append(profile.valueProposition()).append("</value_proposition>\n");
        }
        sb.append("  </product>\n");

        if (profile.brandVoiceScale() != null && !profile.brandVoiceScale().isEmpty()) {
            sb.append("  <voice_scale>\n");
            profile.brandVoiceScale().forEach((k, v) ->
                    sb.append("    <dimension name=\"").append(k).append("\" value=\"").append(v).append("\"/>\n"));
            sb.append("  </voice_scale>\n");
        }

        if (profile.bannedWords() != null && !profile.bannedWords().isEmpty()) {
            sb.append("  <banned_words priority=\"ABSOLUTE\">\n");
            for (String word : profile.bannedWords()) {
                sb.append("    <word>").append(word).append("</word>\n");
            }
            sb.append("  </banned_words>\n");
        }

        if (profile.competitorsDetail() != null && !profile.competitorsDetail().isEmpty()) {
            sb.append("  <competitor_intelligence>\n");
            for (Map<String, Object> comp : profile.competitorsDetail()) {
                String name = String.valueOf(comp.getOrDefault("name", "?"));
                String weakness = String.valueOf(comp.getOrDefault("weakness", "?"));
                String advantage = String.valueOf(comp.getOrDefault("our_advantage", "?"));
                sb.append("    <competitor>\n");
                sb.append("      <name>").append(name).append("</name>\n");
                sb.append("      <weakness>").append(weakness).append("</weakness>\n");
                sb.append("      <our_advantage>").append(advantage).append("</our_advantage>\n");
                sb.append("    </competitor>\n");
            }
            sb.append("  </competitor_intelligence>\n");
        }

        if (profile.productsOrServices() != null && !profile.productsOrServices().isEmpty()) {
            sb.append("  <products_services>").append(String.join(", ", profile.productsOrServices())).append("</products_services>\n");
        }

        sb.append("</brand_identity>");
        log.debug("Built identity context for company {}", profile.name());
        return sb.toString();
    }

    public String buildCompactIdentityInline(CompanyProfile profile) {
        StringJoiner sj = new StringJoiner(" | ");
        sj.add("Brand: " + safe(profile.productName() != null ? profile.productName() : profile.name()));

        if (profile.brandVoiceScale() != null && !profile.brandVoiceScale().isEmpty()) {
            StringJoiner voiceSj = new StringJoiner(", ");
            profile.brandVoiceScale().forEach((k, v) -> voiceSj.add(k + "=" + v + "/10"));
            sj.add("Voice Scale: " + voiceSj);
        }

        if (profile.bannedWords() != null && !profile.bannedWords().isEmpty()) {
            sj.add("NEVER use: " + String.join(", ", profile.bannedWords()));
        }

        if (profile.competitorsDetail() != null && !profile.competitorsDetail().isEmpty()) {
            StringJoiner compSj = new StringJoiner("; ");
            for (Map<String, Object> comp : profile.competitorsDetail()) {
                String name = String.valueOf(comp.getOrDefault("name", "?"));
                String weakness = String.valueOf(comp.getOrDefault("weakness", "?"));
                String advantage = String.valueOf(comp.getOrDefault("our_advantage", "?"));
                compSj.add(name + " (weak: " + weakness + ", we win: " + advantage + ")");
            }
            sj.add("Competitor Intel: " + compSj);
        }

        return sj.toString();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
