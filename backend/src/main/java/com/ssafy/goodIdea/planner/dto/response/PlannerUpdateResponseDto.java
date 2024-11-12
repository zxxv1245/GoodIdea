package com.ssafy.goodIdea.planner.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ssafy.goodIdea.planner.entity.Planner;

@Getter
@Setter
@Builder
public class PlannerUpdateResponseDto {
    private Long ideaId;
    private String content;
    private String clientId;
    private Long timestamp;
    
    @JsonProperty("documentType")
    private final String documentType = "planner";  // 상수로 지정

    @Builder.Default
    private String status = "success";

    public static PlannerUpdateResponseDto from(Planner planner, String clientId, Long timestamp) {
        return PlannerUpdateResponseDto.builder()
                .ideaId(planner.getId())
                .content(planner.getContent())
                .clientId(clientId)
                .timestamp(timestamp)
                .build();
    }
} 