package com.plinth.persistence.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        try {
            return objectMapper.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot serialize string list", ex);
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        try {
            if (dbData == null || dbData.isBlank()) {
                return List.of();
            }
            return objectMapper.readValue(dbData, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot deserialize string list", ex);
        }
    }
}
