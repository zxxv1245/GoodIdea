package com.ssafy.project_service.planner.entity;


import com.ssafy.project_service.idea.entity.Idea;
import jakarta.persistence.*;
import lombok.*;

@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter

public class Planner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "planner_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.REMOVE)
    @JoinColumn(name = "idea_id", nullable = false)
    private Idea idea;

    @Lob
    @Column(nullable = true)
    private String content;

    @Builder
    public Planner(Idea idea, String content) {
        this.idea = idea;
        this.content = content;
    }

}
