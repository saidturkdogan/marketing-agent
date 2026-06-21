package com.plinth.service;

import com.plinth.persistence.entity.AgentConfigEntity;
import com.plinth.persistence.entity.StrategyEntity;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AgentSchedulePlanner {

    private static final int[] DEFAULT_HOURS = {10, 14, 17};

    public record ScheduleSlot(OffsetDateTime scheduledAt, String topicHint) {}

    public List<ScheduleSlot> planWeeklySlots(AgentConfigEntity config, StrategyEntity strategy, int count) {
        if (count <= 0) return List.of();

        ZoneId zone = resolveZone(config.getTimezone());
        ZonedDateTime now = ZonedDateTime.now(zone);
        Set<String> usedKeys = new HashSet<>();

        List<ScheduleSlot> slots = new ArrayList<>();
        if (strategy != null) {
            slots.addAll(extractFromStrategyCalendar(strategy.getCalendar(), config, now, usedKeys));
        }

        if (slots.size() < count) {
            slots.addAll(computeSpreadSlots(config, count - slots.size(), now, usedKeys));
        }

        return slots.stream().limit(count).toList();
    }

    public ScheduleSlot nextAvailableSlot(AgentConfigEntity config, StrategyEntity strategy) {
        List<ScheduleSlot> slots = planWeeklySlots(config, strategy, 1);
        if (slots.isEmpty()) {
            ZoneId zone = resolveZone(config.getTimezone());
            ZonedDateTime fallback = nextBusinessSlot(ZonedDateTime.now(zone).plusHours(2), config, new HashSet<>());
            return new ScheduleSlot(fallback.toOffsetDateTime(), null);
        }
        return slots.getFirst();
    }

    @SuppressWarnings("unchecked")
    private List<ScheduleSlot> extractFromStrategyCalendar(Map<String, Object> calendar,
                                                           AgentConfigEntity config,
                                                           ZonedDateTime now,
                                                           Set<String> usedKeys) {
        if (calendar == null) return List.of();

        List<Map<String, Object>> days = new ArrayList<>();
        if (calendar.get("days") instanceof List<?> flatDays) {
            for (Object d : flatDays) {
                if (d instanceof Map<?, ?> m) days.add((Map<String, Object>) m);
            }
        } else if (calendar.get("weeks") instanceof List<?> weeks) {
            for (Object w : weeks) {
                if (!(w instanceof Map<?, ?> week)) continue;
                if (week.get("days") instanceof List<?> weekDays) {
                    for (Object d : weekDays) {
                        if (d instanceof Map<?, ?> m) days.add((Map<String, Object>) m);
                    }
                }
            }
        }

        List<ScheduleSlot> slots = new ArrayList<>();
        for (Map<String, Object> day : days) {
            if (!isTwitterPlatform(day.get("platform"))) continue;

            String topic = firstNonBlank(
                    day.get("content_title"),
                    day.get("topic"),
                    day.get("title"),
                    day.get("hook")
            );
            ZonedDateTime slot = parseDaySlot(day, config, now);
            if (slot == null) continue;

            String key = slot.toLocalDate() + "@" + slot.getHour();
            if (!usedKeys.add(key)) continue;
            if (slot.isBefore(now.plusMinutes(30))) continue;
            if (isQuietHours(slot, config)) {
                slot = adjustOutOfQuietHours(slot, config);
            }

            slots.add(new ScheduleSlot(slot.toOffsetDateTime(), topic));
        }
        return slots;
    }

    private List<ScheduleSlot> computeSpreadSlots(AgentConfigEntity config,
                                                  int count,
                                                  ZonedDateTime now,
                                                  Set<String> usedKeys) {
        List<ScheduleSlot> slots = new ArrayList<>();
        ZonedDateTime cursor = nextBusinessSlot(now.plusDays(1).withHour(DEFAULT_HOURS[0]).withMinute(0), config, usedKeys);

        int hourIndex = 0;
        while (slots.size() < count) {
            int hour = DEFAULT_HOURS[hourIndex % DEFAULT_HOURS.length];
            cursor = cursor.withHour(hour).withMinute(0).withSecond(0).withNano(0);
            if (cursor.getDayOfWeek() == DayOfWeek.SATURDAY || cursor.getDayOfWeek() == DayOfWeek.SUNDAY) {
                cursor = cursor.with(TemporalAdjusters.next(DayOfWeek.MONDAY)).withHour(hour);
            }
            if (cursor.isBefore(now.plusMinutes(30))) {
                cursor = cursor.plusDays(1);
                continue;
            }
            if (isQuietHours(cursor, config)) {
                cursor = adjustOutOfQuietHours(cursor, config);
            }

            String key = cursor.toLocalDate() + "@" + cursor.getHour();
            if (!usedKeys.add(key)) {
                hourIndex++;
                cursor = cursor.plusDays(hourIndex % DEFAULT_HOURS.length == 0 ? 1 : 0);
                continue;
            }

            slots.add(new ScheduleSlot(cursor.toOffsetDateTime(), null));
            hourIndex++;
            if (hourIndex % DEFAULT_HOURS.length == 0) {
                cursor = cursor.plusDays(1);
            }
        }
        return slots;
    }

    private ZonedDateTime nextBusinessSlot(ZonedDateTime candidate, AgentConfigEntity config, Set<String> usedKeys) {
        ZonedDateTime slot = candidate;
        for (int i = 0; i < 21; i++) {
            if (slot.getDayOfWeek() != DayOfWeek.SATURDAY && slot.getDayOfWeek() != DayOfWeek.SUNDAY) {
                if (!isQuietHours(slot, config)) {
                    String key = slot.toLocalDate() + "@" + slot.getHour();
                    if (usedKeys.isEmpty() || usedKeys.add(key)) {
                        return slot;
                    }
                }
            }
            slot = slot.plusDays(1).withHour(DEFAULT_HOURS[0]).withMinute(0);
        }
        return candidate;
    }

    private ZonedDateTime parseDaySlot(Map<String, Object> day, AgentConfigEntity config, ZonedDateTime now) {
        ZoneId zone = resolveZone(config.getTimezone());
        Object dateObj = firstNonBlankObj(day.get("date_suggestion"), day.get("date"), day.get("scheduled_date"));
        Object timeObj = day.get("time");

        LocalTime time = parseTime(timeObj != null ? timeObj.toString() : null);
        if (time == null) time = LocalTime.of(10, 0);

        if (dateObj != null) {
            LocalDate date = parseDate(dateObj.toString());
            if (date != null) {
                ZonedDateTime slot = ZonedDateTime.of(date, time, zone);
                return bumpToFuture(slot, now);
            }
        }

        Object dayNum = day.get("day");
        if (dayNum instanceof Number num) {
            int offset = Math.max(1, num.intValue());
            LocalDate date = now.toLocalDate().plusDays(offset);
            return bumpToFuture(ZonedDateTime.of(date, time, zone), now);
        }

        return null;
    }

    private ZonedDateTime bumpToFuture(ZonedDateTime slot, ZonedDateTime now) {
        ZonedDateTime min = now.plusMinutes(30);
        while (slot.isBefore(min)) {
            slot = slot.plusDays(1);
        }
        return slot;
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim();
        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH)
        );
        for (DateTimeFormatter f : formatters) {
            try {
                return LocalDate.parse(value, f);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim().toLowerCase(Locale.ROOT);
        try {
            if (value.matches("\\d{1,2}:\\d{2}")) {
                return LocalTime.parse(value, DateTimeFormatter.ofPattern("H:mm"));
            }
            if (value.contains("morning")) return LocalTime.of(10, 0);
            if (value.contains("afternoon")) return LocalTime.of(14, 0);
            if (value.contains("evening")) return LocalTime.of(17, 0);
        } catch (DateTimeParseException ignored) {
        }
        return null;
    }

    private boolean isTwitterPlatform(Object platform) {
        if (platform == null) return true;
        String p = platform.toString().toLowerCase(Locale.ROOT);
        return p.contains("twitter") || p.contains("x") || p.contains("tweet") || p.isBlank();
    }

    private boolean isQuietHours(ZonedDateTime time, AgentConfigEntity config) {
        try {
            LocalTime now = time.toLocalTime();
            LocalTime start = LocalTime.parse(config.getQuietHoursStart() != null ? config.getQuietHoursStart() : "22:00");
            LocalTime end = LocalTime.parse(config.getQuietHoursEnd() != null ? config.getQuietHoursEnd() : "08:00");
            if (start.isBefore(end)) {
                return !now.isBefore(start) && now.isBefore(end);
            }
            return !now.isBefore(start) || now.isBefore(end);
        } catch (Exception ex) {
            return false;
        }
    }

    private ZonedDateTime adjustOutOfQuietHours(ZonedDateTime time, AgentConfigEntity config) {
        try {
            LocalTime end = LocalTime.parse(config.getQuietHoursEnd() != null ? config.getQuietHoursEnd() : "08:00");
            ZonedDateTime adjusted = time.withHour(end.getHour()).withMinute(end.getMinute());
            if (!adjusted.isAfter(time)) {
                adjusted = adjusted.plusDays(1);
            }
            return adjusted;
        } catch (Exception ex) {
            return time.withHour(10).withMinute(0);
        }
    }

    private ZoneId resolveZone(String timezone) {
        try {
            return ZoneId.of(timezone != null && !timezone.isBlank() ? timezone : "Europe/Istanbul");
        } catch (Exception ex) {
            return ZoneId.of("Europe/Istanbul");
        }
    }

    private String firstNonBlank(Object... values) {
        for (Object v : values) {
            if (v != null && !v.toString().isBlank()) return v.toString();
        }
        return null;
    }

    private Object firstNonBlankObj(Object... values) {
        for (Object v : values) {
            if (v != null && !v.toString().isBlank()) return v;
        }
        return null;
    }
}
