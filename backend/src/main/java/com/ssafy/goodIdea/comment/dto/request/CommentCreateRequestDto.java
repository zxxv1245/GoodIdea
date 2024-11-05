package com.ssafy.goodIdea.comment.dto.request;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CommentCreateRequestDto {
    private String commentContent;
    private Double rating;
}