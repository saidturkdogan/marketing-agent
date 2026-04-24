package com.marketingagent.persistence.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.LinkedHashMap;
import java.util.Map;

@Converter
public class MapJsonConverter implements AttributeConverter<Map<String, Object>, String> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(Map<String, Object> attribute) {
        try {
            return objectMapper.writeValueAsString(attribute == null ? Map.of() : attribute);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot serialize map", ex);
        }
    }

    @Override
    public Map<String, Object> convertToEntityAttribute(String dbData) {
        try {
            if (dbData == null || dbData.isBlank()) {
                return new LinkedHashMap<>();
            }
            return objectMapper.readValue(dbData, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot deserialize map", ex);
        }
    }
}
