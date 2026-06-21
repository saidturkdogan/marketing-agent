package com.plinth.service;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;
import org.springframework.stereotype.Service;

import com.google.api.services.calendar.model.EventDateTime;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GoogleCalendarEventService {

    private final GoogleCalendarAuthService authService;

    public GoogleCalendarEventService(GoogleCalendarAuthService authService) {
        this.authService = authService;
    }

    /**
     * Creates a Google Calendar event for a scheduled content post.
     * Returns the event ID on success.
     */
    public String createContentEvent(String companyId, String title, String description,
                                     OffsetDateTime scheduledAt, String timezone) {
        var token = authService.getToken(companyId);
        var credential = authService.loadCredential(token);

        Calendar service = new Calendar.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("Plinth")
                .build();

        String tz = timezone != null && !timezone.isBlank() ? timezone : "Europe/Istanbul";

        try {
            Event event = new Event()
                    .setSummary(title != null && !title.isBlank() ? title : "Plinth scheduled post")
                    .setDescription(description);

            EventDateTime start = new EventDateTime()
                    .setDateTime(new DateTime(scheduledAt.toInstant().toEpochMilli()))
                    .setTimeZone(tz);
            event.setStart(start);

            EventDateTime end = new EventDateTime()
                    .setDateTime(new DateTime(scheduledAt.plusMinutes(30).toInstant().toEpochMilli()))
                    .setTimeZone(tz);
            event.setEnd(end);

            Event created = service.events().insert("primary", event).execute();
            return created.getId();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create calendar event: " + e.getMessage(), e);
        }
    }

    /** @deprecated use overload with timezone */
    public String createContentEvent(String companyId, String title, String description, OffsetDateTime scheduledAt) {
        return createContentEvent(companyId, title, description, scheduledAt, "Europe/Istanbul");
    }

    public Map<String, Object> getUpcomingEvents(String companyId, int days) {
        var token = authService.getToken(companyId);
        var credential = authService.loadCredential(token);

        Calendar service = new Calendar.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                credential)
                .setApplicationName("Plinth")
                .build();

        DateTime timeMin = new DateTime(System.currentTimeMillis());
        DateTime timeMax = new DateTime(System.currentTimeMillis() + (long) days * 24 * 60 * 60 * 1000);

        try {
            Events events = service.events().list("primary")
                    .setTimeMin(timeMin)
                    .setTimeMax(timeMax)
                    .setOrderBy("startTime")
                    .setSingleEvents(true)
                    .setMaxResults(50)
                    .execute();

            List<Map<String, Object>> items = new ArrayList<>();
            if (events.getItems() != null) {
                for (Event event : events.getItems()) {
                    items.add(toEventMap(event));
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("connected", true);
            result.put("companyId", companyId);
            result.put("email", token.getEmail());
            result.put("events", items);
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch calendar events: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> toEventMap(Event event) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", event.getId());
        map.put("title", event.getSummary() != null ? event.getSummary() : "(No title)");
        map.put("location", event.getLocation() != null ? event.getLocation() : "");
        map.put("htmlLink", event.getHtmlLink() != null ? event.getHtmlLink() : "");

        boolean allDay = event.getStart() != null && event.getStart().getDate() != null;
        map.put("allDay", allDay);

        if (allDay && event.getStart() != null) {
            map.put("start", event.getStart().getDate().toString());
            map.put("end", event.getEnd() != null && event.getEnd().getDate() != null
                    ? event.getEnd().getDate().toString() : "");
        } else if (event.getStart() != null && event.getStart().getDateTime() != null) {
            map.put("start", toIso(event.getStart().getDateTime()));
            map.put("end", event.getEnd() != null && event.getEnd().getDateTime() != null
                    ? toIso(event.getEnd().getDateTime()) : "");
        } else {
            map.put("start", "");
            map.put("end", "");
        }

        return map;
    }

    private String toIso(DateTime dateTime) {
        return OffsetDateTime.ofInstant(
                Instant.ofEpochMilli(dateTime.getValue()),
                ZoneOffset.UTC).toString();
    }
}
